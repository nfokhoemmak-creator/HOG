/* ==========================================================================
   House of Garments — bundle.js
   The bundle builder: tick pieces on and off, pick variants, watch the
   stacked price update, add the whole fit to the cart in one request.

   Loaded by sections/bundle-builder.liquid. Prices live on the markup as
   data-price attributes in cents; the savings percent is display-only and
   must match the automatic discount configured in admin. Without JS the
   items are still real links to their product pages — only the combined
   add button needs script.
   ========================================================================== */

(function () {
  'use strict';

  const strings = (window.theme && window.theme.strings) || {};

  function formatMoney(cents) {
    if (window.HOG && typeof window.HOG.formatMoney === 'function') {
      return window.HOG.formatMoney(cents);
    }
    return '$' + (cents / 100).toFixed(2);
  }

  /* ------------------------------------------------------- <bundle-builder> */

  class BundleBuilder extends HTMLElement {
    connectedCallback() {
      this.minItems = parseInt(this.dataset.minItems, 10) || 2;
      this.savingsPercent = parseInt(this.dataset.savingsPercent, 10) || 0;

      this.items = Array.from(this.querySelectorAll('[data-bundle-item]'));
      this.countTarget = this.querySelector('[data-bundle-count]');
      this.compareTarget = this.querySelector('[data-bundle-compare]');
      this.totalTarget = this.querySelector('[data-bundle-total]');
      this.savingsTarget = this.querySelector('[data-bundle-savings]');
      this.hintTarget = this.querySelector('[data-bundle-hint]');
      this.addButton = this.querySelector('[data-bundle-add]');
      this.errorTarget = this.querySelector('[data-bundle-error]');

      if (!this.bound) {
        this.bound = true;

        this.addEventListener('change', (event) => {
          const input = event.target;
          if (input.matches('[data-bundle-check], [data-bundle-variant]')) this.recompute();
        });

        if (this.addButton) {
          this.defaultLabel = this.addButton.textContent.trim();
          this.addButton.addEventListener('click', () => this.addToCart());
        }
      }

      this.recompute();
    }

    /**
     * Every checked, in-stock item with a resolvable variant. Sold-out items
     * render with a disabled checkbox, so they can never make it in here.
     */
    selection() {
      const selected = [];

      this.items.forEach((item) => {
        const check = item.querySelector('[data-bundle-check]');
        const variant = item.querySelector('[data-bundle-variant]');
        if (!check || !variant || check.disabled || !check.checked) return;

        let id;
        let price;

        if (variant.tagName === 'SELECT') {
          const option = variant.options[variant.selectedIndex];
          if (!option || option.disabled) return;
          id = option.value;
          price = parseInt(option.dataset.price, 10) || 0;
        } else {
          id = variant.value;
          price = parseInt(variant.dataset.price, 10) || 0;
        }

        if (!id) return;
        selected.push({ id: parseInt(id, 10), price });
      });

      return selected;
    }

    recompute() {
      const selected = this.selection();
      const count = selected.length;
      const subtotal = selected.reduce((sum, entry) => sum + entry.price, 0);
      const qualifies = count >= this.minItems && this.savingsPercent > 0;

      if (this.countTarget) {
        this.countTarget.textContent =
          count === 1 ? '1 PIECE SELECTED' : count + ' PIECES SELECTED';
      }

      if (this.totalTarget) {
        if (count === 0) {
          this.totalTarget.textContent = '—';
        } else if (qualifies) {
          const total = Math.round(subtotal * (100 - this.savingsPercent) / 100);
          this.totalTarget.textContent = formatMoney(total);
        } else {
          this.totalTarget.textContent = formatMoney(subtotal);
        }
      }

      if (this.compareTarget) {
        this.compareTarget.hidden = !qualifies;
        this.compareTarget.textContent = qualifies ? formatMoney(subtotal) : '';
      }

      if (this.savingsTarget) {
        this.savingsTarget.hidden = !qualifies;
        if (qualifies) {
          const total = Math.round(subtotal * (100 - this.savingsPercent) / 100);
          this.savingsTarget.textContent =
            'YOU SAVE ' + formatMoney(subtotal - total) +
            ' (' + this.savingsPercent + '% AUTO-APPLIED AT CHECKOUT)';
        }
      }

      if (this.hintTarget) {
        const missing = this.minItems - count;
        const showHint = this.savingsPercent > 0 && count < this.minItems;
        this.hintTarget.hidden = !showHint;
        if (showHint) {
          this.hintTarget.textContent =
            'ADD ' + missing + (missing === 1 ? ' MORE PIECE' : ' MORE PIECES') +
            ' TO UNLOCK ' + this.savingsPercent + '% OFF';
        }
      }

      if (this.addButton && !this.adding) {
        this.addButton.disabled = count === 0;
        this.addButton.setAttribute('aria-disabled', String(count === 0));
      }
    }

    /* --------------------------------------------------------------- adding */

    async addToCart() {
      const selected = this.selection();
      if (selected.length === 0 || this.adding) return;

      this.hideError();

      if (!window.HOG || typeof window.HOG.addItems !== 'function') {
        this.showError(strings.cartError || 'Something went wrong — refresh and try again.');
        return;
      }

      const items = selected.map((entry) => ({ id: entry.id, quantity: 1 }));

      this.adding = true;
      this.setButton('ADDING…', true);

      try {
        await window.HOG.addItems(items, this.addButton);
        this.setButton('ADDED ✓', true);
        window.setTimeout(() => this.resetButton(), 1800);
      } catch (error) {
        this.showError(error.message || strings.cartError);
        window.setTimeout(() => this.resetButton(), 2800);
      }
    }

    setButton(label, disabled) {
      if (!this.addButton) return;
      this.addButton.textContent = label;
      this.addButton.disabled = disabled;
      this.addButton.setAttribute('aria-disabled', String(disabled));
    }

    resetButton() {
      this.adding = false;
      this.setButton(this.defaultLabel, false);
      this.recompute();
    }

    showError(message) {
      if (!this.errorTarget) return;
      this.errorTarget.textContent = message || 'Something went wrong — try again.';
      this.errorTarget.hidden = false;
    }

    hideError() {
      if (!this.errorTarget) return;
      this.errorTarget.textContent = '';
      this.errorTarget.hidden = true;
    }
  }

  if (!customElements.get('bundle-builder')) {
    customElements.define('bundle-builder', BundleBuilder);
  }
})();
