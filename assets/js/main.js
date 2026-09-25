/* ============================================================
   GS BLUE ELECTRIC — site behaviour
   nav · reveal · counters · gallery · map consent
   Language is served from separate URLs (/ and /en/), so there is
   no client-side translation layer.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ---------------- nav ---------------- */
  var nav = document.getElementById('nav');
  var hasHero = document.body.hasAttribute('data-hero');

  function onScroll() {
    if (!nav) return;
    if (!hasHero) { nav.classList.add('solid'); return; }
    nav.classList.toggle('solid', window.scrollY > window.innerHeight * 0.72);
  }

  function markActiveNav() {
    var page = document.body.getAttribute('data-page');
    if (!page) return;
    document.querySelectorAll('.nav-links a, .mmenu nav a').forEach(function (a) {
      if (a.getAttribute('data-nav') === page) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* ============================================================
     DIALOGS — focus moves in, is trapped, and returns to the trigger.
     Everything behind the dialog is made inert so it cannot be reached
     by keyboard or announced by a screen reader.
     ============================================================ */
  var FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';
  var openDialog = null, lastTrigger = null;

  function focusablesIn(el) {
    return [].filter.call(el.querySelectorAll(FOCUSABLE), function (n) {
      return n.offsetWidth || n.offsetHeight || n.getClientRects().length;
    });
  }
  function setBackgroundInert(dialog, on) {
    [].forEach.call(document.body.children, function (el) {
      if (el === dialog || el.tagName === 'SCRIPT') return;
      if (on) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
  }
  function dialogOpen(dialog, trigger, focusTarget) {
    openDialog = dialog;
    lastTrigger = trigger || document.activeElement;
    document.body.style.overflow = 'hidden';
    setBackgroundInert(dialog, true);
    var target = focusTarget || focusablesIn(dialog)[0] || dialog;
    target.focus();
  }
  function dialogClose(dialog) {
    setBackgroundInert(dialog, false);
    document.body.style.overflow = '';
    openDialog = null;
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
    lastTrigger = null;
  }
  function trapTab(e) {
    if (e.key !== 'Tab' || !openDialog) return;
    var items = focusablesIn(openDialog);
    if (!items.length) { e.preventDefault(); return; }
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------------- mobile menu ---------------- */
  var mmenu = document.getElementById('mmenu');
  function openMenu() {
    if (!mmenu) return;
    mmenu.classList.add('open');
    var b = document.getElementById('burger');
    if (b) b.setAttribute('aria-expanded', 'true');
    dialogOpen(mmenu, b, document.getElementById('mclose'));
  }
  function closeMenu() {
    if (!mmenu || !mmenu.classList.contains('open')) return;
    mmenu.classList.remove('open');
    var b = document.getElementById('burger');
    if (b) b.setAttribute('aria-expanded', 'false');
    dialogClose(mmenu);
  }

  /* ---------------- reveal ---------------- */
  function initReveal() {
    var nodes = document.querySelectorAll('[data-reveal]:not(.in)');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      nodes.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- counters ----------------
     The final value is in the markup, so it survives without JS and is
     readable by crawlers; the animation resets to zero and rolls up.     */
  function formatCount(n, sep) {
    return sep ? Math.round(n).toLocaleString('en-US') : String(Math.round(n));
  }
  function animateCount(el) {
    var target = parseFloat(el.dataset.target);
    var sep = el.dataset.sep === '1';
    var dur = 1500, t0 = performance.now();
    function step(t) {
      var p = Math.min((t - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = formatCount(target * e, sep);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function initCounters() {
    var nodes = document.querySelectorAll('.count');
    if (!nodes.length || reduceMotion || !('IntersectionObserver' in window)) return;
    nodes.forEach(function (el) { el.textContent = '0'; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- hero parallax ---------------- */
  function initParallax() {
    var hm = document.getElementById('heroMedia');
    if (!hm || reduceMotion) return;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < window.innerHeight) hm.style.transform = 'translateY(' + (y * 0.28) + 'px)';
        ticking = false;
      });
    }, { passive: true });
  }

  /* ============================================================
     GALLERY — items are in the markup; JS adds filtering + lightbox
     ============================================================ */
  var items = [], filtered = [], index = 0, tab = 'all';

  function readItems() {
    items = [].map.call(document.querySelectorAll('#gal-grid .gal-item'), function (el) {
      return {
        el: el,
        cat: el.getAttribute('data-cat'),
        full: el.getAttribute('data-full'),
        caption: el.getAttribute('aria-label')
      };
    });
    filtered = items.slice();
  }

  function switchTab(next) {
    tab = next;
    document.querySelectorAll('.gtab').forEach(function (b) {
      b.classList.toggle('gtab-active', b.getAttribute('data-tab') === tab);
      b.setAttribute('aria-pressed', b.getAttribute('data-tab') === tab ? 'true' : 'false');
    });
    items.forEach(function (it) {
      it.el.style.display = (tab === 'all' || it.cat === tab) ? '' : 'none';
    });
    filtered = tab === 'all' ? items.slice() : items.filter(function (it) { return it.cat === tab; });
    var c = document.getElementById('gal-count');
    if (c) c.textContent = filtered.length;
  }

  function showFrame() {
    var it = filtered[index];
    if (!it) return;
    var img = document.getElementById('lb-img');
    img.src = it.full;
    img.alt = it.caption;
    document.getElementById('lb-caption').textContent = it.caption;
    document.getElementById('lb-counter').textContent = (index + 1) + ' / ' + filtered.length;
  }
  function openLightbox(it) {
    var pos = filtered.indexOf(it);
    index = pos >= 0 ? pos : 0;
    showFrame();
    var lb = document.getElementById('gal-lightbox');
    lb.classList.add('open');
    dialogOpen(lb, it.el, lb.querySelector('.lb-close'));
  }
  function closeLightbox() {
    var lb = document.getElementById('gal-lightbox');
    if (!lb || !lb.classList.contains('open')) return;
    lb.classList.remove('open');
    dialogClose(lb);
  }
  function step(delta) {
    if (!filtered.length) return;
    index = (index + delta + filtered.length) % filtered.length;
    showFrame();
  }

  /* ============================================================
     MAP — third-party frames load only after explicit consent
     ============================================================ */
  function initMaps() {
    document.querySelectorAll('[data-map]').forEach(function (holder) {
      var btn = holder.querySelector('[data-map-load]');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var frame = document.createElement('iframe');
        frame.src = holder.getAttribute('data-map');
        frame.title = holder.getAttribute('data-map-title') || 'Google Maps';
        frame.loading = 'lazy';
        frame.referrerPolicy = 'no-referrer-when-downgrade';
        frame.setAttribute('allowfullscreen', '');
        holder.innerHTML = '';
        holder.appendChild(frame);
      });
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  /* ---------------- band slider ---------------- */
  function initBandSliders() {
    document.querySelectorAll('.band-slider').forEach(function (root) {
      var slides = root.querySelectorAll('.slide');
      if (slides.length < 2) return;
      var dotsBox = root.querySelector('.band-dots');
      var label = root.getAttribute('data-label') || 'Photo';
      var i = 0, timer = null, dots = [];

      slides.forEach(function (sl, n) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', label + ' ' + (n + 1));
        b.addEventListener('click', function () { go(n); restart(); });
        dotsBox.appendChild(b);
        dots.push(b);
      });

      function go(n) {
        slides[i].classList.remove('on');
        slides[i].setAttribute('aria-hidden', 'true');
        i = (n + slides.length) % slides.length;
        slides[i].classList.add('on');
        slides[i].removeAttribute('aria-hidden');
        dots.forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      }
      function restart() {
        clearInterval(timer);
        if (!reduceMotion) timer = setInterval(function () { go(i + 1); }, 6000);
      }

      root.querySelector('.prev').addEventListener('click', function () { go(i - 1); restart(); });
      root.querySelector('.next').addEventListener('click', function () { go(i + 1); restart(); });
      root.addEventListener('mouseenter', function () { clearInterval(timer); });
      root.addEventListener('mouseleave', restart);
      root.addEventListener('focusin', function () { clearInterval(timer); });

      var x0 = null;
      root.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      root.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1)); restart(); }
        x0 = null;
      });

      slides.forEach(function (sl, n) { if (n) sl.setAttribute('aria-hidden', 'true'); });
      go(0);
      restart();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var burger = document.getElementById('burger');
    if (burger) burger.addEventListener('click', openMenu);
    var mclose = document.getElementById('mclose');
    if (mclose) mclose.addEventListener('click', closeMenu);
    if (mmenu) mmenu.querySelectorAll('nav a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    markActiveNav();
    initReveal();
    initCounters();
    initParallax();
    initMaps();
    initBandSliders();

    if (document.getElementById('gal-grid')) {
      readItems();
      items.forEach(function (it) {
        it.el.addEventListener('click', function () { openLightbox(it); });
      });
      document.querySelectorAll('.gtab').forEach(function (b) {
        b.addEventListener('click', function () { switchTab(b.getAttribute('data-tab')); });
      });
      var lb = document.getElementById('gal-lightbox');
      if (lb) {
        lb.querySelector('.lb-close').addEventListener('click', closeLightbox);
        lb.querySelector('.lb-prev').addEventListener('click', function () { step(-1); });
        lb.querySelector('.lb-next').addEventListener('click', function () { step(1); });
        lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
      }
      switchTab('all');
    }

    document.addEventListener('keydown', function (e) {
      trapTab(e);
      var lb = document.getElementById('gal-lightbox');
      var open = lb && lb.classList.contains('open');
      if (e.key === 'Escape') { open ? closeLightbox() : closeMenu(); }
      if (!open) return;
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  });
})();
