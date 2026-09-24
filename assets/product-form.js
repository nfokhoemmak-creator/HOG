/* ==========================================================================
   House of Garments — product-form.js
   Variant selection and add-to-cart on the product page.

   Variant data is embedded as JSON by sections/main-product.liquid. Selecting
   options finds the matching variant, updates the hidden id input, price,
   availability and the URL, then scrolls the matching media into view.

   The sticky mobile buy bar ([data-buy-bar]) is a second submit button for
   the same form. This script mirrors price, label and disabled state into it
   and reveals it only while the real button is off screen.

   Without JS the form still posts to /cart/add with the first available
   variant preselected, so the page remains functional.
   ========================================================================== */

(function () {
  'use strict';

  const strings = (window.theme && window.theme.strings) || {};
  const moneyFormat = (window.theme && window.theme.moneyFormat) || '${{amount}}';

  function formatMoney(cents) {
    const value = (cents / 100).toFixed(2);
    const withCommas = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return moneyFormat.replace(/\{\{\s*(\w+)\s*\}\}/, withCommas);
  }

  class ProductForm extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      this.idInput = this.querySelector('[name="id"]');
      // First submit in document order is the real button; the buy-bar
      // button comes later in the markup and is looked up by its own hook.
      this.submitButton = this.querySelector('[type="submit"]');
      this.priceTarget = document.getElementById(this.dataset.priceTarget);
      this.inventoryTarget = document.getElementById(this.dataset.inventoryTarget);
      this.gallery = document.querySelector('[data-gallery]');
      this.sectionId = this.dataset.sectionId;

      this.variants = this.readVariants();

      // The variant picker block renders as a sibling of <product-form>, so
      // the lookup has to widen to the shared info column or the radios are
      // never found (and the buy button would be wrongly disabled on load).
      const scope = this.closest('.product__info') || this.closest('.product') || this;
      this.optionInputs = Array.from(scope.querySelectorAll('[data-option-index]'));

      this.buyBar = this.querySelector('[data-buy-bar]');
      this.buyBarButton = this.querySelector('[data-buy-bar-button]');
      this.buyBarPrice = this.querySelector('[data-buy-bar-price]');
      this.initBuyBar();

      this.optionInputs.forEach((input) => {
        input.addEventListener('change', () => this.onOptionChange());
      });

      if (this.form) {
        this.form.addEventListener('submit', (event) => this.onSubmit(event));
      }

      this.onOptionChange({ silent: true });
    }

    readVariants() {
      const script = this.querySelector('[type="application/json"][data-variants]');
      if (!script) return [];
      try {
        return JSON.parse(script.textContent);
      } catch (error) {
        return [];
      }
    }

    selectedOptions() {
      const options = [];
      this.optionInputs.forEach((input) => {
        const index = parseInt(input.dataset.optionIndex, 10);
        if (input.type === 'radio' && !input.checked) return;
        options[index] = input.value;
      });
      return options;
    }

    matchVariant(options) {
      return this.variants.find((variant) =>
        variant.options.every((value, index) => value === options[index])
      );
    }

    onOptionChange(config) {
      // No picker on the page (default-variant product): keep the
      // server-rendered button and stock line instead of matching against
      // nothing.
      if (this.optionInputs.length === 0) return;

      const options = this.selectedOptions();
      const variant = this.matchVariant(options);

      this.markUnavailableOptions(options);

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

    /**
     * Grey out any option value that produces no purchasable variant given the
     * other currently-selected options. Sizes are the option that matters here:
     * limited runs sell out one size at a time.
     */
    markUnavailableOptions(selected) {
      this.optionInputs.forEach((input) => {
        const index = parseInt(input.dataset.optionIndex, 10);
        const candidate = selected.slice();
        candidate[index] = input.value;

        const match = this.variants.find((variant) =>
          variant.options.every((value, position) => {
            if (position === index) return value === input.value;
            return candidate[position] === undefined || value === candidate[position];
          })
        );

        const label = input.nextElementSibling;
        if (!label) return;
        const unavailable = !match || !match.available;
        label.classList.toggle('variant-option__value--unavailable', unavailable);
      });
    }

    updatePrice(variant) {
      if (this.buyBarPrice) this.buyBarPrice.textContent = formatMoney(variant.price);

      if (!this.priceTarget) return;
      const current = this.priceTarget.querySelector('[data-price-current]');
      const compare = this.priceTarget.querySelector('[data-price-compare]');

      if (current) current.textContent = formatMoney(variant.price);

      if (compare) {
        const onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
        compare.textContent = onSale ? formatMoney(variant.compare_at_price) : '';
        compare.hidden = !onSale;
        // The price wrapper carries the sale modifier, not the block that
        // holds it; toggle it on the element that owns the colour rule.
        const wrapper = current ? current.closest('.price') : null;
        (wrapper || this.priceTarget).classList.toggle('price--on-sale', Boolean(onSale));
      }
    }

    updateInventory(variant) {
      if (!this.inventoryTarget) return;

      const quantity = variant.inventory_quantity;
      const managed = variant.inventory_management === 'shopify';
      const low = managed && variant.available && quantity > 0 && quantity <= 5;
      // Pre-orders carry their own note under the buttons; "in stock" would
      // contradict it.
      const inStock = !low && variant.available && this.dataset.preorder !== 'true';

      this.inventoryTarget.classList.toggle('product__inventory--low', low);
      this.inventoryTarget.classList.toggle('product__inventory--in', inStock);

      if (low) {
        this.inventoryTarget.textContent = (strings.lowStock || 'Only {{ count }} left').replace(
          '{{ count }}',
          quantity
        );
        this.inventoryTarget.hidden = false;
      } else if (inStock) {
        // Confirming stock is worth a line of its own: the commonest silent
        // objection on a limited-run store is "is my size even still here".
        this.inventoryTarget.textContent = strings.inStock || 'In stock';
        this.inventoryTarget.hidden = false;
      } else {
        this.inventoryTarget.hidden = true;
      }
    }

    updateAvailability(variant) {
      if (variant.available) {
        const label = this.dataset.preorder === 'true' ? strings.preorder : strings.addToCart;
        this.setButton(label || 'Add to cart', false);
      } else {
        this.setButton(strings.soldOut || 'Sold out', true);
      }
    }

    setButton(label, disabled) {
      if (this.submitButton) {
        const text = this.submitButton.querySelector('[data-button-text]') || this.submitButton;
        text.textContent = label;
        this.submitButton.disabled = disabled;
        this.submitButton.setAttribute('aria-disabled', String(disabled));
      }

      if (this.buyBarButton) {
        const barText = this.buyBarButton.querySelector('[data-buy-bar-text]') || this.buyBarButton;
        barText.textContent = label;
        this.buyBarButton.disabled = disabled;
        this.buyBarButton.setAttribute('aria-disabled', String(disabled));
      }
    }

    /**
     * Reveal the sticky bar only while the real add-to-cart button is off
     * screen. Watching the button itself means the bar never covers the thing
     * it duplicates, and it stays hidden on desktop where CSS hides it anyway.
     */
    initBuyBar() {
      if (!this.buyBar || !this.submitButton) return;

      this.buyBar.hidden = false;

      if (!('IntersectionObserver' in window)) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            this.buyBar.classList.toggle('is-visible', !entry.isIntersecting);
          });
        },
        { rootMargin: '0px 0px -120px 0px' }
      );

      observer.observe(this.submitButton);
    }

    updateURL(variant) {
      if (!variant || this.dataset.updateUrl === 'false') return;
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());
    }

    showMedia(variant) {
      if (!this.gallery || !variant.featured_media) return;
      const media = this.gallery.querySelector(`[data-media-id="${variant.featured_media.id}"]`);
      if (!media) return;

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      media.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });

      this.gallery.querySelectorAll('[data-thumb]').forEach((thumb) => {
        thumb.setAttribute('aria-current', String(thumb.dataset.thumb === String(variant.featured_media.id)));
      });
    }

    async onSubmit(event) {
      if (!window.HOG || typeof window.HOG.addToCart !== 'function') return; // let it post natively
      event.preventDefault();

      const original = this.submitButton
        ? (this.submitButton.querySelector('[data-button-text]') || this.submitButton).textContent
        : '';

      // event.submitter is the buy-bar button when the bar was tapped, so the
      // drawer returns focus to the control the visitor actually used.
      const opener = (event.submitter && event.submitter.closest('button')) || this.submitButton;

      this.setButton(strings.adding || 'Adding…', true);

      try {
        await window.HOG.addToCart(new FormData(this.form), opener);
        this.setButton(strings.added || 'Added', false);
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
