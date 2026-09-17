/* ==========================================================================
   Goodest Chews — product-form.js
   Bundle selection and add-to-cart on the product page.

   Variant data is embedded as JSON by sections/main-product.liquid. Picking a
   bundle finds the matching variant, updates the hidden id input, the price,
   the compare-at price, the savings badge, the per-bag price, availability,
   the URL and the sticky bar.

   Without JS the form still posts to /cart/add with the first available
   variant preselected, so the page remains functional.
   ========================================================================== */

(function () {
  'use strict';

  const strings = (window.theme && window.theme.strings) || {};

  function money(cents) {
    if (window.GC && window.GC.formatMoney) return window.GC.formatMoney(cents);
    return '$' + (cents / 100).toFixed(2);
  }

  function fill(template, key, value) {
    return (template || '').replace('{{ ' + key + ' }}', value).replace('{{' + key + '}}', value);
  }

  class ProductForm extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      this.idInput = this.querySelector('[name="id"]');
      this.submitButton = this.querySelector('[type="submit"]');
      this.section = this.closest('.shopify-section') || document;

      this.priceTarget = document.getElementById(this.dataset.priceTarget);
      this.inventoryTarget = document.getElementById(this.dataset.inventoryTarget);
      this.perBagTarget = document.getElementById(this.dataset.perBagTarget);
      this.savingsTarget = document.getElementById(this.dataset.savingsTarget);
      this.stickyPrice = document.querySelectorAll('[data-sticky-price]');
      this.stickyButton = document.querySelectorAll('[data-sticky-submit]');
      this.gallery = document.querySelector('product-gallery');

      this.variants = this.readVariants();
      this.inventory = this.readJSON('[type="application/json"][data-inventory]') || {};
      this.optionInputs = Array.from(this.section.querySelectorAll('[data-option-index]'));

      this.optionInputs.forEach((input) => {
        input.addEventListener('change', () => this.onOptionChange());
      });

      if (this.form) {
        this.form.addEventListener('submit', (event) => this.onSubmit(event));
      }

      this.onOptionChange({ silent: true });
    }

    readJSON(selector) {
      const script = this.querySelector(selector);
      if (!script) return null;
      try {
        return JSON.parse(script.textContent);
      } catch (error) {
        return null;
      }
    }

    readVariants() {
      return this.readJSON('[type="application/json"][data-variants]') || [];
    }

    selectedOptions() {
      const options = [];
      this.optionInputs.forEach((input) => {
        const index = parseInt(input.dataset.optionIndex, 10);
        if (Number.isNaN(index)) return;
        if (input.type === 'radio' && !input.checked) return;
        options[index] = input.value;
      });
      return options;
    }

    selectedInput() {
      return this.optionInputs.find((input) => input.type !== 'radio' || input.checked) || null;
    }

    variantOptions(variant) {
      if (Array.isArray(variant.options) && variant.options.length) return variant.options;
      return [variant.option1, variant.option2, variant.option3].filter((value) => value != null);
    }

    matchVariant(options) {
      const wanted = options.filter((value) => value !== undefined);
      if (!wanted.length) return this.variants.find((variant) => variant.available) || this.variants[0];
      return this.variants.find((variant) =>
        this.variantOptions(variant).every((value, index) => options[index] === undefined || value === options[index])
      );
    }

    onOptionChange(config) {
      const options = this.selectedOptions();
      const variant = this.matchVariant(options);

      if (!variant) {
        this.setButton(strings.unavailable || 'Unavailable', true);
        return;
      }

      if (this.idInput) this.idInput.value = variant.id;
      this.updatePrice(variant);
      this.updateInventory(variant);
      this.updateAvailability(variant);

      if (!config || !config.silent) {
        this.updateURL(variant);
        this.showMedia(variant);
      }
    }

    updatePrice(variant) {
      const input = this.selectedInput();
      const bags = input ? parseInt(input.dataset.bags, 10) || 1 : 1;
      const onSale = variant.compare_at_price && variant.compare_at_price > variant.price;

      if (this.priceTarget) {
        const current = this.priceTarget.querySelector('[data-price-current]');
        const compare = this.priceTarget.querySelector('[data-price-compare]');
        if (current) current.textContent = money(variant.price);
        if (compare) {
          compare.textContent = onSale ? money(variant.compare_at_price) : '';
          compare.hidden = !onSale;
        }
        this.priceTarget.classList.toggle('price--on-sale', Boolean(onSale));
      }

      if (this.savingsTarget) {
        if (onSale) {
          const amount = variant.compare_at_price - variant.price;
          const percent = Math.round((amount / variant.compare_at_price) * 100);
          this.savingsTarget.textContent = fill(strings.save || 'Save {{ amount }}', 'amount', money(amount)) +
            ' (' + fill(strings.savePercent || '{{ percent }}%', 'percent', percent) + ')';
          this.savingsTarget.hidden = false;
        } else {
          this.savingsTarget.hidden = true;
        }
      }

      if (this.perBagTarget) {
        if (bags > 1) {
          this.perBagTarget.textContent = fill(strings.perBag || '{{ price }} per bag', 'price', money(variant.price / bags));
          this.perBagTarget.hidden = false;
        } else {
          this.perBagTarget.hidden = true;
        }
      }

      this.stickyPrice.forEach((node) => {
        node.textContent = money(variant.price);
      });
    }

    updateInventory(variant) {
      if (!this.inventoryTarget) return;

      // Shopify's variant JSON omits inventory_quantity; the section emits a map.
      const stock = this.inventory[String(variant.id)] || {};
      const quantity = typeof stock.quantity === 'number' ? stock.quantity : variant.inventory_quantity;
      const managed = typeof stock.managed === 'boolean' ? stock.managed : variant.inventory_management === 'shopify';
      const low = managed && variant.available && quantity > 0 && quantity <= 10;

      if (low) {
        this.inventoryTarget.textContent = fill(strings.lowStock || 'Only {{ count }} left', 'count', quantity);
        this.inventoryTarget.hidden = false;
      } else {
        this.inventoryTarget.hidden = true;
      }
    }

    updateAvailability(variant) {
      if (variant.available) {
        this.setButton(strings.addToCart || 'Add to cart', false);
      } else {
        this.setButton(strings.soldOut || 'Sold out', true);
      }
    }

    setButton(label, disabled) {
      const buttons = [this.submitButton, ...this.stickyButton].filter(Boolean);
      buttons.forEach((button) => {
        const text = button.querySelector('[data-button-text]') || button;
        text.textContent = label;
        button.disabled = disabled;
        button.setAttribute('aria-disabled', String(disabled));
      });
    }

    updateURL(variant) {
      if (!variant || this.dataset.updateUrl === 'false') return;
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());
    }

    showMedia(variant) {
      if (!this.gallery || !variant.featured_media) return;
      if (typeof this.gallery.show === 'function') this.gallery.show(variant.featured_media.id);
    }

    async onSubmit(event) {
      if (!window.GC || typeof window.GC.addToCart !== 'function') return; // let it post natively
      event.preventDefault();

      const original = this.submitButton
        ? (this.submitButton.querySelector('[data-button-text]') || this.submitButton).textContent
        : '';

      this.setButton(strings.adding || 'Adding…', true);

      try {
        await window.GC.addToCart(new FormData(this.form), this.submitButton);
        this.setButton(strings.added || 'Added ✓', false);
        window.setTimeout(() => this.setButton(original, false), 1800);
      } catch (error) {
        this.setButton(error.message || strings.cartError, false);
        window.setTimeout(() => this.setButton(original, false), 2800);
      }
    }
  }

  if (!customElements.get('product-form')) {
    customElements.define('product-form', ProductForm);
  }
})();
