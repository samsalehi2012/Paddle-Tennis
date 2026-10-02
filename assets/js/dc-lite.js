/*
 * dc-lite — a tiny runtime that renders the prototype's templates.
 * Template syntax: {{path}} holes, <sc-for list as>, <sc-if value>, onClick="{{fn}}".
 * The page's <script type="text/x-dc" data-dc-script> defines `class Component extends DCLogic`.
 */
(function () {
  'use strict';
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  var BOOL_ATTRS = { disabled: 1, checked: 1, hidden: 1, selected: 1, readonly: 1, required: 1, open: 1 };
  var HTML_NS = 'http://www.w3.org/1999/xhtml';

  function lookup(scope, path) {
    path = String(path).trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (path === 'undefined') return undefined;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function stripHole(s) {
    var m = String(s || '').match(WHOLE);
    return m ? m[1] : s;
  }

  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) {
      var v = lookup(scope, p);
      return v == null ? '' : String(v);
    });
  }

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (update) {
    var patch = typeof update === 'function' ? update(this.state, this.props) : update;
    this.state = Object.assign({}, this.state, patch);
    schedule(this);
  };
  DCLogic.prototype.forceUpdate = function () { schedule(this); };
  window.DCLogic = DCLogic;

  function schedule(inst) {
    if (inst.__pending || !inst.__render) return;
    inst.__pending = true;
    Promise.resolve().then(function () {
      inst.__pending = false;
      inst.__render();
    });
  }

  function renderChildren(tplNode, scope, ctx, out) {
    var kids = tplNode.childNodes;
    for (var i = 0; i < kids.length; i++) renderNode(kids[i], scope, ctx, out);
  }

  function renderNode(n, scope, ctx, out) {
    if (n.nodeType === 3) {
      out.push(document.createTextNode(interp(n.nodeValue, scope)));
      return;
    }
    if (n.nodeType !== 1) return;
    var tag = n.localName;
    if (tag === 'helmet') return;
    if (tag === 'sc-for') {
      var list = lookup(scope, stripHole(n.getAttribute('list'))) || [];
      var as = n.getAttribute('as') || 'item';
      for (var i = 0; i < list.length; i++) {
        var s = Object.create(scope);
        s[as] = list[i];
        s.$index = i;
        renderChildren(n, s, ctx, out);
      }
      return;
    }
    if (tag === 'sc-if') {
      if (lookup(scope, stripHole(n.getAttribute('value')))) renderChildren(n, scope, ctx, out);
      return;
    }
    var el = (n.namespaceURI && n.namespaceURI !== HTML_NS)
      ? document.createElementNS(n.namespaceURI, n.localName)
      : document.createElement(tag);
    var attrs = n.attributes;
    for (var a = 0; a < attrs.length; a++) {
      var name = attrs[a].name;
      var val = attrs[a].value;
      if (name.indexOf('hint-') === 0) continue;
      var whole = val.match(WHOLE);
      if (/^on[a-z]+$/.test(name)) {
        if (whole) {
          var fn = lookup(scope, whole[1]);
          if (typeof fn === 'function') {
            var id = 'h' + (ctx.hid++);
            ctx.handlers[id] = fn;
            el.setAttribute('data-dc-' + name.slice(2), id);
          }
        }
        continue;
      }
      if (whole) {
        var v = lookup(scope, whole[1]);
        if (BOOL_ATTRS[name]) { if (v) el.setAttribute(name, ''); continue; }
        if (v == null) continue;
        if (v === false && name.indexOf('aria-') !== 0) continue;
        el.setAttribute(name, String(v));
        continue;
      }
      el.setAttribute(name, val.indexOf('{{') >= 0 ? interp(val, scope) : val);
    }
    var kids = [];
    renderChildren(n, scope, ctx, kids);
    for (var k = 0; k < kids.length; k++) el.appendChild(kids[k]);
    out.push(el);
  }

  function boot() {
    var tpl = document.getElementById('dc-template');
    var mount = document.getElementById('dc-root');
    var scriptEl = document.querySelector('script[data-dc-script]');
    if (!tpl || !mount || !scriptEl) return;

    var helmets = tpl.content.querySelectorAll('helmet');
    for (var h = 0; h < helmets.length; h++) {
      var hk = helmets[h].children;
      for (var j = 0; j < hk.length; j++) document.head.appendChild(document.importNode(hk[j], true));
    }

    var defs = {};
    try { defs = JSON.parse(scriptEl.getAttribute('data-props') || '{}'); } catch (e) { defs = {}; }
    var props = {};
    Object.keys(defs).forEach(function (k) {
      if (k.charAt(0) !== '$' && defs[k] && Object.prototype.hasOwnProperty.call(defs[k], 'default')) props[k] = defs[k]['default'];
    });

    var Component = new Function('DCLogic', scriptEl.textContent + '\n;return Component;')(DCLogic);
    var inst = new Component(props);
    var ctx = { hid: 0, handlers: {} };

    inst.__render = function () {
      var next = { hid: 0, handlers: {} };
      var vals = inst.renderVals();
      var out = [];
      renderChildren(tpl.content, vals, next, out);
      var fresh = document.createElement('div');
      fresh.id = 'dc-root';
      for (var i = 0; i < out.length; i++) fresh.appendChild(out[i]);
      window.morphdom(mount, fresh, {
        onBeforeElUpdated: function (fromEl) {
          return !(fromEl === document.activeElement && (fromEl.tagName === 'INPUT' || fromEl.tagName === 'TEXTAREA'));
        }
      });
      ctx = next;
    };

    ['click', 'input', 'change'].forEach(function (type) {
      mount.addEventListener(type, function (e) {
        var el = e.target.closest ? e.target.closest('[data-dc-' + type + ']') : null;
        if (!el || !mount.contains(el)) return;
        var fn = ctx.handlers[el.getAttribute('data-dc-' + type)];
        if (typeof fn === 'function') fn(e);
      });
    });

    inst.__render();
    document.documentElement.classList.add('dc-ready');
    if (typeof inst.componentDidMount === 'function') inst.componentDidMount();
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
