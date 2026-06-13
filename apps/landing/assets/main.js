/* =========================================================
   Razas — Interacciones compartidas
   ========================================================= */
(function () {
  'use strict';
  var mediaReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Tweaks / personalization state ---- */
  var TK_STORE = 'razas_tweaks_v1';
  function getTweaks() { try { return JSON.parse(localStorage.getItem(TK_STORE)) || {}; } catch (e) { return {}; } }
  function saveTweaks(t) { try { localStorage.setItem(TK_STORE, JSON.stringify(t)); } catch (e) {} }
  var tweaks = getTweaks();
  var ACCENTS = {
    naranja:   ['#F26522', '#D4541A', '#FEF0E7', 'rgba(242,101,34,0.16)'],
    terracota: ['#C2562F', '#A1431F', '#F6E9E2', 'rgba(194,86,47,0.16)'],
    ambar:     ['#E08407', '#BC6E05', '#FCF1DE', 'rgba(224,132,7,0.16)']
  };
  function applyAccent(key) {
    var a = ACCENTS[key] || ACCENTS.naranja, s = document.documentElement.style;
    s.setProperty('--primary', a[0]); s.setProperty('--primary-dark', a[1]);
    s.setProperty('--primary-light', a[2]); s.setProperty('--primary-glow', a[3]);
  }
  if (tweaks.accent && tweaks.accent !== 'naranja') applyAccent(tweaks.accent);
  document.documentElement.classList.toggle('anim-off', tweaks.anim === 'off');
  function animOffNow() { return mediaReduce || document.documentElement.classList.contains('anim-off'); }

  /* ---- Navbar scroll state ---- */
  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- Mobile menu ---- */
  var ham = document.getElementById('hamburger');
  var menu = document.getElementById('mobileMenu');
  var scrim = document.getElementById('scrim');
  var closeBtn = document.getElementById('mmClose');
  function openMenu() { if (menu) menu.classList.add('open'); if (scrim) scrim.classList.add('show'); document.body.style.overflow = 'hidden'; }
  function closeMenu() { if (menu) menu.classList.remove('open'); if (scrim) scrim.classList.remove('show'); document.body.style.overflow = ''; }
  if (ham) ham.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (scrim) scrim.addEventListener('click', closeMenu);
  if (menu) menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });

  /* ---- Scroll reveal (single + stagger) ---- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      if (el.hasAttribute('data-stagger')) {
        var kids = el.children, i;
        for (i = 0; i < kids.length; i++) {
          (function (kid, idx) { setTimeout(function () { kid.style.transitionDelay = '0s'; }, 0); kid.style.transitionDelay = (idx * 0.09) + 's'; })(kids[i], i);
        }
      }
      el.classList.add('in');
      io.unobserve(el);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal, .reveal-l, .reveal-r, .reveal-scale, [data-stagger]').forEach(function (el) { io.observe(el); });

  /* ---- Animated counters ---- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var dur = 1600, decimals = (el.getAttribute('data-decimals') || '0') * 1;
    var prefix = el.getAttribute('data-prefix') || '', suffix = el.getAttribute('data-suffix') || '';
    if (animOffNow()) { el.textContent = prefix + target.toFixed(decimals) + suffix; return; }
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      el.textContent = prefix + (decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString('es-PE')) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = prefix + (decimals ? target.toFixed(decimals) : target.toLocaleString('es-PE')) + suffix;
    }
    requestAnimationFrame(step);
  }
  var countIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { animateCount(e.target); countIO.unobserve(e.target); } });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(function (el) { countIO.observe(el); });

  /* ---- Parallax ---- */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (parallaxEls.length) {
    var ticking = false;
    function updateParallax() {
      if (animOffNow()) { parallaxEls.forEach(function (el) { el.style.transform = ''; }); ticking = false; return; }
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.15;
        var rect = el.getBoundingClientRect();
        var center = rect.top + rect.height / 2;
        var offset = (center - vh / 2) * speed * -1;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
      ticking = false;
    }
    function requestParallax() { if (!ticking) { ticking = true; requestAnimationFrame(updateParallax); } }
    window.addEventListener('scroll', requestParallax, { passive: true });
    window.addEventListener('resize', requestParallax);
    updateParallax();
  }

  /* ---- Hero tilt on pointer (subtle) ---- */
  var tilt = document.querySelector('[data-tilt]');
  if (tilt && !mediaReduce && window.matchMedia('(pointer:fine)').matches) {
    var frame;
    tilt.addEventListener('mousemove', function (ev) {
      if (animOffNow()) return;
      var r = tilt.getBoundingClientRect();
      var px = (ev.clientX - r.left) / r.width - 0.5;
      var py = (ev.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        tilt.style.transform = 'perspective(1000px) rotateY(' + (px * 5).toFixed(2) + 'deg) rotateX(' + (-py * 5).toFixed(2) + 'deg)';
      });
    });
    tilt.addEventListener('mouseleave', function () { tilt.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)'; });
  }

  /* ---- Accordion / FAQ ---- */
  document.querySelectorAll('[data-accordion]').forEach(function (acc) {
    var items = acc.querySelectorAll('.faq-item');
    items.forEach(function (item) {
      var q = item.querySelector('.faq-q');
      if (!q) return;
      q.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');
        if (!acc.hasAttribute('data-multi')) {
          items.forEach(function (it) { it.classList.remove('open'); var b = it.querySelector('.faq-q'); if (b) b.setAttribute('aria-expanded', 'false'); });
        }
        item.classList.toggle('open', !isOpen);
        q.setAttribute('aria-expanded', String(!isOpen));
      });
    });
  });

  /* ---- Scrollspy for in-page quick-nav ---- */
  var spy = document.querySelector('[data-spy]');
  if (spy) {
    var links = Array.prototype.slice.call(spy.querySelectorAll('a'));
    var targets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
    var spyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var id = e.target.id;
          links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + id); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    targets.forEach(function (t) { spyIO.observe(t); });
  }

  /* =========================================================
     GLOBAL EXTRAS
     ========================================================= */

  /* ---- Scroll progress bar ---- */
  var bar = document.createElement('div'); bar.id = 'progress-bar'; document.body.appendChild(bar);
  function updateBar() {
    var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  }
  updateBar();
  window.addEventListener('scroll', updateBar, { passive: true });
  window.addEventListener('resize', updateBar);

  /* ---- Back to top ---- */
  var toTop = document.createElement('button'); toTop.id = 'to-top'; toTop.setAttribute('aria-label', 'Volver arriba');
  toTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(toTop);
  function toggleTop() { toTop.classList.toggle('show', window.scrollY > 520); }
  toggleTop();
  window.addEventListener('scroll', toggleTop, { passive: true });
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: animOffNow() ? 'auto' : 'smooth' }); });

  /* ---- Preloader ---- */
  var pre = document.getElementById('preloader');
  if (pre) {
    var preDone = false;
    function hidePre() {
      if (preDone) return; preDone = true;
      pre.classList.add('done');
      setTimeout(function () { if (pre && pre.parentNode) pre.parentNode.removeChild(pre); }, 600);
    }
    if (document.readyState === 'complete') setTimeout(hidePre, 350);
    else window.addEventListener('load', function () { setTimeout(hidePre, 300); });
    setTimeout(hidePre, 3200); // safety net
  }

  /* ---- Page transition on internal links: disabled (instant navigation) ---- */
  window.addEventListener('pageshow', function (ev) { if (ev.persisted) document.body.classList.remove('is-leaving'); });

  /* ---- WhatsApp greeting bubble ---- */
  var fab = document.querySelector('.fab');
  if (fab && !sessionStorage.getItem('razas_greet')) {
    var g = document.createElement('div'); g.className = 'fab-greet';
    g.innerHTML = '<button class="fg-x" aria-label="Cerrar">&times;</button><strong>¡Hola! 👋</strong><span>¿Te ayudamos con tu mascota? Escríbenos por aquí.</span>';
    fab.appendChild(g);
    var greetT1 = setTimeout(function () { g.classList.add('show'); }, 3600);
    var greetT2 = setTimeout(function () { g.classList.remove('show'); }, 13000);
    g.querySelector('.fg-x').addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      g.classList.remove('show'); clearTimeout(greetT1); clearTimeout(greetT2);
      try { sessionStorage.setItem('razas_greet', '1'); } catch (e) {}
    });
  }

  /* ---- Personalization (tweaks) panel ---- */
  var tkBtn = document.createElement('button'); tkBtn.id = 'tk-btn'; tkBtn.setAttribute('aria-label', 'Personalizar apariencia');
  tkBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  var panel = document.createElement('div'); panel.id = 'tk-panel';
  panel.innerHTML =
    '<div class="tk-head"><b>Personalización</b><button class="tk-close" aria-label="Cerrar">&times;</button></div>' +
    '<div class="tk-row"><label>Color de acento</label><div class="tk-swatches">' +
      '<button class="tk-sw" data-accent="naranja" style="background:#F26522" title="Naranja"></button>' +
      '<button class="tk-sw" data-accent="terracota" style="background:#C2562F" title="Terracota"></button>' +
      '<button class="tk-sw" data-accent="ambar" style="background:#E08407" title="Ámbar"></button>' +
    '</div></div>' +
    '<div class="tk-row"><label>Animaciones</label><div class="tk-seg">' +
      '<button class="tk-opt" data-anim="on">Activadas</button>' +
      '<button class="tk-opt" data-anim="off">Reducidas</button>' +
    '</div></div>';
  document.body.appendChild(tkBtn); document.body.appendChild(panel);

  function syncTweakUI() {
    var acc = tweaks.accent || 'naranja';
    panel.querySelectorAll('.tk-sw').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-accent') === acc); });
    var anim = tweaks.anim === 'off' ? 'off' : 'on';
    panel.querySelectorAll('.tk-opt').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-anim') === anim); });
  }
  syncTweakUI();

  function togglePanel(open) { panel.classList.toggle('open', open === undefined ? !panel.classList.contains('open') : open); }
  tkBtn.addEventListener('click', function (e) { e.stopPropagation(); togglePanel(); });
  panel.querySelector('.tk-close').addEventListener('click', function () { togglePanel(false); });
  document.addEventListener('click', function (e) {
    if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== tkBtn) togglePanel(false);
  });
  panel.querySelectorAll('.tk-sw').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-accent'); applyAccent(k); tweaks.accent = k; saveTweaks(tweaks); syncTweakUI();
    });
  });
  panel.querySelectorAll('.tk-opt').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-anim');
      tweaks.anim = v; saveTweaks(tweaks);
      document.documentElement.classList.toggle('anim-off', v === 'off');
      if (v === 'off') { parallaxEls && parallaxEls.forEach(function (el) { el.style.transform = ''; }); }
      else { if (typeof requestParallax === 'function') requestParallax(); }
      syncTweakUI();
    });
  });

  /* ---- Typewriter rotator ---- */
  document.querySelectorAll('[data-typewriter]').forEach(function (el) {
    var words = (el.getAttribute('data-words') || '').split('|').filter(Boolean);
    if (words.length < 2) return;
    var wi = 0, ci = words[0].length, deleting = true;
    el.textContent = words[0];
    function tick() {
      if (animOffNow()) { el.textContent = words[wi]; setTimeout(tick, 1500); return; }
      var w = words[wi];
      if (!deleting) {
        ci++; el.textContent = w.slice(0, ci);
        if (ci >= w.length) { deleting = true; setTimeout(tick, 1500); return; }
        setTimeout(tick, 95);
      } else {
        ci--; el.textContent = w.slice(0, ci);
        if (ci <= 0) { deleting = false; wi = (wi + 1) % words.length; setTimeout(tick, 320); return; }
        setTimeout(tick, 45);
      }
    }
    setTimeout(tick, 1700);
  });

  /* ---- Paw trail (hero) ---- */
  var pawLayer = document.querySelector('[data-pawtrail]');
  if (pawLayer && window.matchMedia('(pointer:fine)').matches) {
    var pawHost = pawLayer.parentElement, lastPaw = 0;
    var PAW = '<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="6" cy="11" rx="2.2" ry="3"/><ellipse cx="11" cy="8" rx="2.2" ry="3"/><ellipse cx="16.5" cy="9" rx="2.2" ry="3"/><ellipse cx="20" cy="13.5" rx="1.8" ry="2.4"/><path d="M12 12c3 0 5 2 5 4.5 0 2-2 3-5 3s-5-1-5-3c0-2.5 2-4.5 5-4.5z"/></svg>';
    pawHost.addEventListener('mousemove', function (e) {
      if (animOffNow()) return;
      var now = Date.now(); if (now - lastPaw < 95) return; lastPaw = now;
      var r = pawHost.getBoundingClientRect();
      var p = document.createElement('span'); p.className = 'paw';
      p.style.left = (e.clientX - r.left) + 'px';
      p.style.top = (e.clientY - r.top) + 'px';
      p.style.setProperty('--r', (Math.random() * 60 - 30).toFixed(0) + 'deg');
      p.innerHTML = PAW;
      pawLayer.appendChild(p);
      setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 1100);
    });
  }

  /* ---- Carousel ---- */
  document.querySelectorAll('[data-carousel]').forEach(function (car) {
    var track = car.querySelector('.tc-track');
    if (!track) return;
    var n = track.children.length, idx = 0, timer = null;
    var dotsWrap = car.querySelector('.tc-dots');
    var nextBtn = car.querySelector('.tc-arrow.next'), prevBtn = car.querySelector('.tc-arrow.prev');
    var vp = car.querySelector('.tc-viewport');
    if (dotsWrap) {
      for (var i = 0; i < n; i++) {
        (function (i) {
          var d = document.createElement('button'); d.className = 'tc-dot' + (i === 0 ? ' active' : '');
          d.setAttribute('aria-label', 'Ir al testimonio ' + (i + 1));
          d.addEventListener('click', function () { go(i); restart(); });
          dotsWrap.appendChild(d);
        })(i);
      }
    }
    function go(i) {
      idx = (i + n) % n;
      track.style.transform = 'translateX(-' + (idx * 100) + '%)';
      if (dotsWrap) { var ds = dotsWrap.children, k; for (k = 0; k < ds.length; k++) ds[k].classList.toggle('active', k === idx); }
    }
    function auto() { if (animOffNow()) return; timer = setInterval(function () { go(idx + 1); }, 5500); }
    function restart() { if (timer) clearInterval(timer); auto(); }
    if (nextBtn) nextBtn.addEventListener('click', function () { go(idx + 1); restart(); });
    if (prevBtn) prevBtn.addEventListener('click', function () { go(idx - 1); restart(); });
    auto();
    var startX = 0, dx = 0, dragging = false, vw = 0;
    function down(x) { dragging = true; startX = x; dx = 0; vw = vp ? vp.offsetWidth : car.offsetWidth; track.classList.add('dragging'); if (timer) clearInterval(timer); }
    function move(x) { if (!dragging) return; dx = x - startX; track.style.transform = 'translateX(calc(-' + (idx * 100) + '% + ' + dx + 'px))'; }
    function up() { if (!dragging) return; dragging = false; track.classList.remove('dragging'); if (Math.abs(dx) > vw * 0.18) { go(idx + (dx < 0 ? 1 : -1)); } else { go(idx); } dx = 0; restart(); }
    track.addEventListener('mousedown', function (e) { e.preventDefault(); down(e.clientX); });
    window.addEventListener('mousemove', function (e) { if (dragging) move(e.clientX); });
    window.addEventListener('mouseup', up);
    track.addEventListener('touchstart', function (e) { down(e.touches[0].clientX); }, { passive: true });
    track.addEventListener('touchmove', function (e) { if (dragging) move(e.touches[0].clientX); }, { passive: true });
    track.addEventListener('touchend', up);
  });

  /* ---- Before / After slider ---- */
  document.querySelectorAll('[data-ba]').forEach(function (ba) {
    var handle = ba.querySelector('.ba-handle');
    if (!handle) return;
    var dragging = false;
    ba.style.setProperty('--ba-pos', '50%');
    function setPos(clientX) { var r = ba.getBoundingClientRect(); var x = (clientX - r.left) / r.width * 100; x = Math.max(2, Math.min(98, x)); ba.style.setProperty('--ba-pos', x + '%'); }
    function down(clientX) { dragging = true; ba.classList.add('dragging'); setPos(clientX); }
    function move(clientX) { if (!dragging) return; setPos(clientX); }
    function up() { dragging = false; ba.classList.remove('dragging'); }
    handle.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); down(e.clientX); });
    window.addEventListener('mousemove', function (e) { move(e.clientX); });
    window.addEventListener('mouseup', up);
    handle.addEventListener('touchstart', function (e) { e.stopPropagation(); down(e.touches[0].clientX); }, { passive: true });
    ba.addEventListener('touchmove', function (e) { if (dragging) move(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('touchend', up);
  });

  /* ---- Species filter ---- */
  var filterBar = document.querySelector('[data-species-filter]');
  if (filterBar) {
    var pills = filterBar.querySelectorAll('.fl-pill');
    var spRows = document.querySelectorAll('[data-species]');
    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        var f = pill.getAttribute('data-filter');
        pills.forEach(function (p) { p.classList.toggle('active', p === pill); });
        spRows.forEach(function (row) {
          var sp = row.getAttribute('data-species') || '';
          var match = (f === 'all') || sp.indexOf(f) > -1;
          row.classList.toggle('dimmed', !match);
        });
      });
    });
  }

  /* ---- Team flip cards ---- */
  document.querySelectorAll('.member').forEach(function (m) {
    var btn = m.querySelector('.m-flip-btn');
    var back = m.querySelector('.m-back');
    var photo = m.querySelector('.m-photo');
    if (btn) btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); m.classList.toggle('flipped'); });
    if (back) back.addEventListener('click', function () { m.classList.remove('flipped'); });
    if (photo) {
      ['dragenter', 'dragover'].forEach(function (ev) { photo.addEventListener(ev, function () { m.classList.add('no-flip'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { photo.addEventListener(ev, function () { setTimeout(function () { m.classList.remove('no-flip'); }, 500); }); });
    }
  });
})();
