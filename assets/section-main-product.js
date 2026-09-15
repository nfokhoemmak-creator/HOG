/* ==========================================================================
   Shark Bite — section-main-product.js
   Product page enhancements on top of product-form.js (CORE):

   <product-gallery>     scroll-snap viewer, thumbnails, arrows, lightbox
   <product-tiers>       quantity tier cards → form quantity, re-priced on
                         `variant:change` (SPEC §4 discount math)
   <product-ship-note>   free standard shipping projection (cart + this line)
   <bundle-companion>    "Complete the set" mini form → SB.addToCart({ items })
   <product-description> "Read more" collapse
   + copy-link buttons and swatch/pill selected-state sync.

   Everything degrades: without this file the form still posts to /cart/add,
   the gallery scrolls natively and the description is fully visible.
   ========================================================================== */

(function () {
  'use strict';

  const theme = window.theme || {};
  const strings = theme.strings || {};
  const REDUCED_MOTION =
    !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SB = () => window.SB || {};

  function money(cents, options) {
    const helpers = SB();
    if (typeof helpers.formatMoney === 'function') return helpers.formatMoney(cents, options);
    const trailing = !options || options.trailingZeros !== false;
    const value = (Number(cents) || 0) / 100;
    if (!trailing && Number.isInteger(value)) return `$${value}`;
    return `$${value.toFixed(2)}`;
  }

  function readJSON(node) {
    if (!node) return null;
    try {
      return JSON.parse(node.textContent);
    } catch (error) {
      return null;
    }
  }

  function show(node, visible) {
    if (!node) return;
    if (visible) node.removeAttribute('hidden');
    else node.setAttribute('hidden', '');
  }

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  /** Shopify's percentage allocation on one line: round(line × pct / 100). */
  function discountFor(lineCents, percent) {
    return Math.round((lineCents * percent) / 100);
  }

  function sizedImage(src, size) {
    return src.replace(/(\.[a-z]{3,4})(\?.*)?$/i, `_${size}$1$2`);
  }

  function productFormFor(formId) {
    const form = formId ? document.getElementById(formId) : null;
    return form ? form.closest('product-form') : null;
  }

  function sameSection(node, detail) {
    const id = node.getAttribute('data-section-id');
    return !!detail && !!id && detail.sectionId === id;
  }

  /* ------------------------------------------------------- <product-gallery> */

  class ProductGallery extends HTMLElement {
    connectedCallback() {
      this.viewer = this.querySelector('[data-gallery-viewer]');
      this.slides = Array.from(this.querySelectorAll('[data-media-id]'));
      this.thumbs = Array.from(this.querySelectorAll('[data-thumb]'));
      this.counter = this.querySelector('[data-gallery-current]');
      this.lightbox = document.getElementById(this.getAttribute('data-lightbox') || '');
      this.activeId = this.getAttribute('data-active-media') || (this.slides[0] && this.slides[0].getAttribute('data-media-id')) || '';

      this.thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => this.showMedia(thumb.getAttribute('data-thumb')));
      });

      const prev = this.querySelector('[data-gallery-prev]');
      const next = this.querySelector('[data-gallery-next]');
      if (prev) prev.addEventListener('click', () => this.step(-1));
      if (next) next.addEventListener('click', () => this.step(1));

      if (this.viewer) {
        this.viewer.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.step(-1);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.step(1);
          }
        });

        if ('IntersectionObserver' in window) {
          this.observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                  this.setActive(entry.target.getAttribute('data-media-id'));
                }
              });
            },
            { root: this.viewer, threshold: [0.6] }
          );
          this.slides.forEach((slide) => this.observer.observe(slide));
        }
      }

      this.addEventListener('click', (event) => {
        const opener = event.target.closest('[data-lightbox-open]');
        if (!opener) return;
        event.preventDefault();
        this.openLightbox(opener);
      });

      // The variant may have picked a slide that is not the first one.
      if (this.activeId) this.showMedia(this.activeId, { initial: true });
    }

    disconnectedCallback() {
      if (this.observer) this.observer.disconnect();
    }

    indexOf(id) {
      return this.slides.findIndex((slide) => slide.getAttribute('data-media-id') === String(id));
    }

    step(direction) {
      if (this.slides.length < 2) return;
      const current = Math.max(0, this.indexOf(this.activeId));
      const index = (current + direction + this.slides.length) % this.slides.length;
      this.showMedia(this.slides[index].getAttribute('data-media-id'));
    }

    setActive(id) {
      id = String(id);
      this.activeId = id;
      this.slides.forEach((slide) => {
        const active = slide.getAttribute('data-media-id') === id;
        slide.classList.toggle('is-active', active);
        if (!active) this.pauseMedia(slide);
      });
      this.thumbs.forEach((thumb) => {
        const active = thumb.getAttribute('data-thumb') === id;
        thumb.classList.toggle('is-active', active);
        thumb.setAttribute('aria-current', active ? 'true' : 'false');
        if (active && thumb.scrollIntoView && this.thumbs.length > 1) {
          thumb.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
        }
      });
      const index = this.indexOf(id);
      if (this.counter && index >= 0) this.counter.textContent = String(index + 1);
    }

    pauseMedia(slide) {
      const video = slide.querySelector('video');
      if (video && !video.paused) video.pause();
    }

    /** Called by product-form.js on variant change (gallery.showMedia(id, { initial })). */
    showMedia(id, options) {
      id = String(id);
      const slide = this.slides[this.indexOf(id)];
      if (!slide) return;
      if (this.viewer) {
        const instant = REDUCED_MOTION || (options && options.initial);
        const left = slide.offsetLeft;
        if (typeof this.viewer.scrollTo === 'function') {
          this.viewer.scrollTo({ left, behavior: instant ? 'auto' : 'smooth' });
        } else {
          this.viewer.scrollLeft = left;
        }
      }
      this.setActive(id);
    }

    openLightbox(opener) {
      if (!this.lightbox || typeof this.lightbox.open !== 'function') return;
      const image = this.lightbox.querySelector('[data-lightbox-image]');
      if (image) {
        const src = opener.getAttribute('data-large-src');
        if (src && image.getAttribute('src') !== src) {
          image.setAttribute('src', src);
          image.removeAttribute('srcset');
        }
        const width = opener.getAttribute('data-large-width');
        const height = opener.getAttribute('data-large-height');
        if (width) image.setAttribute('width', width);
        if (height) image.setAttribute('height', height);
        image.setAttribute('alt', opener.getAttribute('data-large-alt') || '');
      }
      this.lightbox.open(opener);
    }
  }

  if (!customElements.get('product-gallery')) customElements.define('product-gallery', ProductGallery);

  /* --------------------------------------------------------- <product-tiers> */

  class ProductTiers extends HTMLElement {
    connectedCallback() {
      this.price = parseInt(this.getAttribute('data-price'), 10) || 0;
      this.percent = parseInt(this.getAttribute('data-percent'), 10) || 0;
      this.min = parseInt(this.getAttribute('data-min'), 10) || 2;
      this.threshold = parseInt(this.getAttribute('data-threshold'), 10) || 0;
      this.cartTotal = parseInt(this.getAttribute('data-cart-total'), 10) || 0;
      this.saveTemplate = this.getAttribute('data-save-template') || 'Save [amount]';
      this.secondTemplate = this.getAttribute('data-second-template') || '';
      this.tiers = Array.from(this.querySelectorAll('[data-tier]'));
      this.inputs = Array.from(this.querySelectorAll('[data-tier-input]'));
      this.formId = this.getAttribute('data-form') || '';

      this.onChange = this.onChange.bind(this);
      this.onVariantChange = (event) => {
        if (!sameSection(this, event.detail) || !event.detail.variant) return;
        this.price = parseInt(event.detail.variant.price, 10) || this.price;
        this.render();
      };
      this.onQuantityChange = (event) => {
        if (!sameSection(this, event.detail)) return;
        this.syncFromQuantity(event.detail.quantity);
      };
      this.onCartUpdated = (event) => {
        const cart = event.detail && event.detail.cart;
        if (!cart) return;
        this.cartTotal = parseInt(cart.total_price, 10) || 0;
        this.render();
      };

      this.inputs.forEach((input) => input.addEventListener('change', this.onChange));
      document.addEventListener('variant:change', this.onVariantChange);
      document.addEventListener('quantity:change', this.onQuantityChange);
      document.addEventListener('cart:updated', this.onCartUpdated);

      // product-form.js may have fired its initial variant:change before we
      // were defined; read the live state instead of waiting for the next one.
      const productForm = productFormFor(this.formId);
      if (productForm) {
        if (productForm.currentVariant) this.price = parseInt(productForm.currentVariant.price, 10) || this.price;
        this.syncFromQuantity(productForm.quantity);
      }
      this.render();
    }

    disconnectedCallback() {
      this.inputs.forEach((input) => input.removeEventListener('change', this.onChange));
      document.removeEventListener('variant:change', this.onVariantChange);
      document.removeEventListener('quantity:change', this.onQuantityChange);
      document.removeEventListener('cart:updated', this.onCartUpdated);
    }

    get selectedQuantity() {
      const checked = this.inputs.find((input) => input.checked);
      return checked ? parseInt(checked.value, 10) || 1 : 0;
    }

    onChange(event) {
      const quantity = parseInt(event.target.value, 10) || 1;
      this.markSelected();
      const productForm = productFormFor(this.formId);
      if (productForm && typeof productForm.setQuantity === 'function') {
        if (productForm.quantity !== quantity) productForm.setQuantity(quantity);
      } else {
        const form = document.getElementById(this.formId);
        const input = form ? form.querySelector('input[name="quantity"]') : null;
        if (input) {
          input.value = quantity;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }

    syncFromQuantity(quantity) {
      const q = parseInt(quantity, 10) || 1;
      this.inputs.forEach((input) => {
        input.checked = parseInt(input.value, 10) === q;
      });
      this.markSelected();
    }

    markSelected() {
      this.tiers.forEach((tier) => {
        const input = tier.querySelector('[data-tier-input]');
        tier.classList.toggle('is-selected', !!(input && input.checked));
      });
    }

    render() {
      this.tiers.forEach((tier) => {
        const q = parseInt(tier.getAttribute('data-tier-qty'), 10) || 1;
        const line = this.price * q;
        const discount = this.percent > 0 && q >= this.min ? discountFor(line, this.percent) : 0;
        const total = line - discount;
        const shipsFree = this.threshold > 0 && this.cartTotal + total >= this.threshold;

        setText(tier.querySelector('[data-tier-total]'), money(total));

        const regular = tier.querySelector('[data-tier-regular]');
        if (regular) {
          regular.textContent = discount > 0 ? money(line) : '';
          show(regular, discount > 0);
        }

        const saving = tier.querySelector('[data-tier-saving]');
        if (saving) {
          saving.textContent =
            discount > 0 ? this.saveTemplate.replace('[amount]', money(discount, { trailingZeros: discount % 100 !== 0 })) : '';
          show(saving, discount > 0);
        }

        const second = tier.querySelector('[data-tier-second]');
        if (second && this.secondTemplate) {
          second.textContent = this.secondTemplate.replace('[price]', money(total - this.price));
        }

        show(tier.querySelector('[data-tier-ship]'), shipsFree);
        const note = tier.querySelector('[data-tier-note]');
        if (note) show(note, !shipsFree);
      });
    }
  }

  if (!customElements.get('product-tiers')) customElements.define('product-tiers', ProductTiers);

  /* ----------------------------------------------------- <product-ship-note> */

  class ProductShipNote extends HTMLElement {
    connectedCallback() {
      this.threshold = parseInt(this.getAttribute('data-threshold'), 10) || 0;
      this.cartTotal = parseInt(this.getAttribute('data-cart-total'), 10) || 0;
      this.price = parseInt(this.getAttribute('data-price'), 10) || 0;
      this.quantity = parseInt(this.getAttribute('data-quantity'), 10) || 1;
      this.percent = parseInt(this.getAttribute('data-percent'), 10) || 0;
      this.min = parseInt(this.getAttribute('data-min'), 10) || 2;
      this.qualifiesText = this.getAttribute('data-qualifies-text') || '';
      this.needsTemplate = this.getAttribute('data-needs-template') || '';
      this.tiersAnchor = this.getAttribute('data-tiers-anchor') || '';
      this.textNode = this.querySelector('[data-ship-text]');
      this.iconCheck = this.querySelector('[data-ship-icon="check"]');
      this.iconTruck = this.querySelector('[data-ship-icon="truck"]');

      this.onVariantChange = (event) => {
        if (!sameSection(this, event.detail) || !event.detail.variant) return;
        this.price = parseInt(event.detail.variant.price, 10) || this.price;
        if (event.detail.quantity) this.quantity = parseInt(event.detail.quantity, 10) || this.quantity;
        this.render();
      };
      this.onQuantityChange = (event) => {
        if (!sameSection(this, event.detail)) return;
        this.quantity = parseInt(event.detail.quantity, 10) || 1;
        this.render();
      };
      this.onCartUpdated = (event) => {
        const cart = event.detail && event.detail.cart;
        if (!cart) return;
        this.cartTotal = parseInt(cart.total_price, 10) || 0;
        this.render();
      };

      document.addEventListener('variant:change', this.onVariantChange);
      document.addEventListener('quantity:change', this.onQuantityChange);
      document.addEventListener('cart:updated', this.onCartUpdated);

      const productForm = this.closest('product-form');
      if (productForm) {
        if (productForm.currentVariant) this.price = parseInt(productForm.currentVariant.price, 10) || this.price;
        if (productForm.quantity) this.quantity = productForm.quantity;
      }
      this.render();
    }

    disconnectedCallback() {
      document.removeEventListener('variant:change', this.onVariantChange);
      document.removeEventListener('quantity:change', this.onQuantityChange);
      document.removeEventListener('cart:updated', this.onCartUpdated);
    }

    render() {
      if (!this.textNode || this.threshold <= 0) return;
      const line = this.price * this.quantity;
      const discount = this.percent > 0 && this.quantity >= this.min ? discountFor(line, this.percent) : 0;
      const projected = this.cartTotal + line - discount;
      const qualifies = projected >= this.threshold;

      this.classList.toggle('ship-bar--unlocked', qualifies);
      show(this.iconCheck, qualifies);
      show(this.iconTruck, !qualifies);

      if (qualifies) {
        this.textNode.textContent = this.qualifiesText;
        return;
      }

      const away = money(this.threshold - projected, { trailingZeros: false });
      const parts = this.needsTemplate.split(' — ');
      const head = parts[0].replace('[amount]', away);
      // The "or grab a 2nd pair" half only makes sense when the tiers block is
      // on the page; mirror the Liquid render and drop it otherwise.
      const tail = parts.length > 1 && this.tiersAnchor ? parts.slice(1).join(' — ').replace('[amount]', away) : '';

      this.textNode.textContent = '';
      this.textNode.appendChild(document.createTextNode(head));
      if (tail) {
        this.textNode.appendChild(document.createTextNode(' — '));
        const link = document.createElement('a');
        link.href = this.tiersAnchor;
        link.setAttribute('data-ship-tiers-link', '');
        link.textContent = tail;
        this.textNode.appendChild(link);
      }
    }
  }

  if (!customElements.get('product-ship-note')) customElements.define('product-ship-note', ProductShipNote);

  /* ------------------------------------------------------ <bundle-companion> */

  class BundleCompanion extends HTMLElement {
    connectedCallback() {
      this.variants = readJSON(this.querySelector('script[data-variants]')) || [];
      this.selects = Array.from(this.querySelectorAll('select[data-option-index]'));
      this.button = this.querySelector('[data-companion-add]');
      this.buttonText = this.querySelector('[data-companion-text]');
      this.priceNode = this.querySelector('[data-companion-price]');
      this.compareNode = this.querySelector('[data-companion-compare]');
      this.image = this.querySelector('[data-companion-image]');
      this.error = this.querySelector('[data-companion-error]');
      this.url = this.getAttribute('data-url') || '';
      this.busy = false;

      this.onChange = () => this.update();
      this.onAdd = this.onAdd.bind(this);
      this.selects.forEach((select) => select.addEventListener('change', this.onChange));
      if (this.button) {
        this.button.addEventListener('click', this.onAdd);
        show(this.button, true);
      }
      this.update();
    }

    disconnectedCallback() {
      this.selects.forEach((select) => select.removeEventListener('change', this.onChange));
      if (this.button) this.button.removeEventListener('click', this.onAdd);
    }

    selectedOptions() {
      const selected = [];
      this.selects.forEach((select) => {
        const index = parseInt(select.getAttribute('data-option-index'), 10);
        if (!Number.isNaN(index)) selected[index] = select.value;
      });
      return selected;
    }

    findVariant(selected) {
      if (this.selects.length === 0) return this.variants.find((v) => v.available) || this.variants[0] || null;
      return (
        this.variants.find((variant) =>
          variant.options.every((value, index) => selected[index] === undefined || value === selected[index])
        ) || null
      );
    }

    markAvailability(selected) {
      this.selects.forEach((select) => {
        const index = parseInt(select.getAttribute('data-option-index'), 10);
        Array.from(select.options).forEach((option) => {
          const candidate = selected.slice();
          candidate[index] = option.value;
          const ok = this.variants.some(
            (variant) =>
              variant.available &&
              variant.options.every((value, position) => candidate[position] === undefined || value === candidate[position])
          );
          option.disabled = !ok;
          const label = option.getAttribute('data-label');
          if (label) option.textContent = ok ? label : `${label} — ${strings.soldOut || 'Sold out'}`;
        });
      });
    }

    update() {
      const selected = this.selectedOptions();
      this.variant = this.findVariant(selected);
      this.markAvailability(selected);
      this.hideError();

      if (!this.variant) {
        this.setButton(strings.unavailable || 'Unavailable', true);
        return;
      }

      const variant = this.variant;
      const onSale = !!variant.compare_at_price && variant.compare_at_price > variant.price;
      setText(this.priceNode, money(variant.price));
      if (this.compareNode) {
        this.compareNode.textContent = onSale ? money(variant.compare_at_price) : '';
        show(this.compareNode, onSale);
      }
      const priceWrap = this.querySelector('.price');
      if (priceWrap) priceWrap.classList.toggle('price--on-sale', onSale);

      if (this.image && variant.featured_image && variant.featured_image.src) {
        this.image.src = sizedImage(variant.featured_image.src, '480x480');
        this.image.removeAttribute('srcset');
      }

      if (variant.available) this.setButton(strings.addToCart || 'Add to cart', false);
      else this.setButton(strings.soldOut || 'Sold out', true);
    }

    setButton(label, disabled) {
      if (!this.button) return;
      setText(this.buttonText || this.button, label);
      this.button.disabled = !!disabled;
      this.button.setAttribute('aria-disabled', String(!!disabled));
    }

    showError(message) {
      if (!this.error) return;
      this.error.textContent = message;
      show(this.error, true);
    }

    hideError() {
      show(this.error, false);
    }

    async onAdd(event) {
      event.preventDefault();
      if (!this.variant || this.busy || (this.button && this.button.disabled)) return;

      const helpers = SB();
      if (typeof helpers.addToCart !== 'function') {
        const separator = this.url.includes('?') ? '&' : '?';
        window.location.href = `${this.url}${separator}variant=${this.variant.id}`;
        return;
      }

      const original = (this.buttonText || this.button).textContent;
      this.busy = true;
      this.button.setAttribute('aria-busy', 'true');
      setText(this.buttonText || this.button, strings.adding || original);

      try {
        await helpers.addToCart({ items: [{ id: this.variant.id, quantity: 1 }] }, this.button);
        setText(this.buttonText || this.button, strings.added || original);
        window.setTimeout(() => this.update(), 1800);
      } catch (error) {
        const message = error && error.message ? error.message : strings.cartError || original;
        this.showError(message);
        if (typeof helpers.announce === 'function') helpers.announce(message);
        setText(this.buttonText || this.button, original);
      } finally {
        this.busy = false;
        this.button.removeAttribute('aria-busy');
      }
    }
  }

  if (!customElements.get('bundle-companion')) customElements.define('bundle-companion', BundleCompanion);

  /* --------------------------------------------------- <product-description> */

  class ProductDescription extends HTMLElement {
    connectedCallback() {
      this.body = this.querySelector('[data-description-body]');
      this.toggle = this.querySelector('[data-description-toggle]');
      this.label = this.querySelector('[data-description-toggle-text]');
      if (!this.body || !this.toggle || !this.hasAttribute('data-collapse')) return;

      this.onToggle = () => this.setExpanded(this.classList.contains('is-collapsed'));
      this.toggle.addEventListener('click', this.onToggle);

      this.measure = () => {
        if (this.expanded) return;
        this.classList.add('is-collapsed');
        const overflows = this.body.scrollHeight > this.body.clientHeight + 4;
        this.classList.toggle('is-collapsed', overflows);
        show(this.toggle, overflows);
      };
      this.measure();
      window.addEventListener('resize', this.measure);
    }

    disconnectedCallback() {
      if (this.onToggle) this.toggle.removeEventListener('click', this.onToggle);
      if (this.measure) window.removeEventListener('resize', this.measure);
    }

    setExpanded(expanded) {
      this.expanded = expanded;
      this.classList.toggle('is-collapsed', !expanded);
      this.toggle.setAttribute('aria-expanded', String(expanded));
      if (this.label) {
        this.label.textContent = expanded
          ? this.label.getAttribute('data-less') || 'Read less'
          : this.label.getAttribute('data-more') || 'Read more';
      }
      if (!expanded && this.getBoundingClientRect().top < 0) {
        this.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'start' });
      }
    }
  }

  if (!customElements.get('product-description')) customElements.define('product-description', ProductDescription);

  /* ------------------------------------------------------- global listeners */

  function bindDocument() {
    // This file is loaded by main-product and complete-the-set; bind once per page.
    if (window.__sbMainProductBound) return;
    window.__sbMainProductBound = true;

    // Copy link (share block).
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-copy-link]');
      if (!button) return;
      event.preventDefault();
      const url = button.getAttribute('data-copy-link') || window.location.href;
      const label = button.querySelector('[data-copy-link-text]') || button;
      const original = label.textContent;
      const copied = button.getAttribute('data-copied-text') || original;

      let ok = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url);
          ok = true;
        }
      } catch (error) {
        ok = false;
      }
      if (!ok) {
        const input = document.createElement('input');
        input.value = url;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        try {
          ok = document.execCommand('copy');
        } catch (error) {
          ok = false;
        }
        document.body.removeChild(input);
      }
      if (ok) {
        label.textContent = copied;
        const helpers = SB();
        if (typeof helpers.announce === 'function') helpers.announce(copied);
        window.setTimeout(() => {
          label.textContent = original;
        }, 2000);
      }
    });

    // Keep the selected swatch / pill class in sync for browsers without :has().
    document.addEventListener('change', (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return;
      const group = input.closest('.product-option');
      if (!group) return;
      group.querySelectorAll('.swatch, .size-pill').forEach((label) => {
        const radio = label.querySelector('input[type="radio"]');
        label.classList.toggle('is-selected', !!(radio && radio.checked));
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindDocument);
  } else {
    bindDocument();
  }
})();
