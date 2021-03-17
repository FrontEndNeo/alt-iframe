/**
 * alt-iframe
 * - A simple native JavaScript (ES5) utility library to include partial HTML(s).
 * - You don't need a framework or jQuery!!!
 *
 * version: 1.3.0
 *
 * License: MIT
 *
 * USAGE:
 * see example at https://github.com/FrontEndNeo/alt-iframe
*/
(function(_g){

  var _doc = document, _loc = _doc.location, _htmlDir, _htmlExt, _urlHash, _prvHash, _curHash, _pending;

  window.onhashchange = function() {
    _curHash = _loc.hash || '';
    if (!_curHash) {
      _loc.reload();
    } else if (_curHash != _prvHash) {
      _urlHash = _curHash;
      loadUrlHash();
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
    script.text = xScript.innerHTML;
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
    if (hashErrMode == 'alert') {
      eMsg = 'Page route[' + (_urlHash.substring(1)) + '] not found! Redirecting to this page root.';
      alert(eMsg);
    } else if (hashErrMode == 'url') {
      eMsg = 'Page_route[' + (_urlHash.substring(1)) + ']_not_found!_Redirected_to_this_page_root.';
      redirectUrl = _loc.origin + _loc.pathname + '?_error=' + eMsg + (_loc.search.replace(/^\?/,'&'));
    }
    _loc.href = redirectUrl;
  }

  function loadUrlHash () {
    if (_urlHash) {
      var elHash = getElements('[x-href="'+_urlHash+'"][x-target^="#"]');
      if (elHash.length) {
        _urlHash = '';
        _prvHash = _curHash;
        elHash[0].click();
      } else {
        (!(_pending || getAltIframeElements().length)) && handleHashNotFound();
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
      content = (content || '').replace(/<(\/)*script/gi, '<$1x-script');
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
    var appendScript = /\+$/.test(finalPath)? '+':'';
    if (appendScript) finalPath = finalPath.substring(0, finalPath.length-1);
    _htmlDir && (finalPath = /^[^a-z0-9_]/gi.test(finalPath[0])? finalPath.substring(1) : (_htmlDir+'/'+finalPath))
    _htmlExt && (finalPath = (finalPath[finalPath.length-1] == '/')? finalPath.substring(0, finalPath.length-1) : (finalPath+_htmlExt));
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

  function updateHistory ( newHash ) {
    if (_prvHash != newHash) {
      _prvHash = newHash;
      try {
        history.pushState(null, newHash, newHash);
      } catch (e) {}
    }
  }

  function onNavElClick () {
    var clickedEl = this;
    var targetEl = _doc.querySelector( clickedEl.getAttribute('x-target') );

    if (targetEl) {
      targetEl[clickedEl.hasAttribute('replace')? 'setAttribute': 'removeAttribute']('replace', '');

      if (clickedEl.hasAttribute('await')) {
        targetEl.setAttribute('await', '');
      }
      if (clickedEl.hasAttribute('async')) {
        targetEl.removeAttribute('await', '');
      }

      var xHref = clickedEl.getAttribute('x-href').substring(1);
      if (/^[#! ]/.test(xHref)) {
        xHref = xHref.substring(1).trim();
      } else {
        updateHistory( '#'+xHref );
      }
      loadExternalSrc(targetEl, xHref);
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
    getAltIframeElements(context).forEach(function(el){
        el.setAttribute('processed', '');
        loadExternalSrc(el);
      });

    getElements('[href^="#"][target^="#"]', context).forEach(function(el){
      renameAttr(el, 'target', 'x-target');
      renameAttr(el, 'href', 'x-href');
      el.setAttribute('href', 'javascript:;');
      el.addEventListener('click', onNavElClick);
    });
  }

  function onDocReady () {
    _pending = 0;
    _urlHash = _loc.hash || '';
    _htmlDir = (_doc.body.getAttribute('components-loc') || '').replace(/\/+$/g,'').trim();
    _htmlExt = (_doc.body.getAttribute('components-ext') || '').trim();
    processIncludes();
  }

  if ( (_doc.readyState == 'complete') || (!(_doc.readyState == 'loading' || _doc.documentElement.doScroll)) ) {
    onDocReady();
  } else {
    _doc.addEventListener('DOMContentLoaded', onDocReady);
  }

})(this);