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
          // NaN-safe: `|| 1` would clamp a legitimate min="0" (cart lines) to 1.
          const parsedMin = parseInt(this.input.min, 10);
          const parsedMax = parseInt(this.input.max, 10);
          const min = Number.isNaN(parsedMin) ? 1 : parsedMin;
          const max = Number.isNaN(parsedMax) ? Infinity : parsedMax;
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

  /* -------------------------------------------------------------- size guide */

  let sizeGuideBound = false;

  function initSizeGuide() {
    // Bound once: boot() runs again on every theme-editor section reload.
    if (sizeGuideBound) return;
    sizeGuideBound = true;

    document.addEventListener('click', (event) => {
      const opener = event.target.closest('[data-size-guide-open]');
      if (opener) {
        const dialog = document.getElementById(opener.getAttribute('aria-controls'));
        // No <dialog> support: a trigger that links to the page navigates instead.
        if (dialog && typeof dialog.showModal === 'function') {
          event.preventDefault();
          dialog.showModal();
        }
        return;
      }

      const closer = event.target.closest('[data-size-guide-close]');
      if (closer) {
        const dialog = closer.closest('dialog');
        if (dialog) dialog.close();
        return;
      }

      // Clicking the backdrop targets the dialog element itself.
      const dialog = event.target.closest('dialog[data-size-guide]');
      if (dialog && event.target === dialog) dialog.close();
    });
  }

  /* --------------------------------------------------------- blackjack popup */

  let blackjackBound = false;

  function isBlackjackLink(node) {
    if (!node || !node.getAttribute) return false;
    const href = node.getAttribute('href');
    if (!href) return false;
    // Match the page path only, so an anchor or query string still counts.
    return /\/pages\/blackjack(\/|\?|#|$)/.test(href);
  }

  function initBlackjackPopup() {
    if (blackjackBound) return;
    blackjackBound = true;

    document.addEventListener('click', (event) => {
      const closer = event.target.closest('[data-blackjack-close]');
      if (closer) {
        const dialog = closer.closest('dialog');
        if (dialog) dialog.close();
        return;
      }

      const backdrop = event.target.closest('dialog[data-blackjack-modal]');
      if (backdrop && event.target === backdrop) {
        backdrop.close();
        return;
      }

      // Any link to the game page opens the popup instead; without the popup
      // (or without <dialog> support) the click falls through to the page.
      const opener = event.target.closest('[data-blackjack-open], a[href]');
      if (!opener) return;
      if (!opener.hasAttribute('data-blackjack-open') && !isBlackjackLink(opener)) return;

      const modal = document.querySelector('dialog[data-blackjack-modal]');
      if (!modal || typeof modal.showModal !== 'function') return;

      event.preventDefault();
      modal.showModal();
    });
  }

  /* ---------------------------------------------- blackjack auto-open */

  let blackjackAutoBound = false;

  function blackjackSeenKey(frequency) {
    if (frequency !== 'day') return 'hog_bj_auto_session';
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return 'hog_bj_auto_' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
  }

  function blackjackAlreadySeen(frequency) {
    const key = blackjackSeenKey(frequency);
    try {
      const store = frequency === 'day' ? window.localStorage : window.sessionStorage;
      return store.getItem(key) === '1';
    } catch (error) {
      // Private mode: treat as seen so the popup never nags in a loop.
      return true;
    }
  }

  function markBlackjackSeen(frequency) {
    try {
      const store = frequency === 'day' ? window.localStorage : window.sessionStorage;
      store.setItem(blackjackSeenKey(frequency), '1');
    } catch (error) {
      /* nothing to do — the in-page guard still holds for this pageview */
    }
  }

  /**
   * Has the visitor already used today's hands? Offering a game they cannot
   * play is worse than not asking, so read the counter blackjack.js keeps.
   */
  function blackjackOutOfPlays(playsPerDay) {
    try {
      const raw = window.localStorage.getItem('hog_blackjack');
      if (!raw) return false;
      const state = JSON.parse(raw);
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
      if (state.d !== today) return false;
      return (state.plays || 0) >= playsPerDay;
    } catch (error) {
      return false;
    }
  }

  function initBlackjackAutoOpen() {
    if (blackjackAutoBound) return;

    const modal = document.querySelector('dialog[data-blackjack-modal][data-auto-open]');
    if (!modal || typeof modal.showModal !== 'function') return;

    const frequency = modal.dataset.autoFrequency === 'day' ? 'day' : 'session';
    const threshold = parseInt(modal.dataset.autoScroll, 10) || 50;
    const delay = (parseInt(modal.dataset.autoDelay, 10) || 0) * 1000;
    const playsPerDay = parseInt(modal.dataset.playsPerDay, 10) || 3;

    if (blackjackAlreadySeen(frequency) || blackjackOutOfPlays(playsPerDay)) return;

    blackjackAutoBound = true;
    const startedAt = Date.now();
    let fired = false;

    // Closing it counts as an answer: never re-open in this window.
    modal.addEventListener('close', () => markBlackjackSeen(frequency));

    function maybeOpen() {
      if (fired) return;
      if (Date.now() - startedAt < delay) return;

      // Never interrupt a dialog or the cart drawer already on screen.
      if (document.querySelector('dialog[open]')) return;
      const drawer = document.querySelector('cart-drawer.is-open, .menu-drawer.is-open');
      if (drawer) return;

      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      if (percent < threshold) return;

      fired = true;
      window.removeEventListener('scroll', onScroll);
      markBlackjackSeen(frequency);
      modal.showModal();
    }

    function onScroll() {
      window.requestAnimationFrame(maybeOpen);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------ boot */

  function boot() {
    initReveal();
    initGalleries();
    initDetailsDismiss();
    initSizeGuide();
    initBlackjackPopup();
    initBlackjackAutoOpen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // The theme editor tears down and rebuilds sections; re-run the observers.
  document.addEventListener('shopify:section:load', boot);
})();
