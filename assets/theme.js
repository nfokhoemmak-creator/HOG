/* ==========================================================================
   Shark Bite — theme.js
   Global helpers (window.SB), menu drawer, announcement rotator, quantity
   inputs, modals, reveal-on-scroll, dismissible details and the WhatsApp FAB.

   Vanilla JS, no dependencies. Everything here is progressive enhancement:
   if this file never runs the storefront still renders, navigates and
   checks out through plain links and forms.
   ========================================================================== */

(function () {
  'use strict';

  // Reveal-on-scroll content is only hidden once this script is running.
  document.documentElement.classList.add('sb-reveal');

  const theme = window.theme || {};
  const strings = theme.strings || {};
  const REDUCED_MOTION =
    !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- helpers */

  const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function focusableIn(container) {
    return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
      (node) => node.offsetParent !== null || node === document.activeElement
    );
  }

  /**
   * Keeps Tab / Shift+Tab inside `container` and calls `onEscape` on Escape.
   * Focuses `[autofocus]` or the first focusable node and returns a release
   * function. Restoring focus to the opener is the caller's job so each
   * component decides where focus lands.
   */
  function trapFocus(container, onEscape) {
    if (!container) return () => {};

    function handler(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (typeof onEscape === 'function') onEscape();
        return;
      }
      if (event.key !== 'Tab') return;

      const nodes = focusableIn(container);
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const outside = !container.contains(document.activeElement);

      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', handler);

    const initial = container.querySelector('[autofocus]') || focusableIn(container)[0];
    if (initial) {
      window.requestAnimationFrame(() => initial.focus({ preventScroll: true }));
    }

    return function release() {
      container.removeEventListener('keydown', handler);
    };
  }

  let scrollLocks = 0;
  let savedPadding = '';

  function lockScroll(locked) {
    const root = document.documentElement;
    if (locked) {
      scrollLocks += 1;
      if (scrollLocks > 1) return;
      const gap = window.innerWidth - root.clientWidth;
      savedPadding = document.body.style.paddingRight;
      if (gap > 0) document.body.style.paddingRight = `${gap}px`;
      root.classList.add('is-locked');
      root.style.overflow = 'hidden';
    } else {
      scrollLocks = Math.max(0, scrollLocks - 1);
      if (scrollLocks > 0) return;
      root.classList.remove('is-locked');
      root.style.overflow = '';
      document.body.style.paddingRight = savedPadding;
    }
  }

  function announce(text) {
    let region = document.getElementById('LiveRegion');
    if (!region) {
      region = document.createElement('div');
      region.id = 'LiveRegion';
      region.className = 'visually-hidden';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('role', 'status');
      document.body.appendChild(region);
    }
    region.textContent = '';
    window.setTimeout(() => {
      region.textContent = text || '';
    }, 60);
  }

  /**
   * Shopify money formatting. Supports the standard placeholders. With
   * { trailingZeros: false } whole amounts drop their cents ("$30", not "$30.00").
   */
  function formatMoney(cents, options = {}) {
    const trailingZeros = options.trailingZeros !== false;
    const format = options.format || theme.moneyFormat || '${{amount}}';
    let amount = Number(cents);
    if (Number.isNaN(amount)) amount = 0;
    amount /= 100;

    function group(number, thousands, decimal, precision) {
      const parts = Math.abs(number).toFixed(precision).split('.');
      const whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      let fraction = parts[1] ? decimal + parts[1] : '';
      if (!trailingZeros && parts[1] && /^0+$/.test(parts[1])) fraction = '';
      return (number < 0 ? '-' : '') + whole + fraction;
    }

    const match = /\{\{\s*(\w+)\s*\}\}/.exec(format);
    const placeholder = match ? match[1] : 'amount';
    let value;

    switch (placeholder) {
      case 'amount_no_decimals':
        value = group(amount, ',', '.', 0);
        break;
      case 'amount_with_comma_separator':
        value = group(amount, '.', ',', 2);
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = group(amount, '.', ',', 0);
        break;
      case 'amount_with_apostrophe_separator':
        value = group(amount, "'", '.', 2);
        break;
      default:
        value = group(amount, ',', '.', 2);
    }

    return format.replace(/\{\{\s*\w+\s*\}\}/, value);
  }

  function debounce(fn, wait) {
    let timer;
    return function debounced(...args) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(this, args), wait);
    };
  }

  window.SB = Object.assign(window.SB || {}, {
    trapFocus,
    lockScroll,
    announce,
    formatMoney,
    debounce,
    reducedMotion: REDUCED_MOTION,
    strings
  });

  /* -------------------------------------------------------- <menu-drawer> */

  class MenuDrawer extends HTMLElement {
    connectedCallback() {
      this.panel = this.querySelector('[data-menu-panel]');
      this.overlay = this.querySelector('[data-menu-overlay]');
      this.toggle = this.querySelector('[data-menu-open]');
      this.releaseFocus = null;
      this.isOpen = false;

      if (!this.panel || !this.toggle) return;

      this.toggle.addEventListener('click', (event) => {
        event.preventDefault();
        if (this.isOpen) this.close();
        else this.open();
      });

      this.querySelectorAll('[data-menu-close]').forEach((button) => {
        button.addEventListener('click', () => this.close());
      });

      if (this.overlay) this.overlay.addEventListener('click', () => this.close());

      // Close when the viewport grows past the mobile breakpoint so the scroll
      // lock never lingers once the desktop nav takes over.
      const mql = window.matchMedia('(min-width: 990px)');
      const onChange = (event) => {
        if (event.matches && this.isOpen) this.close();
      };
      if (mql.addEventListener) mql.addEventListener('change', onChange);
      else if (mql.addListener) mql.addListener(onChange);
    }

    disconnectedCallback() {
      if (this.isOpen) this.close();
    }

    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      this.classList.add('is-open');
      this.panel.removeAttribute('hidden');
      this.panel.setAttribute('aria-hidden', 'false');
      this.toggle.setAttribute('aria-expanded', 'true');
      lockScroll(true);
      this.releaseFocus = trapFocus(this.panel, () => this.close());
      document.dispatchEvent(new CustomEvent('menu:open'));
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.classList.remove('is-open');
      this.panel.setAttribute('aria-hidden', 'true');
      this.toggle.setAttribute('aria-expanded', 'false');
      lockScroll(false);
      if (this.releaseFocus) this.releaseFocus();
      this.releaseFocus = null;
      window.setTimeout(() => {
        if (!this.isOpen) this.panel.setAttribute('hidden', '');
      }, REDUCED_MOTION ? 0 : 250);
      this.toggle.focus();
      document.dispatchEvent(new CustomEvent('menu:close'));
    }
  }

  if (!customElements.get('menu-drawer')) customElements.define('menu-drawer', MenuDrawer);

  /* ------------------------------------------------ <announcement-rotator> */

  class AnnouncementRotator extends HTMLElement {
    connectedCallback() {
      this.items = Array.from(this.querySelectorAll('[data-announcement-item]'));
      this.index = 0;
      this.timer = null;

      if (this.items.length < 2) {
        this.items.forEach((item) => item.removeAttribute('hidden'));
        return;
      }

      // Server renders every block visible for the no-JS case; with JS we
      // show one at a time.
      this.items.forEach((item, i) => {
        if (i === this.index) item.removeAttribute('hidden');
        else item.setAttribute('hidden', '');
      });

      const prev = this.querySelector('[data-announcement-prev]');
      const next = this.querySelector('[data-announcement-next]');
      [prev, next].forEach((button, i) => {
        if (!button) return;
        button.removeAttribute('hidden');
        button.addEventListener('click', () => {
          this.go(i === 0 ? -1 : 1);
          this.restart();
        });
      });

      this.autoplay = this.hasAttribute('data-autoplay') && !REDUCED_MOTION;
      this.speed = (parseInt(this.getAttribute('data-speed'), 10) || 5) * 1000;

      this.addEventListener('mouseenter', () => this.stop());
      this.addEventListener('mouseleave', () => this.start());
      this.addEventListener('focusin', () => this.stop());
      this.addEventListener('focusout', () => this.start());
      this.onVisibility = () => (document.hidden ? this.stop() : this.start());
      document.addEventListener('visibilitychange', this.onVisibility);

      this.start();
    }

    disconnectedCallback() {
      this.stop();
      if (this.onVisibility) document.removeEventListener('visibilitychange', this.onVisibility);
    }

    start() {
      if (!this.autoplay || this.timer) return;
      this.timer = window.setInterval(() => this.go(1), this.speed);
    }

    stop() {
      window.clearInterval(this.timer);
      this.timer = null;
    }

    restart() {
      this.stop();
      this.start();
    }

    go(step) {
      const count = this.items.length;
      this.items[this.index].setAttribute('hidden', '');
      this.index = (this.index + step + count) % count;
      this.items[this.index].removeAttribute('hidden');
    }
  }

  if (!customElements.get('announcement-rotator')) {
    customElements.define('announcement-rotator', AnnouncementRotator);
  }

  /* ------------------------------------------------------ <quantity-input> */

  class QuantityInput extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('input');
      if (!this.input) return;

      this.querySelectorAll('[data-action]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          const step = button.getAttribute('data-action') === 'increase' ? 1 : -1;
          this.setValue((parseInt(this.input.value, 10) || 0) + step);
        });
      });

      this.input.addEventListener('change', () => this.setValue(parseInt(this.input.value, 10), true));
      this.sync();
    }

    bounds() {
      const min = parseInt(this.input.getAttribute('min'), 10);
      const max = parseInt(this.input.getAttribute('max'), 10);
      return {
        min: Number.isNaN(min) ? 0 : min,
        max: Number.isNaN(max) ? Infinity : max
      };
    }

    setValue(value, fromInput) {
      const limits = this.bounds();
      const current = parseInt(this.input.value, 10);
      let next = Number.isNaN(value) ? limits.min : value;
      next = Math.min(limits.max, Math.max(limits.min, next));
      const changed = next !== current;
      this.input.value = next;
      this.sync();
      // A button click must notify listeners. A manual edit already fired
      // `change` (still propagating; the clamped value is written to the input
      // before ancestors read it), so never re-dispatch for it — a nested
      // event would reach the cart listeners twice for the same line.
      if (changed && !fromInput) {
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    sync() {
      const limits = this.bounds();
      const value = parseInt(this.input.value, 10) || 0;
      const decrease = this.querySelector('[data-action="decrease"]');
      const increase = this.querySelector('[data-action="increase"]');
      // Cart lines allow 0 (= remove); the product form's min is 1.
      if (decrease) decrease.disabled = value <= limits.min;
      if (increase) increase.disabled = value >= limits.max;
    }
  }

  if (!customElements.get('quantity-input')) customElements.define('quantity-input', QuantityInput);

  /* ------------------------------------------------------------ <sb-modal> */

  class SBModal extends HTMLElement {
    connectedCallback() {
      this.panel = this.querySelector('.modal__panel') || this;
      this.releaseFocus = null;
      this.opener = null;

      if (!this.hasAttribute('role')) this.setAttribute('role', 'dialog');
      this.setAttribute('aria-modal', 'true');

      this.addEventListener('click', (event) => {
        if (event.target.closest('[data-modal-close]')) {
          event.preventDefault();
          this.close();
          return;
        }
        if (event.target.classList && event.target.classList.contains('modal__overlay')) {
          this.close();
        }
      });
    }

    disconnectedCallback() {
      if (this.classList.contains('is-open')) this.close();
    }

    open(opener) {
      if (this.classList.contains('is-open')) return;
      this.opener = opener || document.activeElement;
      this.removeAttribute('hidden');
      void this.offsetWidth; // let the CSS transition run from the hidden state
      this.classList.add('is-open');
      lockScroll(true);
      this.releaseFocus = trapFocus(this.panel, () => this.close());
      this.dispatchEvent(new CustomEvent('modal:open', { bubbles: true, detail: { id: this.id } }));
    }

    close() {
      if (!this.classList.contains('is-open')) return;
      this.classList.remove('is-open');
      lockScroll(false);
      if (this.releaseFocus) this.releaseFocus();
      this.releaseFocus = null;

      // base.css animates the modal in only, so hide immediately on close.
      this.setAttribute('hidden', '');

      if (this.opener && typeof this.opener.focus === 'function' && document.body.contains(this.opener)) {
        this.opener.focus();
      }
      this.opener = null;
      this.dispatchEvent(new CustomEvent('modal:close', { bubbles: true, detail: { id: this.id } }));
    }
  }

  if (!customElements.get('sb-modal')) customElements.define('sb-modal', SBModal);

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-modal-open]');
    if (!trigger) return;
    const modal = document.getElementById(trigger.getAttribute('data-modal-open'));
    if (!modal || typeof modal.open !== 'function') return;
    event.preventDefault();
    modal.open(trigger);
  });

  window.SB.openModal = (id, opener) => {
    const modal = document.getElementById(id);
    if (modal && typeof modal.open === 'function') modal.open(opener);
  };
  window.SB.closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal && typeof modal.close === 'function') modal.close();
  };

  /* ------------------------------------------------------ reveal on scroll */

  let revealObserver = null;

  function initReveal() {
    const nodes = document.querySelectorAll('.reveal:not(.is-visible)');
    if (nodes.length === 0) return;

    if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
      nodes.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
      );
    }

    nodes.forEach((el) => revealObserver.observe(el));
  }

  /* ------------------------------------------ close details on outside click */

  let detailsBound = false;

  function initDetailsDismiss() {
    if (detailsBound) return;
    detailsBound = true;

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

  /* ---------------------------------------------------------- header count */

  function updateCartCount(count) {
    const n = parseInt(count, 10) || 0;
    document.querySelectorAll('[data-cart-count]').forEach((node) => {
      node.textContent = n;
      if (n === 0) node.setAttribute('hidden', '');
      else node.removeAttribute('hidden');
    });
  }

  window.SB.updateCartCount = updateCartCount;

  document.addEventListener('cart:updated', (event) => {
    if (event.detail && event.detail.cart) updateCartCount(event.detail.cart.item_count);
  });

  /* ---------------------------------------------------------- WhatsApp FAB
     One bottom element at a time: the FAB hides while the sticky add-to-cart
     bar, the cart drawer, the menu drawer or any modal is on screen. */

  let fabBound = false;

  function initWhatsAppFab() {
    const fab = document.querySelector('[data-whatsapp-fab]');
    if (!fab || fabBound) return;
    fabBound = true;

    const reasons = {};
    const sync = () => {
      const hide = Object.keys(reasons).some((key) => reasons[key]);
      if (hide) fab.setAttribute('hidden', '');
      else fab.removeAttribute('hidden');
    };
    const bind = (eventName, key, value) => {
      document.addEventListener(eventName, () => {
        reasons[key] = value;
        sync();
      });
    };

    bind('sticky-atc:visible', 'sticky', true);
    bind('sticky-atc:hidden', 'sticky', false);
    bind('cart:open', 'cart', true);
    bind('cart:close', 'cart', false);
    bind('modal:open', 'modal', true);
    bind('modal:close', 'modal', false);
    bind('menu:open', 'menu', true);
    bind('menu:close', 'menu', false);
  }

  /* ------------------------------------------------------------------ boot */

  /* ---------------------------------------------- autoplaying videos */

  /**
   * Autoplaying background videos (hero, video snippet) get a pause/play
   * toggle rendered in Liquid ([data-video-toggle], aria-pressed = paused).
   * Under prefers-reduced-motion they never start on their own.
   */
  function initAutoplayVideos() {
    if (REDUCED_MOTION) {
      document.querySelectorAll('video[autoplay]').forEach((video) => {
        video.removeAttribute('autoplay');
        video.removeAttribute('loop');
        video.pause();
      });
    }

    document.querySelectorAll('[data-video-toggle]').forEach((button) => {
      if (button.dataset.bound === 'true') return;
      const scope = button.parentElement;
      const video = scope ? scope.querySelector('video') : null;
      if (!video) {
        button.hidden = true;
        return;
      }
      button.dataset.bound = 'true';
      const setPaused = (paused) => button.setAttribute('aria-pressed', String(paused));

      button.addEventListener('click', () => {
        if (video.paused) {
          const played = video.play();
          if (played && typeof played.catch === 'function') played.catch(() => {});
        } else {
          video.pause();
        }
      });
      video.addEventListener('play', () => setPaused(false));
      video.addEventListener('pause', () => setPaused(true));
      setPaused(video.paused);
    });
  }

  function boot() {
    initReveal();
    initDetailsDismiss();
    initWhatsAppFab();
    initAutoplayVideos();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // The theme editor tears down and rebuilds sections; re-run the observers.
  document.addEventListener('shopify:section:load', boot);
  document.addEventListener('shopify:section:select', initReveal);
  document.addEventListener('shopify:block:select', initReveal);
})();
