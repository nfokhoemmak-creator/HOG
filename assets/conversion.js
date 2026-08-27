/* ==========================================================================
   House of Garments — conversion.js
   Product-page conversion helpers: an evergreen countdown bar, quantity-break
   bundle offers, and a mobile sticky add-to-cart bar.

   All three are custom elements rendered by sections/main-product.liquid and
   snippets/bundle-offers.liquid. Everything degrades: without JS the bundle
   tiles keep their server-rendered prices, the countdown shows a placeholder,
   and the sticky bar simply never appears.
   ========================================================================== */

(function () {
  'use strict';

  const moneyFormat = (window.theme && window.theme.moneyFormat) || '${{amount}}';

  function formatMoney(cents) {
    const value = (cents / 100).toFixed(2);
    const withCommas = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return moneyFormat.replace(/\{\{\s*(\w+)\s*\}\}/, withCommas);
  }

  /* ------------------------------------------------- <evergreen-countdown> */

  /**
   * A per-visitor "offer ends in" timer. The deadline is created on first
   * view and persisted in sessionStorage, so reloads and navigation continue
   * the same countdown instead of resetting it. At zero the bar disappears.
   */
  class EvergreenCountdown extends HTMLElement {
    connectedCallback() {
      this.output = this.querySelector('[data-timer]');

      const minutes = parseInt(this.dataset.minutes, 10) || 15;
      const key = 'hog:timer:' + (this.dataset.key || 'default');

      let deadline = 0;
      try {
        deadline = parseInt(window.sessionStorage.getItem(key), 10) || 0;
      } catch (error) {
        /* storage unavailable — fall through to a fresh deadline */
      }

      if (!deadline) {
        deadline = Date.now() + minutes * 60 * 1000;
        try {
          window.sessionStorage.setItem(key, String(deadline));
        } catch (error) {
          /* non-fatal */
        }
      }

      this.deadline = deadline;
      this.tick();
      this.timer = window.setInterval(() => this.tick(), 1000);
    }

    disconnectedCallback() {
      window.clearInterval(this.timer);
    }

    tick() {
      const remaining = this.deadline - Date.now();

      if (remaining <= 0) {
        window.clearInterval(this.timer);
        this.hidden = true;
        return;
      }

      if (!this.output) return;
      const seconds = Math.floor(remaining / 1000);
      const mm = Math.floor(seconds / 60);
      const ss = String(seconds % 60).padStart(2, '0');
      this.output.textContent = mm + ':' + ss;
    }
  }

  if (!customElements.get('evergreen-countdown')) {
    customElements.define('evergreen-countdown', EvergreenCountdown);
  }

  /* ------------------------------------------------------- <bundle-offer> */

  /**
   * Quantity-break tiles. Each radio carries data-quantity, data-discount and
   * data-code; selecting one syncs the product form's quantity input and
   * stores the discount code on the form (product-form.js applies it after a
   * successful add). Prices re-render when the variant changes.
   */
  class BundleOffer extends HTMLElement {
    connectedCallback() {
      this.formId = this.dataset.formId;
      this.price = parseInt(this.dataset.price, 10) || 0;
      this.inputs = Array.from(this.querySelectorAll('input[type="radio"]'));
      if (!this.inputs.length) return;

      this.inputs.forEach((input) => {
        input.addEventListener('change', () => this.applySelection());
      });

      this.onVariantChange = (event) => {
        const detail = event.detail || {};
        if (!detail.variant) return;
        if (detail.sectionId && this.formId !== 'ProductForm-' + detail.sectionId) return;
        this.price = detail.variant.price;
        this.dataset.price = String(this.price);
        this.renderPrices();
      };
      document.addEventListener('variant:change', this.onVariantChange);

      this.renderPrices();
      this.applySelection();
    }

    disconnectedCallback() {
      document.removeEventListener('variant:change', this.onVariantChange);
    }

    tileFor(input) {
      return this.querySelector('label[for="' + input.id + '"]');
    }

    renderPrices() {
      this.inputs.forEach((input) => {
        const tile = this.tileFor(input);
        if (!tile) return;

        const quantity = parseInt(input.dataset.quantity, 10) || 1;
        const discount = parseInt(input.dataset.discount, 10) || 0;
        const unit = Math.round((this.price * (100 - discount)) / 100);

        const unitNode = tile.querySelector('[data-role="unit"]');
        const compareNode = tile.querySelector('[data-role="compare"]');
        const totalNode = tile.querySelector('[data-role="total"]');

        if (unitNode) unitNode.textContent = formatMoney(unit);
        if (compareNode) compareNode.textContent = formatMoney(this.price);
        if (totalNode) totalNode.textContent = formatMoney(unit * quantity);
      });
    }

    applySelection() {
      const selected = this.inputs.find((input) => input.checked);
      const form = document.getElementById(this.formId);
      if (!selected || !form) return;

      let quantityField =
        document.querySelector('input[name="quantity"][form="' + this.formId + '"]') ||
        form.querySelector('input[name="quantity"]');

      // No quantity selector on the page: carry the tier via a hidden input.
      if (!quantityField) {
        quantityField = document.createElement('input');
        quantityField.type = 'hidden';
        quantityField.name = 'quantity';
        form.appendChild(quantityField);
      }
      quantityField.value = selected.dataset.quantity || '1';

      const code = (selected.dataset.code || '').trim();
      if (code) {
        form.dataset.bundleCode = code;
      } else {
        delete form.dataset.bundleCode;
      }
    }
  }

  if (!customElements.get('bundle-offer')) {
    customElements.define('bundle-offer', BundleOffer);
  }

  /* --------------------------------------------------------- <sticky-atc> */

  /**
   * Mobile bottom bar that appears once the real add-to-cart button has been
   * scrolled past, and submits the same form. Hidden at desktop widths and
   * whenever the buy button is on screen.
   */
  class StickyAtc extends HTMLElement {
    connectedCallback() {
      this.form = document.getElementById(this.dataset.formId);
      this.trigger = this.form ? this.form.querySelector('[type="submit"]') : null;
      this.button = this.querySelector('button');
      this.priceOutput = this.querySelector('[data-sticky-price]');

      if (!this.form || !this.trigger) return;

      if (this.button) {
        this.button.addEventListener('click', () => {
          if (this.trigger.disabled) return;
          if (typeof this.form.requestSubmit === 'function') {
            this.form.requestSubmit();
          } else {
            this.trigger.click();
          }
        });
      }

      this.onVariantChange = (event) => {
        const detail = event.detail || {};
        if (!detail.variant || !this.priceOutput) return;
        if (detail.sectionId && this.dataset.formId !== 'ProductForm-' + detail.sectionId) return;
        this.priceOutput.textContent = formatMoney(detail.variant.price);
      };
      document.addEventListener('variant:change', this.onVariantChange);

      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            const offsetTop = entry.boundingClientRect.top + window.scrollY;
            const passed = !entry.isIntersecting && window.scrollY > offsetTop;
            this.classList.toggle('is-visible', passed);
          });
        });
        this.observer.observe(this.trigger);
      }
    }

    disconnectedCallback() {
      document.removeEventListener('variant:change', this.onVariantChange);
      if (this.observer) this.observer.disconnect();
    }
  }

  if (!customElements.get('sticky-atc')) {
    customElements.define('sticky-atc', StickyAtc);
  }
})();
