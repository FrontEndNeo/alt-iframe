/**
 * alt-iframe
 * - A simple native JavaScript (ES6+) utility library to include partial HTML(s).
 * - You don't need a framework or jQuery!!!
 *
 * version: 1.2.0
 *
 * License: MIT
 *
 * USAGE:
 * see example at https://github.com/FrontEndNeo/alt-iframe
*/
(function(_g){

  let _doc = document, _htmlDir, _htmlExt;

  function getElements (selector, el) {
    el = ((typeof el == 'string') && _doc.querySelector(el)) || el || _doc;
    return Array.prototype.slice.call(el.querySelectorAll(selector));
  }

  function renameAttr (el, oAttr, nAttr) {
    el.setAttribute(nAttr, el.getAttribute(oAttr));
    el.removeAttribute(oAttr);
  }

  function cloneScriptNodeFrom (xScript) {
    let script  = _doc.createElement('script');
    script.text = xScript.innerHTML;
    for( let i = xScript.attributes.length-1; i >= 0; i-- ) {
      script.setAttribute( xScript.attributes[i].name, xScript.attributes[i].value );
    }
    return script;
  }

  function processScripts (context, awaitScripts) {
    getElements('x-script:not([processed])', context).forEach(xScript=>{
      xScript.setAttribute('processed','');
      if (awaitScripts) { xScript.setAttribute('await',''); }
      let nScript = cloneScriptNodeFrom(xScript);

      if (!nScript.hasAttribute('src')) {
        xScript.parentNode.replaceChild( nScript, xScript );
      } else {
        let isAsync = !nScript.hasAttribute('await');
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
    let appendScript = targetEl.getAttribute('x-js');
    if (appendScript) {
      content += '<script src="'+appendScript+'"></script>';
      targetEl.removeAttribute('x-js');
    }
    if (targetEl.tagName == 'SCRIPT') {
      if (content.trim()) {
        let xScript = document.createElement( "script" );
        xScript.id = (new Date()).getMilliseconds();
        xScript.text = content;
        document.head.appendChild( xScript ).parentNode.removeChild( xScript );
      }
    } else {
      content = (content || '').replace(/<(\/)*script/gi, '<$1x-script');
      if ((targetEl.tagName.indexOf('REPLACE')>=0) || targetEl.hasAttribute('replace')) {
        let targetParent = targetEl.parentNode;
        let awaitScripts = targetEl.hasAttribute('await');
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

  function getSrcPath ( srcPath ) {
    let finalPath = (srcPath || '').trim();
    let appendScript = /\+$/.test(finalPath)? '+':'';
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
      if (/\+$/.test(srcPath)) { //appendScript
        targetEl.setAttribute('x-js', srcPath.replace(/\.[a-z]{3,4}\+$/, '.js'));
        srcPath = srcPath.substring(0, srcPath.length-1);
      }
      if (targetEl.hasAttribute('await')) {
        (async () => {
          const res = await fetch(srcPath).catch( e => null );
          if (res && res.ok) {
            updateElContent(targetEl, await res.text());
          }
        })();
      } else {
        fetch(srcPath)
        .then( res => res.text() )
        .then( resText => updateElContent(targetEl, resText) )
        .catch( e => null );
      }
    }
  }

  function onNavElClick () {
    let clickedEl = this;
    let targetEl = _doc.querySelector( clickedEl.getAttribute('x-target') );

    if (targetEl) {
      targetEl[clickedEl.hasAttribute('replace')? 'setAttribute': 'removeAttribute']('replace', '');

      if (clickedEl.hasAttribute('await')) {
        targetEl.setAttribute('await', '');
      }
      if (clickedEl.hasAttribute('async')) {
        targetEl.removeAttribute('await', '');
      }

      loadExternalSrc(targetEl, clickedEl.getAttribute('x-href').substring(1) );
    } else {
      console.warn('Target element not found. Invalid target specified in element', clickedEl);
    }
  }

  function processIncludes (context) {
    context = context || document;
    getElements('[src]'+('audio embed iframe img input script source track video x-script [processed]'.split(' ').map(tag=>':not('+tag+')').join('')), context)
      .forEach((el)=>{
        el.setAttribute('processed', '');
        loadExternalSrc(el);
      });

    getElements('[href^="#"][target^="#"]', context).forEach(el=>{
      renameAttr(el, 'target', 'x-target');
      renameAttr(el, 'href', 'x-href');
      el.setAttribute('href', 'javascript:;');
      el.addEventListener('click', onNavElClick);
    });
  }

  function onDocReady () {
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