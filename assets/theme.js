/* ==========================================================================
   House of Garments — theme.js
   Global behaviour: mobile nav, announcement rotation, reveal-on-scroll,
   quantity inputs, and the drop countdown.

   No dependencies. Everything degrades: if this file fails to load, the
   storefront still renders, navigates and checks out.
   ========================================================================== */

(function () {
  'use strict';

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- utils */

  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function trapFocus(container, onEscape) {
    const nodes = Array.from(container.querySelectorAll(focusableSelector)).filter(
      (node) => node.offsetParent !== null
    );
    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    function handler(event) {
      if (event.key === 'Escape') {
        onEscape();
        return;
      }
      if (event.key !== 'Tab' || nodes.length === 0) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', handler);
    if (first) first.focus();

    return function release() {
      container.removeEventListener('keydown', handler);
    };
  }

  function lockScroll(locked) {
    document.body.classList.toggle('is-locked', locked);
  }

  function announce(message) {
    const region = document.getElementById('LiveRegion');
    if (!region) return;
    region.textContent = '';
    window.setTimeout(() => {
      region.textContent = message;
    }, 60);
  }

  window.HOG = Object.assign(window.HOG || {}, { trapFocus, lockScroll, announce });

  /* --------------------------------------------------------- <menu-drawer> */

  class MenuDrawer extends HTMLElement {
    connectedCallback() {
      this.drawer = this.querySelector('.menu-drawer');
      this.toggle = this.querySelector('[data-menu-open]');
      this.closeBtn = this.querySelector('[data-menu-close]');
      this.releaseFocus = null;

      if (!this.drawer || !this.toggle) return;

      this.toggle.addEventListener('click', () => this.open());
      if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());

      this.drawer.addEventListener('click', (event) => {
        if (event.target === this.drawer) this.close();
      });
    }

    open() {
      this.drawer.classList.add('is-open');
      this.toggle.setAttribute('aria-expanded', 'true');
      lockScroll(true);
      this.releaseFocus = trapFocus(this.drawer, () => this.close());
    }

    close() {
      this.drawer.classList.remove('is-open');
      this.toggle.setAttribute('aria-expanded', 'false');
      lockScroll(false);
      if (this.releaseFocus) this.releaseFocus();
      this.toggle.focus();
    }
  }

  if (!customElements.get('menu-drawer')) {
    customElements.define('menu-drawer', MenuDrawer);
  }

  /* ------------------------------------------------ <announcement-rotator> */

  class AnnouncementRotator extends HTMLElement {
    connectedCallback() {
      this.items = Array.from(this.querySelectorAll('.announcement-bar__item'));
      if (this.items.length < 2 || REDUCED_MOTION) return;

      const seconds = parseInt(this.dataset.speed, 10) || 5;
      this.index = 0;
      this.timer = window.setInterval(() => this.next(), seconds * 1000);

      this.addEventListener('mouseenter', () => window.clearInterval(this.timer));
    }

    disconnectedCallback() {
      window.clearInterval(this.timer);
    }

    next() {
      this.items[this.index].hidden = true;
      this.index = (this.index + 1) % this.items.length;
      this.items[this.index].hidden = false;
    }
  }

  if (!customElements.get('announcement-rotator')) {
    customElements.define('announcement-rotator', AnnouncementRotator);
  }

  /* ------------------------------------------------------ <countdown-timer> */

  class CountdownTimer extends HTMLElement {
    connectedCallback() {
      const target = this.dataset.date;
      if (!target) return;

      this.target = new Date(target).getTime();
      if (Number.isNaN(this.target)) return;

      this.outputs = {
        days: this.querySelector('[data-days]'),
        hours: this.querySelector('[data-hours]'),
        minutes: this.querySelector('[data-minutes]'),
        seconds: this.querySelector('[data-seconds]')
      };

      this.tick();
      this.timer = window.setInterval(() => this.tick(), 1000);
    }

    disconnectedCallback() {
      window.clearInterval(this.timer);
    }

    tick() {
      const remaining = this.target - Date.now();

      if (remaining <= 0) {
        window.clearInterval(this.timer);
        this.dispatchEvent(new CustomEvent('countdown:complete', { bubbles: true }));
        this.classList.add('is-live');
        const live = this.querySelector('[data-live-message]');
        if (live) live.hidden = false;
        const grid = this.querySelector('.countdown');
        if (grid) grid.hidden = true;
        return;
      }

      const seconds = Math.floor(remaining / 1000);
      const pad = (value) => String(value).padStart(2, '0');

      this.set('days', Math.floor(seconds / 86400));
      this.set('hours', pad(Math.floor(seconds / 3600) % 24));
      this.set('minutes', pad(Math.floor(seconds / 60) % 60));
      this.set('seconds', pad(seconds % 60));
    }

    set(key, value) {
      if (this.outputs[key]) this.outputs[key].textContent = value;
    }
  }

  if (!customElements.get('countdown-timer')) {
    customElements.define('countdown-timer', CountdownTimer);
  }

  /* ------------------------------------------------------ <quantity-input> */

  class QuantityInput extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('input');
      if (!this.input) return;

      this.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          const step = button.dataset.action === 'increase' ? 1 : -1;
          const min = parseInt(this.input.min, 10) || 1;
          const max = parseInt(this.input.max, 10) || Infinity;
          const next = Math.min(max, Math.max(min, (parseInt(this.input.value, 10) || min) + step));
          this.input.value = next;
          this.input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    }
  }

  if (!customElements.get('quantity-input')) {
    customElements.define('quantity-input', QuantityInput);
  }

  /* ----------------------------------------------------------------- modal */

  // Generic dialog. Openers carry data-modal-open="<id>"; anything inside the
  // modal with data-modal-close dismisses it, as do Escape and the overlay.

  const modalState = { release: null, opener: null, current: null };

  function openModal(modal, opener) {
    if (!modal || modalState.current === modal) return;
    closeModal(modalState.current);

    modal.hidden = false;
    // Two frames so the transition runs after display flips from none.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => modal.classList.add('is-open'));
    });

    modalState.current = modal;
    modalState.opener = opener || null;
    lockScroll(true);
    modalState.release = trapFocus(modal.querySelector('.modal__panel') || modal, () =>
      closeModal(modal)
    );
  }

  function closeModal(modal) {
    if (!modal || modalState.current !== modal) return;

    modal.classList.remove('is-open');
    // Let the exit transition finish before display: none kicks in; the
    // guard aborts the hide if the modal was reopened meanwhile.
    window.setTimeout(() => {
      if (modalState.current !== modal) modal.hidden = true;
    }, REDUCED_MOTION ? 0 : 220);

    modalState.current = null;
    lockScroll(false);
    if (modalState.release) modalState.release();
    modalState.release = null;
    if (modalState.opener && document.body.contains(modalState.opener)) {
      modalState.opener.focus();
    }
    modalState.opener = null;
  }

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-modal-open]');
    if (opener) {
      openModal(document.getElementById(opener.dataset.modalOpen), opener);
      return;
    }

    const closer = event.target.closest('[data-modal-close]');
    if (closer) closeModal(closer.closest('[data-modal]'));
  });

  // The theme editor re-renders a section while its modal is open: the node
  // vanishes, so release the scroll lock and trap state it left behind.
  document.addEventListener('shopify:section:unload', () => {
    if (modalState.current && !document.body.contains(modalState.current)) {
      modalState.current = null;
      modalState.opener = null;
      lockScroll(false);
      if (modalState.release) modalState.release();
      modalState.release = null;
    }
  });

  window.HOG = Object.assign(window.HOG || {}, { openModal, closeModal });

  /* ----------------------------------------------------------- <video-strip> */

  // Videos play muted while at least 40% visible and pause off-screen. One
  // video can be unmuted at a time; arrows page the strip on desktop.

  class VideoStrip extends HTMLElement {
    connectedCallback() {
      // The theme editor can detach and re-attach the element; abort the old
      // bindings first so listeners and observers never stack.
      this.teardown();
      this.abort = new AbortController();
      const { signal } = this.abort;

      this.track = this.querySelector('[data-strip-track]');
      this.videos = Array.from(this.querySelectorAll('video'));
      this.autoplay = this.dataset.autoplay === 'true' && !REDUCED_MOTION;

      if (this.autoplay && 'IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                if (entry.target.dataset.userPaused !== 'true') {
                  entry.target.play().catch(() => {});
                }
              } else {
                entry.target.pause();
              }
            });
          },
          { threshold: 0.4 }
        );
        this.videos.forEach((video) => this.observer.observe(video));
      }

      // Play/pause is always available — it is the only way to start
      // playback when autoplay is off or the visitor prefers reduced motion.
      this.querySelectorAll('[data-play-toggle]').forEach((button) => {
        button.addEventListener('click', () => this.togglePlay(button), { signal });
      });

      this.videos.forEach((video) => {
        video.addEventListener('play', () => this.reflectPlayState(video, true), { signal });
        video.addEventListener('pause', () => this.reflectPlayState(video, false), { signal });
      });

      this.querySelectorAll('[data-sound-toggle]').forEach((button) => {
        button.addEventListener('click', () => this.toggleSound(button), { signal });
      });

      const prev = this.parentElement.querySelector('[data-strip-prev]');
      const next = this.parentElement.querySelector('[data-strip-next]');
      if (prev) prev.addEventListener('click', () => this.page(-1), { signal });
      if (next) next.addEventListener('click', () => this.page(1), { signal });
    }

    disconnectedCallback() {
      this.teardown();
    }

    teardown() {
      if (this.observer) this.observer.disconnect();
      this.observer = null;
      if (this.abort) this.abort.abort();
      this.abort = null;
    }

    togglePlay(button) {
      const item = button.closest('[data-strip-item]');
      const video = item && item.querySelector('video');
      if (!video) return;

      if (video.paused) {
        delete video.dataset.userPaused;
        video.play().catch(() => {});
      } else {
        // Remember the choice so the autoplay observer doesn't restart it.
        video.dataset.userPaused = 'true';
        video.pause();
      }
    }

    reflectPlayState(video, playing) {
      const item = video.closest('[data-strip-item]');
      const button = item && item.querySelector('[data-play-toggle]');
      if (!button) return;

      const strings = (window.theme && window.theme.strings) || {};
      button.setAttribute(
        'aria-label',
        playing ? strings.pauseVideo || 'Pause video' : strings.playVideo || 'Play video'
      );
      const playIcon = button.querySelector('.video-strip__play-icon');
      const pauseIcon = button.querySelector('.video-strip__pause-icon');
      if (playIcon) playIcon.hidden = playing;
      if (pauseIcon) pauseIcon.hidden = !playing;
    }

    toggleSound(button) {
      const item = button.closest('[data-strip-item]');
      const video = item && item.querySelector('video');
      if (!video) return;

      const unmuting = video.muted;

      // Only one voice at a time.
      this.querySelectorAll('[data-sound-toggle]').forEach((other) => {
        if (other !== button) this.setSound(other, false);
      });

      this.setSound(button, unmuting);
      if (unmuting) {
        delete video.dataset.userPaused;
        video.play().catch(() => {});
      }
    }

    setSound(button, on) {
      const item = button.closest('[data-strip-item]');
      const video = item && item.querySelector('video');
      if (!video) return;

      // The label stays constant — aria-pressed carries the state.
      video.muted = !on;
      button.setAttribute('aria-pressed', String(on));
      const offIcon = button.querySelector('.video-strip__sound-off');
      const onIcon = button.querySelector('.video-strip__sound-on');
      if (offIcon) offIcon.hidden = on;
      if (onIcon) onIcon.hidden = !on;
    }

    page(direction) {
      if (!this.track) return;
      const item = this.track.querySelector('[data-strip-item]');
      const step = item ? item.getBoundingClientRect().width + 16 : this.track.clientWidth;
      this.track.scrollBy({
        left: step * direction,
        behavior: REDUCED_MOTION ? 'auto' : 'smooth'
      });
    }
  }

  if (!customElements.get('video-strip')) {
    customElements.define('video-strip', VideoStrip);
  }

  /* ------------------------------------------- <product-recommendations> */

  // Fetches its own section back from the recommendations endpoint once it
  // nears the viewport, then swaps in the rendered grid. Stays empty on
  // failure — the product page works without it.

  class ProductRecommendations extends HTMLElement {
    connectedCallback() {
      const url = this.dataset.url;
      if (!url || this.dataset.loaded === 'true') return;

      const load = async () => {
        // Reconnection can leave two live observers; only the first wins.
        if (this.dataset.loaded === 'true') return;
        this.dataset.loaded = 'true';
        try {
          const response = await fetch(url);
          const text = await response.text();
          const parsed = new DOMParser().parseFromString(text, 'text/html');
          const fresh = parsed.querySelector('product-recommendations');
          if (fresh && fresh.innerHTML.trim().length) {
            this.innerHTML = fresh.innerHTML;
            this.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
          }
        } catch (error) {
          // Recommendations are decoration; never surface a failure.
        }
      };

      if ('IntersectionObserver' in window) {
        if (this.observer) this.observer.disconnect();
        this.observer = new IntersectionObserver(
          (entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            this.observer.disconnect();
            load();
          },
          { rootMargin: '0px 0px 400px 0px' }
        );
        this.observer.observe(this);
      } else {
        load();
      }
    }

    disconnectedCallback() {
      if (this.observer) this.observer.disconnect();
      this.observer = null;
    }
  }

  if (!customElements.get('product-recommendations')) {
    customElements.define('product-recommendations', ProductRecommendations);
  }

  /* ------------------------------------------------------ reveal on scroll */

  function initReveal() {
    if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------- product gallery */

  function initGalleries() {
    document.querySelectorAll('[data-gallery]').forEach((gallery) => {
      const thumbs = gallery.querySelectorAll('[data-thumb]');
      const mediaItems = gallery.querySelectorAll('[data-media-id]');

      thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const id = thumb.dataset.thumb;
          thumbs.forEach((node) => node.setAttribute('aria-current', String(node === thumb)));
          mediaItems.forEach((media) => {
            if (media.dataset.mediaId !== id) return;
            media.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'center' });
          });
        });
      });
    });
  }

  /* ------------------------------------------ close details on outside click */

  function initDetailsDismiss() {
    document.addEventListener('click', (event) => {
      document.querySelectorAll('details[data-dismissible][open]').forEach((details) => {
        if (!details.contains(event.target)) details.removeAttribute('open');
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('details[data-dismissible][open]').forEach((details) => {
        details.removeAttribute('open');
        const summary = details.querySelector('summary');
        if (summary) summary.focus();
      });
    });
  }

  /* ------------------------------------------------------------------ boot */

  function boot() {
    initReveal();
    initGalleries();
    initDetailsDismiss();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // The theme editor tears down and rebuilds sections; re-run the observers.
  document.addEventListener('shopify:section:load', boot);
})();
