/* ==========================================================================
   Goodest Chews — theme.js
   Global behaviour: mobile nav, announcement rotation, header shadow,
   reveal-on-scroll, count-ups, sticky bars, product gallery, quantity inputs.

   No dependencies. Everything degrades: if this file fails to load, the
   storefront still renders, navigates and checks out.
   ========================================================================== */

(function () {
  'use strict';

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ANIMATE = Boolean(window.theme && window.theme.animations) && !REDUCED_MOTION;
  const moneyFormat = (window.theme && window.theme.moneyFormat) || '${{amount}}';

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

  function formatMoney(cents) {
    const value = (Math.round(cents) / 100).toFixed(2);
    const withCommas = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const noDecimals = withCommas.replace(/\.00$/, '');
    return moneyFormat
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, noDecimals)
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, withCommas.replace('.', ','))
      .replace(/\{\{\s*amount\s*\}\}/, withCommas);
  }

  window.GC = Object.assign(window.GC || {}, { trapFocus, lockScroll, announce, formatMoney });

  /* --------------------------------------------------------- <menu-drawer> */

  class MenuDrawer extends HTMLElement {
    connectedCallback() {
      this.drawer = this.querySelector('.menu-drawer');
      this.panel = this.querySelector('.menu-drawer__panel');
      this.toggle = this.querySelector('[data-menu-open]');
      this.closeBtn = this.querySelector('[data-menu-close]');
      this.releaseFocus = null;

      if (!this.drawer || !this.toggle) return;

      this.toggle.addEventListener('click', () => this.open());
      if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());

      this.drawer.addEventListener('click', (event) => {
        if (event.target === this.drawer) this.close();
      });

      // Anchor links inside the drawer should close it before scrolling.
      this.drawer.querySelectorAll('a[href*="#"]').forEach((link) => {
        link.addEventListener('click', () => this.close());
      });
    }

    open() {
      this.drawer.classList.add('is-open');
      this.toggle.setAttribute('aria-expanded', 'true');
      lockScroll(true);
      this.releaseFocus = trapFocus(this.panel || this.drawer, () => this.close());
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
      if (this.items.length < 2 || REDUCED_MOTION || this.hasAttribute('data-static')) return;

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

  /* ------------------------------------------------------ <quantity-input> */

  class QuantityInput extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('input');
      if (!this.input) return;

      this.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          const step = button.dataset.action === 'increase' ? 1 : -1;
          const min = parseInt(this.input.min, 10) || 0;
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

  /* ---------------------------------------------------------- <sticky-bar> */

  /**
   * Shows itself once the element in data-trigger has scrolled out of the top
   * of the viewport, and hides again whenever any element in data-hide is in
   * view (the bundles section, the footer). Used by the product page's sticky
   * add-to-cart and the homepage's sticky "choose your bundle" bar.
   */
  class StickyBar extends HTMLElement {
    connectedCallback() {
      if (!('IntersectionObserver' in window)) return;

      const trigger = this.dataset.trigger ? document.querySelector(this.dataset.trigger) : null;
      const hiders = this.dataset.hide
        ? Array.from(document.querySelectorAll(this.dataset.hide))
        : [];

      this.pastTrigger = false;
      this.blocked = false;

      if (trigger) {
        this.triggerObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              this.pastTrigger = !entry.isIntersecting && entry.boundingClientRect.top < 0;
              this.sync();
            });
          },
          { threshold: 0 }
        );
        this.triggerObserver.observe(trigger);
      } else {
        this.pastTrigger = true;
      }

      if (hiders.length) {
        this.visibleHiders = new Set();
        this.hideObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) this.visibleHiders.add(entry.target);
              else this.visibleHiders.delete(entry.target);
            });
            this.blocked = this.visibleHiders.size > 0;
            this.sync();
          },
          { threshold: 0.15 }
        );
        hiders.forEach((node) => this.hideObserver.observe(node));
      }

      this.sync();
    }

    disconnectedCallback() {
      if (this.triggerObserver) this.triggerObserver.disconnect();
      if (this.hideObserver) this.hideObserver.disconnect();
    }

    sync() {
      const show = this.pastTrigger && !this.blocked;
      this.classList.toggle('is-visible', show);
      this.setAttribute('aria-hidden', String(!show));
    }
  }

  if (!customElements.get('sticky-bar')) {
    customElements.define('sticky-bar', StickyBar);
  }

  /* ----------------------------------------------------- <product-gallery> */

  class ProductGallery extends HTMLElement {
    connectedCallback() {
      this.stage = this.querySelector('[data-stage]');
      this.items = Array.from(this.querySelectorAll('[data-media-id]'));
      this.thumbs = Array.from(this.querySelectorAll('[data-thumb]'));
      if (!this.items.length) return;

      this.thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => this.show(thumb.dataset.thumb));
      });

      // Swipe on touch devices.
      let startX = null;
      this.addEventListener('touchstart', (event) => {
        startX = event.touches[0].clientX;
      }, { passive: true });
      this.addEventListener('touchend', (event) => {
        if (startX === null) return;
        const delta = event.changedTouches[0].clientX - startX;
        startX = null;
        if (Math.abs(delta) < 40) return;
        this.step(delta < 0 ? 1 : -1);
      }, { passive: true });

      this.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') this.step(1);
        if (event.key === 'ArrowLeft') this.step(-1);
      });

      const initial = this.items.find((item) => item.classList.contains('is-active')) || this.items[0];
      this.show(initial.dataset.mediaId);
    }

    index() {
      return this.items.findIndex((item) => item.classList.contains('is-active'));
    }

    step(direction) {
      const next = (this.index() + direction + this.items.length) % this.items.length;
      this.show(this.items[next].dataset.mediaId);
    }

    show(id) {
      this.items.forEach((item) => {
        const active = item.dataset.mediaId === String(id);
        item.classList.toggle('is-active', active);
        const video = item.querySelector('video');
        if (video && !active) video.pause();
      });
      this.thumbs.forEach((thumb) => {
        const active = thumb.dataset.thumb === String(id);
        thumb.setAttribute('aria-current', String(active));
        if (active && thumb.scrollIntoView) {
          thumb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
        }
      });
    }
  }

  if (!customElements.get('product-gallery')) {
    customElements.define('product-gallery', ProductGallery);
  }

  /* ---------------------------------------------------------- header shadow */

  function initHeader() {
    const header = document.querySelector('.header');
    if (!header) return;
    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ------------------------------------------------------ reveal on scroll */

  function initReveal() {
    const nodes = document.querySelectorAll('.reveal:not(.is-visible)');
    if (!ANIMATE || !('IntersectionObserver' in window)) {
      nodes.forEach((el) => el.classList.add('is-visible'));
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
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );

    nodes.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------ count-ups */

  function initCountUps() {
    const nodes = document.querySelectorAll('[data-count-up]:not([data-counted])');
    if (!nodes.length) return;

    const run = (node) => {
      node.setAttribute('data-counted', 'true');
      const target = parseFloat(node.dataset.countUp);
      const decimals = (String(node.dataset.countUp).split('.')[1] || '').length;
      const suffix = node.dataset.suffix || '';
      if (Number.isNaN(target) || !ANIMATE) {
        node.textContent = node.dataset.countUp + suffix;
        return;
      }
      const duration = 1400;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = (target * eased).toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(run);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    nodes.forEach((node) => observer.observe(node));
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

  /* ------------------------------------------------- one-open FAQ accordion */

  function initFaqGroups() {
    document.querySelectorAll('[data-accordion-group]').forEach((group) => {
      if (group.dataset.bound) return;
      group.dataset.bound = 'true';
      group.addEventListener('toggle', (event) => {
        const opened = event.target;
        if (!opened.open || opened.tagName !== 'DETAILS') return;
        group.querySelectorAll('details[open]').forEach((other) => {
          if (other !== opened) other.removeAttribute('open');
        });
      }, true);
    });
  }

  /* ------------------------------------------------------------------ boot */

  function boot() {
    initHeader();
    initReveal();
    initCountUps();
    initFaqGroups();
  }

  initDetailsDismiss();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // The theme editor tears down and rebuilds sections; re-run the observers.
  document.addEventListener('shopify:section:load', boot);
})();
