/* "Install the app" banner for the Sahel PWA (Android: native prompt, iPhone: short instructions). */
(function () {
  'use strict';
  if (window.top !== window) return; // shown inside the desktop phone preview: skip
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  if (standalone) return;
  var KEY = 'sahel-install-dismissed';
  try { if (localStorage.getItem(KEY)) return; } catch (e) {}

  var ua = navigator.userAgent;
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var deferred = null, shown = false;

  var SHARE_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="vertical-align:-4px"><path d="M12 3v12"></path><path d="M8 7l4-4 4 4"></path><path d="M5 11v9h14v-9"></path></svg>';

  function show(mode) {
    if (shown) return;
    shown = true;
    var bar = document.createElement('div');
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'نصب اپلیکیشن');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:60;' +
      'display:flex;align-items:center;gap:12px;padding:12px 12px 12px 10px;border-radius:20px;background:#0F1E26;color:#fff;' +
      'font-family:Vazirmatn,system-ui,sans-serif;box-shadow:0 20px 40px -16px rgba(15,30,38,.6);direction:rtl;max-width:520px;margin:0 auto;' +
      'transform:translateY(20px);opacity:0;transition:transform .3s ease,opacity .3s ease';
    var base = (document.querySelector('link[rel="apple-touch-icon"]') || {}).href || '';
    var text = mode === 'ios'
      ? 'در Safari دکمه‌ی اشتراک‌گذاری ' + SHARE_ICON + ' و بعد <bdi dir="ltr" style="white-space:nowrap">Add to Home Screen</bdi> را بزنید.'
      : 'بدون استور، با یک لمس روی صفحه‌ی اصلی گوشی.';
    bar.innerHTML =
      '<img src="' + base + '" alt="" width="44" height="44" style="flex:0 0 auto;width:44px;height:44px;border-radius:12px">' +
      '<span style="flex:1;display:flex;flex-direction:column;gap:2px;min-width:0">' +
      '<b style="font-size:14px;font-weight:900">اپ ساحل را نصب کنید</b>' +
      '<span style="font-size:12px;line-height:1.7;color:#C9D6DB">' + text + '</span></span>' +
      (mode === 'ios' ? '' : '<button type="button" data-act="install" style="flex:0 0 auto;height:40px;padding:0 16px;border:0;border-radius:999px;background:#D9F25E;color:#0F1E26;font:inherit;font-size:13px;font-weight:900;cursor:pointer">نصب</button>') +
      '<button type="button" data-act="close" aria-label="بستن" style="flex:0 0 auto;width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font:inherit;font-size:18px;line-height:1;cursor:pointer">×</button>';
    document.body.appendChild(bar);
    requestAnimationFrame(function () { bar.style.transform = 'none'; bar.style.opacity = '1'; });
    bar.addEventListener('click', function (e) {
      var act = e.target.closest('button') && e.target.closest('button').getAttribute('data-act');
      if (act === 'install' && deferred) {
        deferred.prompt();
        deferred.userChoice.finally(function () { bar.remove(); });
        deferred = null;
      } else if (act === 'close') {
        try { localStorage.setItem(KEY, '1'); } catch (err) {}
        bar.remove();
      }
    });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    show('android');
  });
  window.addEventListener('appinstalled', function () {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
  });
  if (isIOS) setTimeout(function () { show('ios'); }, 1500);
})();
