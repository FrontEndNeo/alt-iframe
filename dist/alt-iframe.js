/**
 * alt-iframe
 * - A simple native JavaScript (ES5) utility library to include partial HTML(s).
 * - You don't need a framework or jQuery!!!
 *
 * version: 1.0.0
 *
 * License: MIT
 *
 * USAGE:
 * <!doctype html>
 * <html lang="en">
 * <head>
 *   <title>Single HTML Page</title>
 * </head>
 * <body>
 *   ...
 *   <div src="partial-html-files/header.html"></div>
 *   ...
 *   <br src="partial-html-files/footer.html" replace >
 *   ...
 *   <a href="#partial-html-files/profile.html" target="#targetContainer">Profile</a>
 *   ...
 *   <button href="#partial-html-files/profile.html" target="#targetContainer">Profile</button>
 *   ...
 *   ...
 *   <script src="path-to-this-script-file"></script>
 * </body>
 * </html>
*/
(function(_g){

  var _doc  = document;

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

  function updateElContent (targetEl, content) {
    if (targetEl.tagName == 'SCRIPT') {
      if (content.trim()) {
        var xScript = document.createElement( "script" );
        xScript.id = (new Date()).getMilliseconds();
        xScript.text = content;
        document.head.appendChild( xScript ).parentNode.removeChild( xScript );
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
  }

  function onXhrStateChange () {
    if (this.readyState != 4) return;
    var xhrStatus = this.status;
    if ((xhrStatus >= 200 && xhrStatus < 300) || (xhrStatus == 304)) {
      updateElContent(this.targetEl, this.responseText);
    } else {
      updateElContent(this.targetEl, 'Failed ('+xhrStatus+':'+this.statusText+') to load ['+this.responseURL+']');
    }
  }

  function loadExternalSrc (targetEl, srcPath) {
    srcPath = srcPath || (targetEl.getAttribute('src') || '').trim();
    targetEl.setAttribute('x-src', srcPath);
    targetEl.removeAttribute('src');
    if (srcPath) {
      var xhr     = new XMLHttpRequest();
      var isAsync = !targetEl.hasAttribute('await');

      xhr.targetEl           = targetEl;
      xhr.onreadystatechange = onXhrStateChange;
      xhr.open('GET', srcPath, isAsync);
      xhr.send();
    }
  }

  function onNavElClick () {
    var clickedEl = this;
    var targetEl = _doc.querySelector( clickedEl.getAttribute('x-target') );

    if (targetEl) {
      if (targetEl.tagName.indexOf('REPLACE') < 0) {
        targetEl.removeAttribute('replace');
        if (clickedEl.hasAttribute('await')) {
          targetEl.setAttribute('await', '');
        } else {
          targetEl.removeAttribute('await');
        }

        loadExternalSrc(targetEl, clickedEl.getAttribute('x-href').substring(1) );
      } else {
        console.warn('Target element cannot be replaced. Invalid target specified in element', clickedEl);
      }
    } else {
      console.warn('Invalid target specified in element', clickedEl);
    }
  }

  function processIncludes (context) {
    context = context || document;
    getElements('[src]'+('audio embed iframe img input script source track video x-script [processed]'.split(' ').map(function(tag){ return ':not('+tag+')'; }).join('')), context)
      .forEach(function(el){
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
    processIncludes();
  }

  if ( (_doc.readyState == 'complete') || (!(_doc.readyState == 'loading' || _doc.documentElement.doScroll)) ) {
    onDocReady();
  } else {
    _doc.addEventListener('DOMContentLoaded', onDocReady);
  }

})(this);