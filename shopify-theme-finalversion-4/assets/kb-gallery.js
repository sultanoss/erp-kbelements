(function() {
  'use strict';
  var images = [], currentIndex = 0;
  var lightbox, thumbsEl, prevBtn, nextBtn, counterEl, startX = 0;
  var isOpen = false;

  function optimizedImageUrl(src, width) {
    try {
      var url = new URL(src, window.location.origin);
      if (url.hostname.indexOf('cdn.shopify.com') !== -1) {
        url.searchParams.set('width', String(width));
      }
      return url.toString();
    } catch (error) {
      return src;
    }
  }

  function preloadAround(index) {
    [index - 1, index + 1].forEach(function(i) {
      if (!images[i]) return;
      var preload = new Image();
      preload.src = images[i].src;
    });
  }

  function buildLightbox() {
    if (document.getElementById('kb-lightbox')) return;
    var el = document.createElement('div');
    el.id = 'kb-lightbox';
    el.innerHTML = [
      '<div id="kb-lightbox-header">',
        '<span id="kb-lightbox-counter"></span>',
        '<button id="kb-lightbox-close">&times;</button>',
      '</div>',
      '<div id="kb-lightbox-main">',
        '<div id="kb-lightbox-img-wrap">',
          '<button class="kb-lightbox-arrow hidden" id="kb-lightbox-prev">',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
          '</button>',
          '<img id="kb-lightbox-img" src="" alt="" draggable="false">',
          '<button class="kb-lightbox-arrow hidden" id="kb-lightbox-next">',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
          '</button>',
        '</div>',
      '</div>',
      '<div id="kb-lightbox-thumbs"></div>'
    ].join('');
    document.body.appendChild(el);

    lightbox  = el;
    thumbsEl  = el.querySelector('#kb-lightbox-thumbs');
    prevBtn   = el.querySelector('#kb-lightbox-prev');
    nextBtn   = el.querySelector('#kb-lightbox-next');
    counterEl = el.querySelector('#kb-lightbox-counter');

    // Alle Klicks innerhalb der Lightbox stoppen Propagation
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      var t = e.target;
      if (t.id === 'kb-lightbox-close' || t.closest('#kb-lightbox-close')) { closeLightbox(); return; }
      if (t.id === 'kb-lightbox-prev' || t.closest('#kb-lightbox-prev')) { navigate(-1); return; }
      if (t.id === 'kb-lightbox-next' || t.closest('#kb-lightbox-next')) { navigate(1); return; }
      var thumb = t.closest('.kb-lightbox-thumb');
      if (thumb) { goTo(Array.from(thumbsEl.querySelectorAll('.kb-lightbox-thumb')).indexOf(thumb)); return; }
      // Klick auf dunklen Hintergrund (nicht auf Bild)
      if (t.id === 'kb-lightbox' || t.id === 'kb-lightbox-main') { closeLightbox(); }
    });

    document.addEventListener('keydown', function(e) {
      if (!isOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    });

    var wrap = el.querySelector('#kb-lightbox-img-wrap');
    wrap.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener('touchend', function(e) {
      var diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) navigate(diff > 0 ? 1 : -1);
    }, { passive: true });
  }

  function collectImages() {
    var imgs = [];
    document.querySelectorAll('.slideshow-control.button-unstyled[aria-label*="Folie"]').forEach(function(btn) {
      var img = btn.querySelector('img');
      if (img) imgs.push({ src: optimizedImageUrl(img.currentSrc || img.src, 1600), alt: img.alt || '' });
    });
    if (!imgs.length) {
      var seen = {};
      document.querySelectorAll('.product-media-container img').forEach(function(img) {
        var src = optimizedImageUrl(img.currentSrc || img.src || '', 1600);
        if (src && !seen[src]) { seen[src] = true; imgs.push({ src: src, alt: img.alt || '' }); }
      });
    }
    return imgs;
  }

  function buildThumbs() {
    thumbsEl.innerHTML = '';
    images.forEach(function(item, i) {
      var div = document.createElement('div');
      div.className = 'kb-lightbox-thumb' + (i === currentIndex ? ' active' : '');
      div.innerHTML = '<img src="' + optimizedImageUrl(item.src, 160) + '" alt="" loading="lazy">';
      thumbsEl.appendChild(div);
    });
  }

  function updateDisplay() {
    var img = lightbox.querySelector('#kb-lightbox-img');
    var nextSrc = images[currentIndex].src;
    if (img.src !== nextSrc) {
      img.style.opacity = '0';
      img.onload = function() { img.style.opacity = '1'; };
      img.src = nextSrc;
      if (img.complete) img.style.opacity = '1';
    } else {
      img.style.opacity = '1';
    }
    preloadAround(currentIndex);
    prevBtn.classList.toggle('hidden', currentIndex === 0);
    nextBtn.classList.toggle('hidden', currentIndex === images.length - 1);
    counterEl.textContent = (currentIndex + 1) + ' / ' + images.length;
    var thumbs = thumbsEl.querySelectorAll('.kb-lightbox-thumb');
    thumbs.forEach(function(t, i) { t.classList.toggle('active', i === currentIndex); });
    if (thumbs[currentIndex]) thumbs[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  function goTo(i) { currentIndex = Math.max(0, Math.min(images.length - 1, i)); updateDisplay(); }
  function navigate(dir) { goTo(currentIndex + dir); }

  function openLightbox(idx) {
    images = collectImages();
    if (!images.length) return;
    currentIndex = Math.max(0, Math.min(images.length - 1, idx));
    buildThumbs();
    updateDisplay();
    lightbox.style.display = 'flex';
    isOpen = true;
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { lightbox.classList.add('open'); });
    });
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    isOpen = false;
    lightbox.classList.remove('open');
    setTimeout(function() { lightbox.style.display = 'none'; }, 250);
    document.body.style.overflow = '';
  }

  function init() {
    buildLightbox();
    document.querySelectorAll('zoom-dialog').forEach(function(z) { z.style.display = 'none'; });

    // Klick auf Produktbild öffnet Lightbox
    // Capture-Phase abfangen, dann sofort stoppen
    document.addEventListener('click', function(e) {
      // Wenn Lightbox offen: nichts tun (der interne Handler kuemmert sich)
      if (isOpen) return;
      var mc = e.target.closest('.product-media-container, [data-product-media-type-image]');
      if (!mc) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var all = Array.from(document.querySelectorAll('.product-media-container'));
      openLightbox(Math.max(0, all.indexOf(mc)));
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
