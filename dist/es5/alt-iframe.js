/**
 * alt-iframe
 * - A simple native JavaScript (ES5) utility library to include partial HTML(s).
 * - You don't need a framework or jQuery!!!
 *
 * version: 1.9.2-ES5
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
  var _onReadyQ = [], nxtFn;

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

  // IE - Polyfill Begins
  if (!Element.prototype.matches) {
    Element.prototype.matches =
      Element.prototype.msMatchesSelector ||
      Element.prototype.webkitMatchesSelector;
  }
  if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
      var el = this;
      do {
        if (Element.prototype.matches.call(el, s)) return el;
        el = el.parentElement || el.parentNode;
      } while (el !== null && el.nodeType === 1);
      return null;
    };
  }
  // IE - Polyfill Ends

  function _of ( x ) {
    return (Object.prototype.toString.call(x)).slice(8,-1).toLowerCase();
  }
  function _is ( x, type ) {
    if ((''+type)[0] == '*') {
      return (_of(x).indexOf((''+type).toLowerCase().substring(1)) >= 0);
    }
    return ((''+type).toLowerCase().indexOf(_of(x)) >= 0);
  }
  function _isArr ( x ) {
    return _is(x, 'array');
  }
  function _isObjLike ( x ) {
    return ((typeof x == 'object') || (typeof x == 'function'));
  }
  function _isUndef ( x ) {
    return _is(x, 'undefined');
  }
  function _isFn ( x ) {
    return _is(x, 'function');
  }
  function _toDottedPath ( srcStr ) {
    return (srcStr||'').trim().replace(/]/g,'').replace(/(\[)|(\\)|(\/)/g,'.').replace(/(\.+)/g,'.').replace(/\.+$/, '').replace(/^\.+/, '');
  }
  function _findInObj ( objSrc, pathStr, ifUndefined ) {
    if (_isObjLike(objSrc) && pathStr) {
      var pathList = pathStr.split('|').map(function(path){ return path.trim(); } );
      pathStr = pathList.shift();
      var nxtPath = pathList.join('|');

      var unDef, retValue;
      { var i = 0, path = _toDottedPath(pathStr).split('.'), len = path.length;
        for (retValue = objSrc; i < len; i++) {
          if (_isArr(retValue)) {
            retValue = retValue[ parseInt(path[i], 10) ];
          } else if (_isObjLike(retValue)) {
            retValue = retValue[ path[i].trim() ];
          } else {
            retValue = unDef;
            break;
          }
        }
      }

      if (_isUndef(retValue)) {
        if (nxtPath) {
          return _findInObj (objSrc, nxtPath, ifUndefined);
        } else {
          return (_isFn(ifUndefined))? ifUndefined.call(objSrc, objSrc, pathStr) : ifUndefined;
        }
      } else {
        return retValue;
      }

    } else {
      if (arguments.length == 3) {
        return (_isFn(ifUndefined))? ifUndefined.call(objSrc, objSrc, pathStr) : ifUndefined;
      } else {
        return objSrc;
      }
    }
  }
  function _callFn ( fnName, context, args ) {
    var fnRes, xFn = fnName;
    if (_is(fnName, 'string')) {
      var idxOfBrace = fnName.indexOf('(');
      var xFnName = (idxOfBrace>0? fnName.substring(0, idxOfBrace) : fnName).replace(/\s/g,'');
      if (xFnName) {
        xFn = _findInObj(window, xFnName);
      }
    }

    if (xFn && _isFn(xFn)) {
      try {
        fnRes = (xFn.apply(context, (_isUndef(args)? [] : (_isArr(args)? args : [args]))));
      } catch(e) {
        console.error('Error calling function:', xFn, ',', e);
      }
    } else {
      console.error('Invalid function:', fnName);
    }
    return fnRes;
  }

  function formData ( formX, asQryStr ) {
    var frmData = {};
    var targetForm = (typeof formX === 'string') ? $1(formX) : formX;
    var append = function (key, val) {
      if (frmData.hasOwnProperty(key)) {
        if (!Array.isArray(frmData[key])) {
          frmData[key] = frmData[key] ? [frmData[key]] : []
        };
        (val && frmData[key].push(val));
      } else {
        frmData[key] = val;
      }
    };

    [].slice.call(targetForm.elements).forEach(function (el) {
      if (!el.name || el.disabled || el.matches('form fieldset[disabled] *')) return;
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;

      if (el.tagName === 'SELECT') {
        ((el.type === 'select-multiple') && el.selectedIndex >= 0 && append(el.name, []));
        $$('option', el).forEach(function (opt) {
          opt.selected && append(el.name, opt.value);
        });
      } else {
        append(el.name, el.value);
      }

    });

    if (asQryStr) {
      return toUrlQryStr(frmData);
    }

    return frmData;
  }
  function toUrlQryStr ( dataObj ) {
    var qryStr = '';
    Object.keys(dataObj).forEach(function (key) {
      if (Array.isArray(dataObj[key])) {
        dataObj[key].forEach(function (val) {
          qryStr += '&' + key + '=' + val;
        });
      } else {
        qryStr += '&' + key + '=' + dataObj[key];
      }
    });
    return encodeURI(qryStr);
  }

  function $1 (selector, el) {
    return getElements(selector, el)[0];
  }
  function $$ (selector, el) {
    return getElements (selector, el);
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

  function parseElSrcPath ( el, attr, pContainer ) {
    var newSrc = oldSrc = (el.getAttribute(attr) || '').trim();
    var cRoot, rxCompPath, pSrc, pPath, pRoot;

    ((arguments.length === 2) && (pContainer = el.closest('[x-src]')));

    if (newSrc && pContainer && (!/^(\/\/|http:\/\/|https:\/\/)/i.test(newSrc))) {
      pRoot  = getComponentsRootPath( pContainer.getAttribute('x-src') );
      cRoot  = (_htmlDir || pRoot).replace(/^\/+/,'');
      rxCompPath = new RegExp('^((\.){0,2}\/)*'+(cRoot));
      if (rxCompPath.test(newSrc)) {
        newSrc = newSrc.replace(rxCompPath, _htmlDir||pRoot);
      // } else if (newSrc[0] !== '/') {
      } else if (newSrc[0] === '.') {
        pSrc   = (pContainer && pContainer.getAttribute('x-src')) || '';
        pPath  = pSrc.substring(0, pSrc.lastIndexOf('/')+1) || ((_htmlDir||pRoot)+'/');
        newSrc = (pPath+newSrc).replace(/\/\.?\//,'/');
      }
    }

    (newSrc !== oldSrc && el.setAttribute(attr, newSrc));
  }

  function processScripts (context, awaitScripts) {
    getElements('script:not([processed])', context).forEach(function(xScript){
      xScript.setAttribute('processed','');
      if (awaitScripts) { xScript.setAttribute('await',''); }
      var nScript = cloneScriptNodeFrom(xScript);

      if (nScript.hasAttribute('src')) {

        parseElSrcPath(nScript, 'src', xScript.closest('[x-src]'));
        var scriptSrc = nScript.getAttribute('src');
        (!/\.js$/i.test(scriptSrc)) && nScript.setAttribute('src', scriptSrc+'.js');

        var isAsync = !nScript.hasAttribute('await');
        if (!awaitScripts && isAsync) {
          xScript.parentNode.replaceChild( nScript, xScript );
        } else {
          renameAttr(xScript, 'src', 'x-src');
          loadExternalSrc(nScript);
        }
      } else {
        xScript.parentNode.replaceChild( nScript, xScript );
      }
    });
  }

  function fixComponentElsSrcPath ( context ) {
    getElements('link[rel="stylesheet"][href]:not([processed])', context).forEach(function (xEl) {
      parseElSrcPath(xEl, 'href');
      xEl.setAttribute('processed', '');
    });
    getElements('img[src]:not([processed])', context).forEach(function (xEl) {
      ((!/^data:/i.test(xEl.getAttribute('src'))) && (parseElSrcPath(xEl, 'src')));
      xEl.setAttribute('processed', '');
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
          var localHashEl = $1(_urlHash);
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
      var replaceTarget = (targetEl.hasAttribute('replace') || (targetEl.tagName.indexOf('REPLACE')>=0)),
          context       = replaceTarget? targetEl.parentNode : targetEl,
          targetAttr    = replaceTarget? 'outerHTML' : 'innerHTML',
          awaitScripts  = targetEl.hasAttribute('await');

      content = (content || '');
      targetEl[targetAttr] = content;
      fixComponentElsSrcPath( context );
      processScripts( context, awaitScripts );
      processIncludes( context );

    }
    loadUrlHash();
  }

  function onXhrStateChange () {
    var thisXHR = this;
    if (thisXHR.readyState != 4) return;
    var xhrStatus = thisXHR.status;
    var xhrMethod = thisXHR.method || 'GET';
    var isSuccess = ((xhrStatus >= 200 && xhrStatus < 300) || (xhrStatus == 304));
    var resTxt = isSuccess? thisXHR.responseText : ('Could not '+xhrMethod+' '+thisXHR.reqUrl);
    if (isSuccess) {
      if (thisXHR.onSuccess) {
        resTxt = _callFn(thisXHR.onSuccess, thisXHR, [resTxt, xhrStatus, thisXHR]);
      }
    } else {
      if (thisXHR.onError) {
        resTxt = _callFn(thisXHR.onError, thisXHR, [resTxt, xhrStatus, thisXHR]);
      }
    }
    if (!_isUndef(resTxt)) {
      updateElContent(this.targetEl, resTxt);
    }
  }

  function getComponentsRootPath ( fromPath ) {
    var cRoot = '';
    if (fromPath.indexOf('/')>=0) {
      var slashIdx1 = fromPath.indexOf('/');
      var slashIdx2 = fromPath.indexOf('/', slashIdx1+1);
      if ((fromPath[0] === '/' || fromPath[0] === '.') && (slashIdx2 > slashIdx1))  {
        cRoot = fromPath.substring(0, slashIdx2);
      } else {
        cRoot = fromPath.substring(0, slashIdx1);
      }
    }
    return cRoot;
  }
  function setComponentsRootPath ( fromPath ) {
    (_htmlDir === '?' && fromPath.indexOf('/')>=0 && (_htmlDir = getComponentsRootPath(fromPath)));
  }
  function getSrcPath ( srcPath ) {
    var finalPath = (srcPath || '').trim();
    var cRoot, rxCompPath, appendScript='';

    if (!/^(\/\/|http:\/\/|https:\/\/)/i.test(finalPath)) {
      appendScript = /\+$/.test(finalPath)? '+':'';
      if (appendScript) finalPath = finalPath.substring(0, finalPath.length-1);

      setComponentsRootPath(finalPath);

      if (_htmlDir) {
        if (/^[^a-z0-9_\.\/]/gi.test(finalPath[0])) {
          finalPath = finalPath.substring(1);
        } else {
          cRoot  = _htmlDir.replace(/^\/+/,'');
          rxCompPath = new RegExp('^((\.){0,2}\/)*'+(cRoot));
          if (rxCompPath.test(finalPath)) {
            finalPath = finalPath.replace(rxCompPath, _htmlDir);
          } else {
            finalPath = (_htmlDir+'/'+finalPath).replace(/\/\.?\//,'/');
          }
        }
      }

      //_htmlExt && (!((new RegExp(_htmlExt+'$')).test(finalPath))) && (finalPath = (finalPath[finalPath.length-1] == '/')? finalPath.substring(0, finalPath.length-1) : (finalPath+_htmlExt));
      if (_htmlExt && (!((new RegExp(_htmlExt+'$')).test(finalPath)))) {
        if (/\/\/$/.test(srcPath)) {
          var cNames = finalPath.split('/');
          var finalCompName = cNames[cNames.length-2];
          finalPath = finalPath+finalCompName+_htmlExt;
        } else if (finalPath[finalPath.length-1] !== '/') {
          finalPath = finalPath+_htmlExt;
        }
      }
    }

    return finalPath+appendScript;
  }

  function loadExternalSrc (targetEl, srcPath, options) {
    options = options || {method: 'GET'};
    srcPath = getSrcPath(srcPath || (targetEl.getAttribute('src')) );
    targetEl.setAttribute('x-src', srcPath);
    targetEl.removeAttribute('src');
    if (srcPath) {
      _pending++;
      if (/\+$/.test(srcPath)) { //appendScript
        targetEl.setAttribute('x-js', srcPath.replace(/\.[a-z]{3,4}\+$/, '.js'));
        srcPath = srcPath.substring(0, srcPath.length-1);
      }

      var xhrMethod   = options.method || 'GET';
      var xhrData     = options.data;
      var xhrDataType = {}.toString.call(xhrData).slice(8,-1).toLowerCase();
      var urlQryStr   = (xhrDataType == 'string')? xhrData : '';

      if (xhrData) {
        if (xhrMethod == 'GET') {
          if (xhrDataType === 'object') {
            urlQryStr = toUrlQryStr(xhrData);
          }
          srcPath = srcPath + ((urlQryStr && srcPath.indexOf('?')<0)? '?' : '') + urlQryStr;
          srcPath = srcPath.replace(/\?\&/,'?').replace(/\&\&/g, '&');
        } else {
          if (xhrDataType === 'object') {
            xhrData = JSON.stringify(xhrData);
          }
        }
      }

      var xhr = new XMLHttpRequest();
      xhr.targetEl           = targetEl;
      xhr.method             = xhrMethod;
      xhr.onSuccess          = options.onSuccess;
      xhr.onError            = options.onError;
      xhr.reqUrl             = srcPath;
      xhr.onreadystatechange = onXhrStateChange;
      xhr.open(xhrMethod, srcPath, !targetEl.hasAttribute('await'));
      (xhrData)? xhr.send( xhrData ) : xhr.send();
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
    var isForm = clickedEl.tagName == 'FORM';

    if (onHashNav && onHashPath && !isForm) {
      clickedEl.click();
      return;
    }

    if (isForm && (!clickedEl.checkValidity())) {
      clickedEl.reportValidity();
      return false;
    }

    var ifCheck = clickedEl.getAttribute('if');
    if (ifCheck) {
      var isOk = _callFn(ifCheck, clickedEl);
      if (!isOk) return false;
    }

    var targetEl = $1( clickedEl.getAttribute('x-target') );

    if (targetEl) {
      targetEl[clickedEl.hasAttribute('replace')? 'setAttribute': 'removeAttribute']('replace', '');

      if (clickedEl.hasAttribute('await')) {
        targetEl.setAttribute('await', '');
      }
      if (clickedEl.hasAttribute('async')) {
        targetEl.removeAttribute('await', '');
      }

      if (!isForm) {
        updateHistory( clickedEl );
      }

      var xSrc = clickedEl.getAttribute('x-href').substring(1);
      (/^[! ]/.test(xSrc)) && (xSrc = xSrc.substring(1).trim());

      if (isForm) {
        xSrc = xSrc || clickedEl.getAttribute('action');
        var formMethod = clickedEl.getAttribute('method') || 'GET';
        var dataType   = clickedEl.hasAttribute('form-data')? 'FormData' : 'JSON';
        var frmData    = formMethod == 'GET'? formData(clickedEl, true) : (/FormData/gi.test(dataType)? new FormData( clickedEl ) : formData(clickedEl));
        var onSuccess  = clickedEl.onSuccess || clickedEl.getAttribute('onsuccess') || '';
        var onError    = clickedEl.onError   || clickedEl.getAttribute('onerror') || '';
        var options    = { method:formMethod, data:frmData, onSuccess:onSuccess, onError:onError };
        clickedEl.onSuccess = '';
        clickedEl.onError   = '';

        loadExternalSrc(targetEl, xSrc, options);
      } else {
        loadExternalSrc(targetEl, xSrc);
      }
    } else {
      console.warn('Target element not found. Invalid target specified in element', clickedEl);
    }
  }

  function getAltIframeElements ( context ) {
    context = context || _doc;
    return getElements('[src]'+('audio embed iframe img input script source track video [processed] [skip-on-hash]'.split(' ').map(function(tag){ return ':not('+tag+')'; }).join('')), context);
  }

  function processIncludes (context) {
    context = context || _doc;
    var childAltFrameElements = getAltIframeElements(context);
    childAltFrameElements.forEach(function(el){
        parseElSrcPath(el, 'src');
        el.setAttribute('processed', '');
        loadExternalSrc(el);
      });

    getElements('form:not([onsubmit]):not([href])', context).forEach(function (formEl) {
      (!formEl.getAttribute('action') && formEl.setAttribute('onsubmit', 'return false;'));
    });

    getElements('form[action][target^="#"]', context).forEach(function (formEl) {
      var formAction = formEl.getAttribute('action');
      if (formAction) {
        formEl.setAttribute('href', '#'+(formAction.replace(/^#+/,'')));
        (!formEl.hasAttribute('onsubmit')) && formEl.setAttribute('onsubmit', 'return false;');
      }
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
    var resTxt = ((xhrStatus >= 200 && xhrStatus < 300) || (xhrStatus == 304))? this.responseText : ('{"error":"Failed: [GET]'+this.reqUrl+'", "status": '+xhrStatus+'}');
    this.callbackFn( JSON.parse(resTxt) );
  }
  function getData(dataUrl, callbackFn) {
    var xhr = new XMLHttpRequest();
    xhr.reqUrl     = dataUrl;
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

  function submitForm ( formId, options ) {
    options = options || {method: '', url:'', target:'', onSuccess:'', onError:''}
    var targetForm = $1(formId);
    if (targetForm) {
      if (options.method) {
        targetForm.setAttribute('method', options.method);
      }
      if (options.url) {
        targetForm.setAttribute('x-href', '#'+(options.url.replace(/^#+/,'')) );
      }
      if (options.target) {
        targetForm.setAttribute('x-target', options.target);
      }
      if (options.onSuccess) {
        targetForm.onSuccess = options.onSuccess;
      }
      if (options.onError) {
        targetForm.onError = options.onError;
      }
      var submitEvent = document.createEvent("Event");
      submitEvent.initEvent("submit", true, true);
      targetForm.dispatchEvent(submitEvent);
    } else {
      console.error('Form NOT FOUND!', formId);
    }
  }

  function onReady ( fnX, delay ) {
    if (typeof fnX === 'function') {
      _onReadyQ.push({fn: fnX, delay: delay||0});
      processOnReady();
    }
  }

  function processOnReady ( fnRes ) {
    if (!_pending && !getAltIframeElements().length && _onReadyQ.length && (typeof fnRes === 'undefined' || fnRes)) {
      nxtFn = _onReadyQ.shift();
      setTimeout(function () {
        var prevFnRes = nxtFn.fn(fnRes);
        ((typeof prevFnRes !== 'undefined' && !prevFnRes && (_onReadyQ = [])));
        processOnReady( prevFnRes );
      }, nxtFn.delay);
    }
  }

  function onDocReady () {
    _pending = 0;
    _urlHash = _loc.hash || '';
    _hashLst = (_urlHashOn && _urlHash && _urlHash.split(hashPathDelimiter)) || [];
    _htmlDir = (_doc.body.getAttribute('components-loc') || '').replace(/^\.\//,'').replace(/\/+$/g,'').trim();
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

  _g.alt = _g.aif = { load:load, onReady:onReady, getData:getData, formData:formData, submitForm:submitForm };

})(this);