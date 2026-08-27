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

  /**
   * Format cents according to the shop's money format, honouring the
   * placeholder name Shopify puts in it (amount, amount_no_decimals,
   * amount_with_comma_separator, …).
   */
  function formatMoney(cents, format) {
    const fmt = format || (window.theme && window.theme.moneyFormat) || '${{amount}}';

    function delimit(number, precision, thousands, decimal) {
      const parts = (number / 100).toFixed(precision).split('.');
      const whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return parts[1] ? whole + decimal + parts[1] : whole;
    }

    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, (match, placeholder) => {
      switch (placeholder) {
        case 'amount_no_decimals':
          return delimit(cents, 0, ',', '.');
        case 'amount_with_comma_separator':
          return delimit(cents, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator':
          return delimit(cents, 0, '.', ',');
        case 'amount_with_apostrophe_separator':
          return delimit(cents, 2, "'", '.');
        case 'amount_with_space_separator':
          return delimit(cents, 2, ' ', ',');
        case 'amount_no_decimals_with_space_separator':
          return delimit(cents, 0, ' ', ',');
        case 'amount_with_period_and_space_separator':
          return delimit(cents, 2, ' ', '.');
        default:
          return delimit(cents, 2, ',', '.');
      }
    });
  }

  window.HOG = Object.assign(window.HOG || {}, { trapFocus, lockScroll, announce, formatMoney });

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
