/* ==========================================================================
   Shark Bite — product-form.js
   <product-form>: variant selection (radios or selects carrying
   data-option-index), price / compare-at / save badge, availability,
   low-stock, selected-value labels, URL, gallery media and add-to-cart via
   SB.addToCart. Dispatches `variant:change` on document.

   <sticky-atc>: a fixed bar that appears when the main buy button scrolls
   out of view and submits the main form.

   Without JS the form posts to /cart/add with the preselected variant, so
   the page keeps working.
   ========================================================================== */

(function () {
  'use strict';

  const theme = window.theme || {};
  const strings = theme.strings || {};
  const SB = (window.SB = window.SB || {});
  const REDUCED_MOTION =
    !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const money = (cents, options) =>
    typeof SB.formatMoney === 'function'
      ? SB.formatMoney(cents, options)
      : `$${(cents / 100).toFixed(2)}`;

  const lowStockThreshold = parseInt(theme.lowStockThreshold, 10) || 0;

  function readJSON(node) {
    if (!node) return null;
    try {
      return JSON.parse(node.textContent);
    } catch (error) {
      return null;
    }
  }

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function show(node, visible) {
    if (!node) return;
    if (visible) node.removeAttribute('hidden');
    else node.setAttribute('hidden', '');
  }

  /* --------------------------------------------------------- <product-form> */

  class ProductForm extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      if (!this.form) return;

      this.sectionId = this.getAttribute('data-section-id') || '';
      this.productId = this.getAttribute('data-product-id') || '';
      this.productUrl = this.getAttribute('data-url') || '';
      this.section = this.sectionId ? document.getElementById(`shopify-section-${this.sectionId}`) : null;
      this.scope = this.section || this.closest('.shopify-section') || document;

      this.variants = readJSON(this.querySelector('script[data-variants]')) || [];
      this.options = readJSON(this.querySelector('script[data-options]')) || [];

      this.idInput = this.querySelector('[data-variant-id]') || this.querySelector('input[name="id"]');
      this.quantityInput = this.querySelector('input[name="quantity"]');
      this.addButton = this.querySelector('[data-add-button]') || this.form.querySelector('[type="submit"]');
      this.addText = this.addButton ? this.addButton.querySelector('[data-add-text]') : null;
      this.isPreorder = this.hasAttribute('data-preorder') || (this.addButton && this.addButton.hasAttribute('data-preorder'));

      this.optionInputs = Array.from(this.querySelectorAll('[data-option-index]')).filter(
        (node) => node.matches('input[type="radio"], select')
      );

      // Price targets: the section-level [data-price-target] container (with
      // [data-price-current] / [data-price-compare] / [data-price-save]) or the
      // inline [data-price] / [data-compare-price] / [data-save-badge] hooks.
      const externalTarget = this.getAttribute('data-price-target');
      this.priceTarget =
        (externalTarget && document.getElementById(externalTarget)) ||
        this.scope.querySelector('[data-price-target]') ||
        null;

      this.onOptionChange = this.onOptionChange.bind(this);
      this.onSubmit = this.onSubmit.bind(this);
      this.optionInputs.forEach((input) => input.addEventListener('change', this.onOptionChange));
      this.form.addEventListener('submit', this.onSubmit);

      if (this.quantityInput) {
        this.quantityInput.addEventListener('change', () => this.dispatchQuantity());
      }

      this.update({ initial: true });
    }

    disconnectedCallback() {
      this.optionInputs.forEach((input) => input.removeEventListener('change', this.onOptionChange));
      if (this.form) this.form.removeEventListener('submit', this.onSubmit);
    }

    /* ------------------------------------------------------- resolution */

    selectedOptions() {
      const selected = [];
      this.optionInputs.forEach((input) => {
        const index = parseInt(input.getAttribute('data-option-index'), 10);
        if (Number.isNaN(index)) return;
        if (input.type === 'radio') {
          if (input.checked) selected[index] = input.value;
        } else {
          selected[index] = input.value;
        }
      });
      return selected;
    }

    findVariant(selected) {
      if (this.optionInputs.length === 0) {
        const id = this.idInput ? parseInt(this.idInput.value, 10) : NaN;
        return this.variants.find((v) => v.id === id) || this.variants[0] || null;
      }
      return (
        this.variants.find((variant) =>
          variant.options.every((value, index) => selected[index] === undefined || value === selected[index])
        ) || null
      );
    }

    get currentVariant() {
      return this.variant || null;
    }

    /* ----------------------------------------------------------- update */

    onOptionChange() {
      this.update({ initial: false });
    }

    update(config) {
      const selected = this.selectedOptions();
      const variant = this.findVariant(selected);
      this.variant = variant;

      this.markOptionAvailability(selected);
      this.updateSelectedLabels(selected);

      if (!variant) {
        this.setButton(strings.unavailable || 'Unavailable', true);
        setText(this.querySelector('[data-availability]'), strings.unavailable || 'Unavailable');
        show(this.querySelector('[data-low-stock]'), false);
        return;
      }

      if (this.idInput) this.idInput.value = variant.id;

      this.updatePrice(variant);
      this.updateAvailability(variant);
      this.updateLowStock(variant);
      this.updateMedia(variant, config.initial);
      if (!config.initial) this.updateURL(variant);

      document.dispatchEvent(
        new CustomEvent('variant:change', {
          detail: {
            variant,
            product: { id: this.productId, url: this.productUrl, handle: this.getAttribute('data-handle') || '' },
            sectionId: this.sectionId,
            initial: !!config.initial,
            quantity: this.quantity
          }
        })
      );
    }

    /**
     * Flags option values that yield no purchasable variant given the other
     * selected options: radios get `data-unavailable`, options get disabled.
     */
    markOptionAvailability(selected) {
      this.optionInputs.forEach((input) => {
        const index = parseInt(input.getAttribute('data-option-index'), 10);
        if (Number.isNaN(index)) return;

        const check = (value) => {
          const candidate = selected.slice();
          candidate[index] = value;
          return this.variants.some(
            (variant) =>
              variant.available &&
              variant.options.every(
                (optionValue, position) => candidate[position] === undefined || optionValue === candidate[position]
              )
          );
        };

        if (input.type === 'radio') {
          const ok = check(input.value);
          if (ok) input.removeAttribute('data-unavailable');
          else input.setAttribute('data-unavailable', '');
          const label = input.id ? this.querySelector(`label[for="${input.id}"]`) : input.nextElementSibling;
          if (label) label.classList.toggle('is-unavailable', !ok);
        } else {
          Array.from(input.options).forEach((option) => {
            const ok = check(option.value);
            option.disabled = !ok;
            if (ok) option.removeAttribute('data-unavailable');
            else option.setAttribute('data-unavailable', '');
            if (option.hasAttribute('data-label')) {
              option.textContent = ok
                ? option.getAttribute('data-label')
                : `${option.getAttribute('data-label')} — ${strings.soldOut || 'Sold out'}`;
            }
          });
        }
      });
    }

    updateSelectedLabels(selected) {
      this.querySelectorAll('[data-selected-value]').forEach((node) => {
        const index = parseInt(node.getAttribute('data-option-index'), 10);
        if (!Number.isNaN(index) && selected[index] !== undefined) node.textContent = selected[index];
      });
    }

    updatePrice(variant) {
      const onSale = !!variant.compare_at_price && variant.compare_at_price > variant.price;
      const saving = onSale ? variant.compare_at_price - variant.price : 0;
      const saveText = (strings.saveAmount || 'Save [amount]').replace(
        '[amount]',
        money(saving, { trailingZeros: saving % 100 !== 0 })
      );

      // Inline hooks (markup contract).
      setText(this.querySelector('[data-price]'), money(variant.price));
      const compare = this.querySelector('[data-compare-price]');
      if (compare) {
        compare.textContent = onSale ? money(variant.compare_at_price) : '';
        show(compare, onSale);
      }
      const badge = this.querySelector('[data-save-badge]');
      if (badge) {
        badge.textContent = onSale ? saveText : '';
        show(badge, onSale);
      }

      // Section-level price container.
      if (this.priceTarget) {
        setText(this.priceTarget.querySelector('[data-price-current]'), money(variant.price));
        const compareTarget = this.priceTarget.querySelector('[data-price-compare]');
        if (compareTarget) {
          compareTarget.textContent = onSale ? money(variant.compare_at_price) : '';
          show(compareTarget, onSale);
        }
        const saveTarget = this.priceTarget.querySelector('[data-price-save]');
        if (saveTarget) {
          saveTarget.textContent = onSale ? saveText : '';
          show(saveTarget, onSale);
        }
        this.priceTarget.classList.toggle('price--on-sale', onSale);
      }
      this.querySelectorAll('.price').forEach((node) => node.classList.toggle('price--on-sale', onSale));
    }

    updateAvailability(variant) {
      const availability = this.querySelector('[data-availability]');
      if (variant.available) {
        const label = this.isPreorder ? strings.preorder || 'Pre-order' : strings.addToCart || 'Add to cart';
        this.setButton(label, false);
        setText(availability, this.isPreorder ? strings.preorder || '' : strings.inStock || '');
        if (availability) show(availability, !!availability.textContent);
      } else {
        this.setButton(strings.soldOut || 'Sold out', true);
        setText(availability, strings.soldOut || 'Sold out');
        show(availability, true);
      }
    }

    updateLowStock(variant) {
      const targets = [
        this.querySelector('[data-low-stock]'),
        this.scope.querySelector('[data-inventory-target]')
      ].filter(Boolean);
      if (targets.length === 0) return;

      const quantity = parseInt(variant.inventory_quantity, 10);
      const low =
        lowStockThreshold > 0 &&
        variant.inventory_management === 'shopify' &&
        variant.available &&
        !Number.isNaN(quantity) &&
        quantity > 0 &&
        quantity <= lowStockThreshold;

      const text = (strings.lowStock || 'Only [count] left').replace('[count]', quantity);
      targets.forEach((target) => {
        target.textContent = low ? text : '';
        show(target, low);
        target.classList.toggle('is-low', low);
      });
    }

    updateMedia(variant, initial) {
      if (!variant.featured_media) return;
      const mediaId = String(variant.featured_media.id);
      const gallery = this.scope.querySelector('[data-gallery]') || this.closest('[data-gallery]');
      const container = gallery || this.scope;
      const media = container.querySelector(`[data-media-id="${mediaId}"]`);
      if (!media) return;

      // Let a gallery component own the transition when it exposes one.
      if (gallery && typeof gallery.showMedia === 'function') {
        gallery.showMedia(mediaId, { initial });
      } else if (gallery && typeof gallery.setActiveMedia === 'function') {
        gallery.setActiveMedia(mediaId);
      } else {
        container.querySelectorAll('[data-media-id]').forEach((node) => {
          node.classList.toggle('is-active', node === media);
        });
        if (!initial && media.scrollIntoView) {
          const scroller = media.closest('[data-gallery-viewer]') || media.parentElement;
          if (scroller && scroller.scrollTo && scroller.scrollWidth > scroller.clientWidth) {
            scroller.scrollTo({ left: media.offsetLeft - scroller.offsetLeft, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
          } else {
            media.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
          }
        }
      }

      container.querySelectorAll('[data-thumb]').forEach((thumb) => {
        const active = thumb.getAttribute('data-thumb') === mediaId;
        thumb.setAttribute('aria-current', active ? 'true' : 'false');
        thumb.classList.toggle('is-active', active);
      });
    }

    updateURL(variant) {
      if (this.getAttribute('data-update-url') === 'false') return;
      if (!this.productUrl) return;
      // Only rewrite the URL when this form belongs to the page's own product
      // (a spotlight on the homepage must not add ?variant= to /).
      const productPath = this.productUrl.split('?')[0];
      if (!window.location.pathname.endsWith(productPath)) return;
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());
    }

    setButton(label, disabled) {
      if (!this.addButton) return;
      setText(this.addText || this.addButton, label);
      this.addButton.disabled = !!disabled;
      this.addButton.setAttribute('aria-disabled', String(!!disabled));
    }

    get quantity() {
      const value = this.quantityInput ? parseInt(this.quantityInput.value, 10) : 1;
      return Number.isNaN(value) || value < 1 ? 1 : value;
    }

    setQuantity(value) {
      if (!this.quantityInput) return;
      const next = Math.max(1, parseInt(value, 10) || 1);
      this.quantityInput.value = next;
      this.quantityInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    dispatchQuantity() {
      document.dispatchEvent(
        new CustomEvent('quantity:change', {
          detail: { quantity: this.quantity, variant: this.variant, sectionId: this.sectionId }
        })
      );
    }

    /* ----------------------------------------------------------- submit */

    async onSubmit(event) {
      if (typeof SB.addToCart !== 'function') return; // native post
      event.preventDefault();
      if (!this.addButton || this.addButton.disabled || this.busy) return;

      const original = (this.addText || this.addButton).textContent;
      this.busy = true;
      this.addButton.setAttribute('aria-busy', 'true');
      if (strings.adding) setText(this.addText || this.addButton, strings.adding);

      const formData = new FormData(this.form);
      if (this.quantityInput) formData.set('quantity', String(this.quantity));

      try {
        await SB.addToCart(formData, this.addButton);
        setText(this.addText || this.addButton, strings.added || original);
        window.setTimeout(() => this.restoreButton(original), 1800);
      } catch (error) {
        const message = error && error.message ? error.message : strings.cartError || original;
        setText(this.addText || this.addButton, message);
        this.showError(message);
        if (typeof SB.announce === 'function') SB.announce(message);
        window.setTimeout(() => this.restoreButton(original), 3200);
      } finally {
        this.busy = false;
        this.addButton.removeAttribute('aria-busy');
      }
    }

    restoreButton(original) {
      if (this.variant) this.updateAvailability(this.variant);
      else setText(this.addText || this.addButton, original);
      this.hideError();
    }

    showError(message) {
      const node = this.querySelector('[data-form-error]');
      if (!node) return;
      node.textContent = message;
      show(node, true);
    }

    hideError() {
      show(this.querySelector('[data-form-error]'), false);
    }
  }

  if (!customElements.get('product-form')) customElements.define('product-form', ProductForm);

  /* ------------------------------------------------------------ <sticky-atc>
     <sticky-atc data-form="<form id>" data-observe="<selector>">
       [data-sticky-image] [data-sticky-title] [data-sticky-price]
       <button data-sticky-button>
     </sticky-atc> */

  class StickyATC extends HTMLElement {
    connectedCallback() {
      this.formId = this.getAttribute('data-form') || '';
      this.form = this.formId ? document.getElementById(this.formId) : null;
      this.button = this.querySelector('[data-sticky-button]') || this.querySelector('button');
      this.priceNode = this.querySelector('[data-sticky-price]');
      this.compareNode = this.querySelector('[data-sticky-compare]');
      this.titleNode = this.querySelector('[data-sticky-title]');
      this.imageNode = this.querySelector('[data-sticky-image]');
      this.visible = false;

      const selector = this.getAttribute('data-observe');
      this.target =
        (selector && document.querySelector(selector)) ||
        (this.form && (this.form.querySelector('[data-add-button]') || this.form.querySelector('[type="submit"]'))) ||
        null;

      if (this.button) {
        this.button.addEventListener('click', (event) => {
          event.preventDefault();
          this.submit();
        });
      }

      this.onVariantChange = (event) => {
        const detail = event.detail || {};
        const productForm = this.form ? this.form.closest('product-form') : null;
        const sameSection = productForm && detail.sectionId && productForm.getAttribute('data-section-id') === detail.sectionId;
        const sameForm = productForm && productForm.contains(event.target);
        if (!sameSection && !sameForm && detail.sectionId !== this.getAttribute('data-section-id')) return;
        this.updateVariant(detail.variant);
      };
      document.addEventListener('variant:change', this.onVariantChange);

      // Pick up the initial variant (the product form may have fired before us).
      const productForm = this.form ? this.form.closest('product-form') : null;
      if (productForm && productForm.currentVariant) this.updateVariant(productForm.currentVariant);

      this.observe();
    }

    disconnectedCallback() {
      if (this.observer) this.observer.disconnect();
      if (this.onScroll) window.removeEventListener('scroll', this.onScroll);
      document.removeEventListener('variant:change', this.onVariantChange);
      this.setVisible(false);
    }

    observe() {
      if (!this.target) return;

      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              // Show once the buy button has scrolled above the viewport;
              // stay hidden while it is below (visitor has not reached it yet).
              const above = !entry.isIntersecting && entry.boundingClientRect.top < 0;
              this.setVisible(above);
            });
          },
          { threshold: 0 }
        );
        this.observer.observe(this.target);
      } else {
        this.onScroll = () => {
          const rect = this.target.getBoundingClientRect();
          this.setVisible(rect.bottom < 0);
        };
        window.addEventListener('scroll', this.onScroll, { passive: true });
        this.onScroll();
      }
    }

    setVisible(visible) {
      if (visible === this.visible) return;
      this.visible = visible;
      this.classList.toggle('is-visible', visible);
      this.setAttribute('aria-hidden', String(!visible));
      const height = visible ? Math.ceil(this.getBoundingClientRect().height) : 0;
      document.documentElement.style.setProperty('--sticky-atc-h', `${height}px`);
      document.dispatchEvent(
        new CustomEvent(visible ? 'sticky-atc:visible' : 'sticky-atc:hidden', { detail: { height } })
      );
    }

    updateVariant(variant) {
      if (!variant) return;
      if (this.priceNode) this.priceNode.textContent = money(variant.price);
      if (this.compareNode) {
        const onSale = !!variant.compare_at_price && variant.compare_at_price > variant.price;
        this.compareNode.textContent = onSale ? money(variant.compare_at_price) : '';
        show(this.compareNode, onSale);
      }
      if (this.titleNode && this.titleNode.hasAttribute('data-show-variant') && variant.title) {
        this.titleNode.textContent = variant.title === 'Default Title' ? this.titleNode.getAttribute('data-product-title') || '' : variant.title;
      }
      if (this.imageNode && variant.featured_image && variant.featured_image.src) {
        const src = variant.featured_image.src;
        const sized = src.replace(/(\.[a-z]{3,4})(\?.*)?$/i, '_160x160$1$2');
        this.imageNode.src = sized;
        this.imageNode.removeAttribute('srcset');
        if (variant.featured_image.alt) this.imageNode.alt = variant.featured_image.alt;
      }
      if (this.button) {
        const label = this.button.querySelector('[data-sticky-button-text]') || this.button;
        if (variant.available) {
          label.textContent = strings.addToCart || 'Add to cart';
          this.button.disabled = false;
        } else {
          label.textContent = strings.soldOut || 'Sold out';
          this.button.disabled = true;
        }
      }
    }

    submit() {
      if (!this.form) return;
      if (typeof this.form.requestSubmit === 'function') {
        this.form.requestSubmit();
      } else {
        const submitter = this.form.querySelector('[type="submit"]');
        if (submitter) submitter.click();
        else this.form.submit();
      }
    }
  }

  if (!customElements.get('sticky-atc')) customElements.define('sticky-atc', StickyATC);
})();
