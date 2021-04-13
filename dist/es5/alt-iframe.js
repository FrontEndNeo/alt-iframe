/**
 * alt-iframe
 * - A simple native JavaScript (ES5) utility library to include partial HTML(s).
 * - You don't need a framework or jQuery!!!
 *
 * version: 1.6.0-ES5
 *
 * License: MIT
 *
 * USAGE:
 * see example at https://github.com/FrontEndNeo/alt-iframe
*/
(function(_g){

  var _doc = document, _loc = _doc.location, _htmlDir, _htmlExt, _pending;
  var _urlHash, _prvHash, _curHash, _hashLst, hashPathDelimiter = '/', hashNavPath = '';
  var _urlHashOn = ((_doc.body.getAttribute('url-hash') || '').toLowerCase() != 'off');
  var delayHashCheck;
  var _onReadyQ = [], nxtFn, fnRes;

  if (_urlHashOn) {
    window.onhashchange = function() {
      _curHash = _loc.hash || '';
      if (!_curHash) {
        (_loc.href.indexOf('#') < 0) && _loc.reload();
        _prvHash = '#';
      } else if (_curHash != _prvHash) {
        _urlHash = _curHash;
        loadUrlHash();
      }
    }
  }

  function getElements (selector, el) {
    el = ((typeof el == 'string') && _doc.querySelector(el)) || el || _doc;
    return Array.prototype.slice.call(el.querySelectorAll(selector));
  }

  function renameAttr (el, oAttr, nAttr) {
    el.setAttribute(nAttr, el.getAttribute(oAttr));
    el.removeAttribute(oAttr);
  }

  function cloneScriptNodeFrom (xScript) {
    var script  = _doc.createElement('script');
    script.text = xScript.innerHTML.replace(/&gt;/gi,'>').replace(/&lt;/gi,'<').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&apos;/gi,"'");
    for( var i = xScript.attributes.length-1; i >= 0; i-- ) {
      script.setAttribute( xScript.attributes[i].name, xScript.attributes[i].value );
    }
    return script;
  }

  function processScripts (context, awaitScripts) {
    getElements('x-script:not([processed])', context).forEach(function(xScript){
      xScript.setAttribute('processed','');
      if (awaitScripts) { xScript.setAttribute('await',''); }
      var nScript = cloneScriptNodeFrom(xScript);

      if (!nScript.hasAttribute('src')) {
        xScript.parentNode.replaceChild( nScript, xScript );
      } else {
        var isAsync = !nScript.hasAttribute('await');
        if (!awaitScripts && isAsync) {
          xScript.parentNode.replaceChild( nScript, xScript );
        } else {
          renameAttr(xScript, 'src', 'x-src');
          loadExternalSrc(nScript);
        }
      }
    });
  }

  function handleHashNotFound () {
    var hashErrMode = (_doc.body.getAttribute('hash-error') || '').toLowerCase();
    var redirectUrl = _loc.origin + _loc.pathname + _loc.search;
    var eMsg;
    if (hashErrMode == 'url') {
      eMsg = 'Page_route[' + (_urlHash.substring(1)) + ']_not_found!_Redirected_to_this_page_root.';
      redirectUrl = _loc.origin + _loc.pathname + '?_error=' + eMsg + (_loc.search.replace(/^\?/,'&'));
    } else {
      eMsg = 'Page route[#' + (_urlHash.substring(1)) + '] not found! Redirecting to this page root.';
      alert(eMsg);
    }
    _loc.href = redirectUrl;
  }

  function loadUrlHash ( forHash, hashPath ) {
    if (!_urlHashOn) return;

    forHash = forHash || _urlHash;
    if (forHash) {
      var elHash = getElements('[url-hash="'+forHash+'"][x-target^="#"],[href="'+forHash+'"]');
      if (elHash.length) {
        if (hashPath) {
          elHash[0].setAttribute('skip-hash-update', '1');
        }
        if (!hashPath || (delayHashCheck && hashPath == _urlHash)) {
          _urlHash = '';
        }
        _prvHash = _curHash;
        onNavElClick.call(elHash[0], true, hashPath);
      } else if (!_pending) {
        if (_urlHash.indexOf(hashPathDelimiter) > 0) {
          var hashNavLength = ((hashNavPath && hashNavPath.split(hashPathDelimiter)) || []).length;
          var nxtHash = _hashLst[hashNavLength];
          if (nxtHash || (hashNavLength <= _hashLst.length)) {
            hashNavPath +=  (hashNavPath? hashPathDelimiter : '') + nxtHash;
            delayHashCheck = (getElements('[url-hash="'+hashNavPath+'"][x-target^="#"]').length)? 0 : 250;
            setTimeout(function () {
              loadUrlHash(hashNavPath, _urlHash);
            }, delayHashCheck);
          } else {
            handleHashNotFound();
          }
        } else if (!(getAltIframeElements().length)) {
          var localHashEl = _doc.querySelector(_urlHash);
          if (localHashEl) {
            localHashEl.scrollIntoView(true);
            _urlHash = '';
          } else {
            handleHashNotFound();
          }
        }
      }
    } else {
      var hashLockEls = getElements('[skip-on-hash]');
      if (hashLockEls.length) {
        hashLockEls.forEach(function(el){
          el.removeAttribute('skip-on-hash');
        });
        processIncludes();
      }
    }
  }

  function updateElContent (targetEl, content) {
    _pending--;
    var appendScript = targetEl.getAttribute('x-js');
    if (appendScript) {
      content += '<script src="'+appendScript+'"></script>';
      targetEl.removeAttribute('x-js');
    }
    if (targetEl.tagName == 'SCRIPT') {
      if (content.trim()) {
        var xScript = _doc.createElement( "script" );
        xScript.id = (new Date()).getMilliseconds();
        xScript.text = content;
        _doc.head.appendChild( xScript ).parentNode.removeChild( xScript );
      }
    } else {
      content = (content || '')
                .replace(/<(\/)*script/gi, '<$1x-script');
      if ((targetEl.tagName.indexOf('REPLACE')>=0) || targetEl.hasAttribute('replace')) {
        var targetParent = targetEl.parentNode;
        var awaitScripts = targetEl.hasAttribute('await');
        targetEl.outerHTML = content;
        processScripts( targetParent, awaitScripts );
        processIncludes( targetParent );
      } else {
        targetEl.innerHTML = content;
        processScripts( targetEl, targetEl.hasAttribute('await') );
        processIncludes( targetEl );
      }
    }
    loadUrlHash();
  }

  function onXhrStateChange () {
    if (this.readyState != 4) return;
    var xhrStatus = this.status;
    var resTxt = ((xhrStatus >= 200 && xhrStatus < 300) || (xhrStatus == 304))? this.responseText : ('Cannot GET '+this.responseURL);
    updateElContent(this.targetEl, resTxt);
  }

  function getSrcPath ( srcPath ) {
    var finalPath = (srcPath || '').trim();
    var appendScript='';
    if (!/^(\/\/|http:\/\/|https:\/\/)/i.test(finalPath)) {
      appendScript = /\+$/.test(finalPath)? '+':'';
      if (appendScript) finalPath = finalPath.substring(0, finalPath.length-1);
      _htmlDir && (finalPath = /^[^a-z0-9_]/gi.test(finalPath[0])? finalPath.substring(1) : (_htmlDir+'/'+finalPath))
      _htmlExt && (finalPath = (finalPath[finalPath.length-1] == '/')? finalPath.substring(0, finalPath.length-1) : (finalPath+_htmlExt));
    }
    return finalPath+appendScript;
  }

  function loadExternalSrc (targetEl, srcPath) {
    srcPath = getSrcPath(srcPath || (targetEl.getAttribute('src')) );
    targetEl.setAttribute('x-src', srcPath);
    targetEl.removeAttribute('src');
    if (srcPath) {
      _pending++;
      if (/\+$/.test(srcPath)) { //appendScript
        targetEl.setAttribute('x-js', srcPath.replace(/\.[a-z]{3,4}\+$/, '.js'));
        srcPath = srcPath.substring(0, srcPath.length-1);
      }

      var xhr      = new XMLHttpRequest();
      xhr.targetEl = targetEl;
      xhr.onreadystatechange = onXhrStateChange;
      xhr.open('GET', srcPath, !targetEl.hasAttribute('await'));
      xhr.send();
    }
  }

  function updateHistory ( clickedEl ) {
    if (!_urlHashOn) return;
    if (!clickedEl.getAttribute('skip-hash-update')) {
      var newHash = clickedEl.getAttribute('url-hash');
      if ((newHash != '#') && (_prvHash != newHash)) {
        _prvHash = newHash;
        try {
          history.pushState(null, newHash, newHash);
        } catch (e) {}
      }
    }
    clickedEl.removeAttribute('skip-hash-update');
  }

  function onNavElClick ( onHashNav, onHashPath ) {

    var clickedEl = this;

    if (onHashNav && onHashPath && clickedEl.tagName !== 'FORM') {
      clickedEl.click();
      return;
    }

    if (clickedEl.tagName == 'FORM' && (!clickedEl.checkValidity())) {
      clickedEl.reportValidity();
      return false;
    }

    var ifCheck = clickedEl.getAttribute('if');
    if (ifCheck) {
      var idxOfBrace = ifCheck.indexOf('(');
      var ifFnName = (idxOfBrace>0? ifCheck.substring(0, idxOfBrace) : ifCheck).replace(/\s/g,'');
      if (ifFnName) {
        var isOk;
        try {
          isOk = (window[ifFnName].call(clickedEl));
        } catch(e) {
          console.error('Function NOT Found:', ifFnName);
        }
        if (!isOk) return false;
      }
    }

    var targetEl = _doc.querySelector( clickedEl.getAttribute('x-target') );

    if (targetEl) {
      targetEl[clickedEl.hasAttribute('replace')? 'setAttribute': 'removeAttribute']('replace', '');

      if (clickedEl.hasAttribute('await')) {
        targetEl.setAttribute('await', '');
      }
      if (clickedEl.hasAttribute('async')) {
        targetEl.removeAttribute('await', '');
      }

      updateHistory( clickedEl );

      var xSrc = clickedEl.getAttribute('x-href').substring(1);
      (/^[! ]/.test(xSrc)) && (xSrc = xSrc.substring(1).trim());
      loadExternalSrc(targetEl, xSrc);
    } else {
      console.warn('Target element not found. Invalid target specified in element', clickedEl);
    }
  }

  function getAltIframeElements ( context ) {
    context = context || _doc;
    return getElements('[src]'+('audio embed iframe img input script source track video x-script [processed] [skip-on-hash]'.split(' ').map(function(tag){ return ':not('+tag+')'; }).join('')), context);
  }

  function processIncludes (context) {
    context = context || _doc;
    var childAltFrameElements = getAltIframeElements(context);
    childAltFrameElements.forEach(function(el){
        el.setAttribute('processed', '');
        loadExternalSrc(el);
      });

    getElements('form:not([onsubmit]):not([href])', context).forEach(function (formEl) {
      (!formEl.getAttribute('action') && formEl.setAttribute('onsubmit', 'return false;'));
    });

    getElements('[href^="#"][target^="#"]', context).forEach(function(el){
      renameAttr(el, 'target', 'x-target');
      renameAttr(el, 'href', 'x-href');
      el.setAttribute('href', 'javascript:;');

      var eHash = el.getAttribute('url-hash') || el.getAttribute('x-href');
      (!/^#/.test(eHash)) && (eHash = '#'+eHash);
      (/^#[! ]+/.test(eHash)) && (eHash = '#');
      eHash = eHash.replace(/[+ ]/g,'').replace(new RegExp('\\'+hashPathDelimiter+'+$'), '');
      el.setAttribute('url-hash', eHash);

      var isFormEl = (el.tagName == 'FORM');
      var defEvent = isFormEl? 'submit' : 'click';
      var onEvent = (el.getAttribute('on') || defEvent).replace(/[^a-z]/gi,'_');
      (isFormEl && !el.getAttribute('onsubmit') && el.setAttribute('onsubmit', 'return false;'));
      onEvent.split('_').forEach(function (eName) {
        eName = eName.trim().toLowerCase();
        if (eName.length>2) {
          eName = eName.replace(/^on/,'');
          el.addEventListener(eName, onNavElClick);
        }
      });
    });

    (!childAltFrameElements.length && processOnReady());
  }

  function _onDataXhrStateChange () {
    if (this.readyState != 4) return;
    var xhrStatus = this.status;
    var resTxt = ((xhrStatus >= 200 && xhrStatus < 300) || (xhrStatus == 304))? this.responseText : ('{"error":"Failed: [GET]'+this.responseURL+'", "status": '+xhrStatus+'}');
    this.callbackFn( JSON.parse(resTxt) );
  }
  function getData(dataUrl, callbackFn) {
    var xhr = new XMLHttpRequest();
    xhr.callbackFn = callbackFn;
    xhr.onreadystatechange = _onDataXhrStateChange;
    xhr.open('GET', dataUrl);
    xhr.send();
  }

  function load (xSrc, target, onLoad) {
    var elTarget = getElements(target)[0];
    if (elTarget) {
      (typeof onLoad === 'function' && _onReadyQ.push(onLoad));
      loadExternalSrc(elTarget, xSrc);
    } else {
      console.error('Target container not found.', target);
    }
  }

  function onReady ( fnX ) {
    if (typeof fnX === 'function') {
      _onReadyQ.push(fnX);
      processOnReady();
    }
  }

  function processOnReady () {
    if (!_pending && !getAltIframeElements().length && _onReadyQ.length && (typeof fnRes === 'undefined' || fnRes)) {
      nxtFn = _onReadyQ.shift();
      fnRes = nxtFn(fnRes);
      ((typeof fnRes !== 'undefined' && !fnRes && (_onReadyQ = [])));
      processOnReady();
    }
  }

  function onDocReady () {
    _pending = 0;
    _urlHash = _loc.hash || '';
    _hashLst = (_urlHashOn && _urlHash && _urlHash.split(hashPathDelimiter)) || [];
    _htmlDir = (_doc.body.getAttribute('components-loc') || '').replace(/\/+$/g,'').trim();
    _htmlExt = (_doc.body.getAttribute('components-ext') || '').trim();
    processIncludes();
    setTimeout(function () {
      (new MutationObserver(function(mutationsList) {
        (mutationsList && mutationsList[0] && mutationsList[0].type === 'childList'
          && mutationsList[0].target && processIncludes( mutationsList[0].target ));
      })).observe(_doc, { childList: true, subtree: true });
    });
  }

  if ( (_doc.readyState == 'complete') || (!(_doc.readyState == 'loading' || _doc.documentElement.doScroll)) ) {
    onDocReady();
  } else {
    _doc.addEventListener('DOMContentLoaded', onDocReady);
  }

  _g.alt = _g.aif = { load, onReady, getData };

})(this);