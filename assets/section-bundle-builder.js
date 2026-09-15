/*
  Shark Bite — Bundle builder
  <bundle-builder> drives the bundle cards: slot pickers (product toggle,
  Style/Size selects driven by option order from the product JSON),
  availability-aware selects, live pricing that mirrors Shopify's automatic
  discounts (see SPEC §4 "Discount math") and a multi-line add-to-cart
  through window.SB.addToCart. Degrades to product links without JS.
*/
(function () {
  'use strict';

  if (!window.customElements || window.customElements.get('bundle-builder')) return;

  var theme = window.theme || {};

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function formatMoney(cents, options) {
    if (window.SB && typeof window.SB.formatMoney === 'function') {
      return window.SB.formatMoney(cents, options);
    }
    var amount = (Number(cents) || 0) / 100;
    var fixed = amount.toFixed(2);
    if (options && options.trailingZeros === false && /\.00$/.test(fixed)) fixed = fixed.slice(0, -3);
    return '$' + fixed;
  }

  function announce(text) {
    if (window.SB && typeof window.SB.announce === 'function') window.SB.announce(text);
  }

  function parseJSON(el, fallback) {
    if (!el) return fallback;
    try {
      return JSON.parse(el.textContent);
    } catch (error) {
      return fallback;
    }
  }

  /* --------------------------------------------------------------- Slot */

  function Slot(el, card) {
    this.el = el;
    this.card = card;
    this.builder = card.builder;
    this.kind = el.getAttribute('data-slot-kind') || 'slipper';
    this.toggle = el.querySelector('[data-slot-toggle]');
    this.body = el.querySelector('[data-slot-body]');
    this.summaryEl = el.querySelector('[data-slot-summary]');
    this.thumbEl = el.querySelector('[data-slot-thumb]');
    this.optionsEl = el.querySelector('[data-slot-options]');
    this.doneButton = el.querySelector('[data-slot-done]');
    this.product = this.builder.products[el.getAttribute('data-product-id')] || null;
    this.variant = null;
    this.selected = [];

    var self = this;

    if (this.toggle) {
      this.toggle.addEventListener('click', function () {
        self.setOpen(!self.isOpen());
      });
    }

    if (this.doneButton) {
      this.doneButton.addEventListener('click', function () {
        self.setOpen(false);
        if (self.toggle) self.toggle.focus();
      });
    }

    var radios = el.querySelectorAll('[data-slot-product]');
    Array.prototype.forEach.call(radios, function (radio) {
      radio.addEventListener('change', function () {
        if (!radio.checked) return;
        self.setProduct(radio.value);
      });
    });

    this.bindSelects();

    if (this.product) {
      var initialId = el.getAttribute('data-variant-id');
      var initial = this.findVariantById(initialId) || this.firstAvailableVariant() || this.product.variants[0] || null;
      this.selected = initial ? initial.options.slice() : [];
      this.syncSelectsFromSelection();
      this.resolve();
    }
  }

  Slot.prototype.isOpen = function () {
    return this.toggle ? this.toggle.getAttribute('aria-expanded') === 'true' : false;
  };

  Slot.prototype.setOpen = function (open) {
    if (!this.toggle || !this.body) return;
    if (open) this.card.closeOtherSlots(this);
    this.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    this.body.hidden = !open;
    this.el.classList.toggle('is-open', open);
    if (open) {
      var first = this.body.querySelector('input:checked, select');
      if (first && typeof first.focus === 'function') {
        try {
          first.focus({ preventScroll: true });
        } catch (error) {
          first.focus();
        }
      }
    }
  };

  Slot.prototype.bindSelects = function () {
    var self = this;
    this.selects = Array.prototype.slice.call(this.el.querySelectorAll('select[data-option-index]'));
    this.selects.forEach(function (select) {
      select.addEventListener('change', function () {
        var index = toNumber(select.getAttribute('data-option-index'), 0);
        self.selected[index] = select.value;
        self.resolve(index);
      });
    });
  };

  Slot.prototype.findVariantById = function (id) {
    if (!this.product || !id) return null;
    var wanted = String(id);
    for (var i = 0; i < this.product.variants.length; i += 1) {
      if (String(this.product.variants[i].id) === wanted) return this.product.variants[i];
    }
    return null;
  };

  Slot.prototype.firstAvailableVariant = function () {
    if (!this.product) return null;
    for (var i = 0; i < this.product.variants.length; i += 1) {
      if (this.product.variants[i].available) return this.product.variants[i];
    }
    return null;
  };

  Slot.prototype.findVariant = function (selection) {
    if (!this.product) return null;
    for (var i = 0; i < this.product.variants.length; i += 1) {
      var variant = this.product.variants[i];
      var matches = true;
      for (var j = 0; j < selection.length; j += 1) {
        if (variant.options[j] !== selection[j]) {
          matches = false;
          break;
        }
      }
      if (matches) return variant;
    }
    return null;
  };

  /* Is `value` at option `index` purchasable given the options chosen before it? (Dawn's rule) */
  Slot.prototype.valueAvailable = function (index, value) {
    if (!this.product) return false;
    for (var i = 0; i < this.product.variants.length; i += 1) {
      var variant = this.product.variants[i];
      if (!variant.available || variant.options[index] !== value) continue;
      var ok = true;
      for (var j = 0; j < index; j += 1) {
        if (variant.options[j] !== this.selected[j]) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
  };

  Slot.prototype.valuesFor = function (index) {
    var values = [];
    if (!this.product) return values;
    this.product.variants.forEach(function (variant) {
      var value = variant.options[index];
      if (values.indexOf(value) === -1) values.push(value);
    });
    return values;
  };

  /* Swap the whole product (segmented toggle): rebuild the selects from the JSON. */
  Slot.prototype.setProduct = function (productId) {
    var product = this.builder.products[String(productId)];
    if (!product || !this.optionsEl) return;
    this.product = product;
    this.el.setAttribute('data-product-id', String(product.id));

    var initial = this.firstAvailableVariant() || product.variants[0] || null;
    this.selected = initial ? initial.options.slice() : [];

    var self = this;
    var baseName = this.el.id || (this.toggle && this.toggle.getAttribute('aria-controls')) || 'slot';
    this.optionsEl.innerHTML = '';

    product.options.forEach(function (optionName, index) {
      var label = document.createElement('label');
      label.className = 'field bundle__field';

      var span = document.createElement('span');
      span.className = 'field__label small';
      span.textContent = optionName;

      var select = document.createElement('select');
      select.className = 'select';
      select.name = baseName + '-option-' + index;
      select.setAttribute('data-option-index', String(index));

      self.valuesFor(index).forEach(function (value) {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

      label.appendChild(span);
      label.appendChild(select);
      self.optionsEl.appendChild(label);
    });

    this.bindSelects();
    this.syncSelectsFromSelection();
    this.resolve();
  };

  Slot.prototype.syncSelectsFromSelection = function () {
    var self = this;
    this.selects.forEach(function (select) {
      var index = toNumber(select.getAttribute('data-option-index'), 0);
      if (self.selected[index] !== undefined) select.value = self.selected[index];
    });
  };

  /*
    Resolve the selection to a variant. After a change at `changedIndex`,
    later options fall back to the first purchasable value so the picker never
    lands on a sold-out combination while one exists.
  */
  Slot.prototype.resolve = function (changedIndex) {
    if (!this.product) return;
    var optionCount = this.product.options.length;
    var start = typeof changedIndex === 'number' ? changedIndex + 1 : 0;

    for (var index = start; index < optionCount; index += 1) {
      var current = this.selected[index];
      if (current !== undefined && this.valueAvailable(index, current)) continue;
      var values = this.valuesFor(index);
      var picked = null;
      for (var v = 0; v < values.length; v += 1) {
        if (this.valueAvailable(index, values[v])) {
          picked = values[v];
          break;
        }
      }
      if (picked === null && current === undefined && values.length) picked = values[0];
      if (picked !== null) this.selected[index] = picked;
    }

    this.variant = this.findVariant(this.selected);
    this.markAvailability();
    this.syncSelectsFromSelection();
    this.renderSummary();
    this.el.setAttribute('data-variant-id', this.variant ? String(this.variant.id) : '');
    this.el.classList.toggle('is-unavailable', !this.isAvailable());
    this.card.update();
  };

  Slot.prototype.markAvailability = function () {
    var self = this;
    var soldOut = this.builder.strings.soldOut || 'Sold out';
    this.selects.forEach(function (select) {
      var index = toNumber(select.getAttribute('data-option-index'), 0);
      Array.prototype.forEach.call(select.options, function (option) {
        var available = self.valueAvailable(index, option.value);
        option.disabled = !available;
        option.textContent = available ? option.value : option.value + ' — ' + soldOut;
      });
    });
  };

  Slot.prototype.isAvailable = function () {
    return Boolean(this.variant && this.variant.available);
  };

  Slot.prototype.renderSummary = function () {
    if (!this.product) return;
    var parts = [this.product.label || this.product.title];
    if (this.variant) {
      this.variant.options.forEach(function (value) {
        if (value && value !== 'Default Title') parts.push(value);
      });
      if (!this.variant.available) parts.push(this.builder.strings.soldOut || 'Sold out');
    }
    if (this.summaryEl) this.summaryEl.textContent = parts.join(' · ');

    if (this.thumbEl) {
      var image = (this.variant && this.variant.image) || this.product.featured_image;
      if (image) {
        this.thumbEl.src = image;
        this.thumbEl.hidden = false;
      } else {
        this.thumbEl.hidden = true;
      }
    }
  };

  /* --------------------------------------------------------------- Card */

  function Card(el, builder) {
    this.el = el;
    this.builder = builder;
    this.addButton = el.querySelector('[data-bundle-add]');
    this.addText = el.querySelector('[data-bundle-add-text]');
    this.errorEl = el.querySelector('[data-bundle-error]');
    this.regularEl = el.querySelector('[data-bundle-regular]');
    this.totalEl = el.querySelector('[data-bundle-total]');
    this.saveEl = el.querySelector('[data-bundle-save]');
    this.shipEl = el.querySelector('[data-bundle-ship]');
    this.shipTextEl = el.querySelector('[data-bundle-ship-text]');
    this.busy = false;
    this.resetTimer = null;
    this.slots = [];

    var self = this;
    var slotEls = el.querySelectorAll('[data-slot]');
    this.ready = false;
    Array.prototype.forEach.call(slotEls, function (slotEl) {
      self.slots.push(new Slot(slotEl, self));
    });
    this.ready = true;

    if (this.addButton) {
      this.addButton.addEventListener('click', function (event) {
        event.preventDefault();
        self.add();
      });
    }

    this.update();
  }

  Card.prototype.closeOtherSlots = function (keep) {
    this.slots.forEach(function (slot) {
      if (slot !== keep && slot.isOpen()) slot.setOpen(false);
    });
  };

  /* One cart line per distinct variant; identical variants merge (quantity summed). */
  Card.prototype.lines = function () {
    var lines = [];
    var byId = {};
    this.slots.forEach(function (slot) {
      if (!slot.variant) return;
      var id = String(slot.variant.id);
      if (byId[id]) {
        byId[id].quantity += 1;
        return;
      }
      byId[id] = {
        id: slot.variant.id,
        quantity: 1,
        price: toNumber(slot.variant.price, 0),
        kind: slot.kind,
        available: Boolean(slot.variant.available)
      };
      lines.push(byId[id]);
    });
    return lines;
  };

  /* Mirrors Shopify's allocation: round(line × pct / 100) per line, totals summed. */
  Card.prototype.pricing = function () {
    var lines = this.lines();
    var tierPercent = this.builder.tierPercent;
    var tierMin = this.builder.tierMin;
    var setPercent = this.builder.setPercent;

    var slipperQty = 0;
    lines.forEach(function (line) {
      if (line.kind === 'slipper') slipperQty += line.quantity;
    });

    var regular = 0;
    var total = 0;
    var blanketDiscounted = false;

    lines.forEach(function (line) {
      var lineCents = line.price * line.quantity;
      var discount = 0;
      if (line.kind === 'slipper' && tierPercent > 0 && slipperQty >= tierMin) {
        discount = Math.round((lineCents * tierPercent) / 100);
      } else if (line.kind === 'blanket' && setPercent > 0 && slipperQty >= 1 && !blanketDiscounted) {
        discount = Math.round((line.price * setPercent) / 100);
        blanketDiscounted = true;
      }
      regular += lineCents;
      total += lineCents - discount;
    });

    var savings = regular - total;
    return {
      lines: lines,
      regular: regular,
      total: total,
      savings: savings,
      percent: regular > 0 ? Math.round((savings * 100) / regular) : 0,
      available: lines.length > 0 && lines.every(function (line) { return line.available; })
    };
  };

  Card.prototype.update = function () {
    if (!this.ready) return;
    var strings = this.builder.strings;
    var pricing = this.pricing();

    if (this.totalEl) this.totalEl.textContent = formatMoney(pricing.total);

    if (this.regularEl) {
      var hidden = pricing.savings <= 0;
      this.regularEl.hidden = hidden;
      var label = this.regularEl.querySelector('.visually-hidden');
      this.regularEl.textContent = '';
      if (label) this.regularEl.appendChild(label);
      this.regularEl.appendChild(document.createTextNode(formatMoney(pricing.regular)));
    }

    if (this.saveEl) {
      this.saveEl.hidden = pricing.savings <= 0;
      var saveTemplate = strings.save || 'Save [amount]';
      this.saveEl.textContent =
        saveTemplate.replace('[amount]', formatMoney(pricing.savings, { trailingZeros: false })) +
        ' (' + pricing.percent + '%)';
    }

    if (this.shipEl && this.shipTextEl && this.builder.threshold > 0) {
      var unlocked = pricing.total >= this.builder.threshold;
      this.shipEl.classList.toggle('bundle__ship--unlocked', unlocked);
      Array.prototype.forEach.call(this.shipEl.querySelectorAll('[data-bundle-ship-icon]'), function (icon) {
        icon.hidden = (icon.getAttribute('data-bundle-ship-icon') === 'unlocked') !== unlocked;
      });
      if (unlocked) {
        this.shipTextEl.textContent = strings.shipIncluded || 'Free standard shipping included';
      } else {
        var away = this.builder.threshold - pricing.total;
        this.shipTextEl.textContent = (strings.shipAway || 'Add [amount] more for free standard shipping')
          .replace('[amount]', formatMoney(away, { trailingZeros: false }));
      }
    }

    if (this.addButton && !this.busy) {
      if (pricing.available) {
        this.addButton.removeAttribute('aria-disabled');
        if (this.addText) this.addText.textContent = strings.add || 'Add bundle to cart';
      } else {
        this.addButton.setAttribute('aria-disabled', 'true');
        if (this.addText) this.addText.textContent = strings.soldOut || 'Sold out';
      }
    }
  };

  Card.prototype.setBusy = function (busy) {
    this.busy = busy;
    if (!this.addButton) return;
    if (busy) {
      this.addButton.setAttribute('aria-busy', 'true');
      if (this.addText) this.addText.textContent = this.builder.strings.adding || 'Adding…';
    } else {
      this.addButton.removeAttribute('aria-busy');
    }
  };

  Card.prototype.showError = function (message) {
    if (!this.errorEl) return;
    this.errorEl.textContent = message;
    this.errorEl.hidden = false;
  };

  Card.prototype.clearError = function () {
    if (!this.errorEl) return;
    this.errorEl.textContent = '';
    this.errorEl.hidden = true;
  };

  Card.prototype.add = function () {
    var self = this;
    if (this.busy) return;
    var pricing = this.pricing();
    if (!pricing.available) {
      this.showError(this.builder.strings.soldOut || 'Sold out');
      return;
    }
    this.clearError();

    var items = pricing.lines.map(function (line) {
      return { id: line.id, quantity: line.quantity };
    });

    if (!window.SB || typeof window.SB.addToCart !== 'function') {
      this.nativeFallback(items);
      return;
    }

    this.setBusy(true);
    window.clearTimeout(this.resetTimer);

    window.SB.addToCart({ items: items }, this.addButton)
      .then(function () {
        self.setBusy(false);
        var added = self.builder.strings.added || (theme.strings && theme.strings.bundleAdded) || 'Added';
        if (self.addText) self.addText.textContent = added;
        self.addButton.classList.add('is-success');
        announce(added);
        self.resetTimer = window.setTimeout(function () {
          self.addButton.classList.remove('is-success');
          self.update();
        }, 3200);
      })
      .catch(function (error) {
        self.setBusy(false);
        self.update();
        var message = (error && error.message) || self.builder.strings.error || 'Something went wrong.';
        self.showError(message);
        announce(message);
      });
  };

  /* No SB helper available: post the lines straight to the Ajax API, then go to the cart page. */
  Card.prototype.nativeFallback = function (items) {
    var self = this;
    var routes = theme.routes || {};
    var addUrl = (routes.cartAdd || '/cart/add') + '.js';
    var cartUrl = routes.cart || '/cart';
    this.setBusy(true);
    window.fetch(addUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: items })
    })
      .then(function (response) {
        if (!response.ok) throw new Error(self.builder.strings.error || 'Something went wrong.');
        window.location.href = cartUrl;
      })
      .catch(function (error) {
        self.setBusy(false);
        self.update();
        self.showError((error && error.message) || self.builder.strings.error || 'Something went wrong.');
      });
  };

  /* ------------------------------------------------------ <bundle-builder> */

  class BundleBuilder extends HTMLElement {
    connectedCallback() {
      this.tierPercent = toNumber(this.getAttribute('data-tier-percent'), toNumber(theme.bundleTierPercent, 20));
      this.tierMin = toNumber(this.getAttribute('data-tier-min'), toNumber(theme.bundleTierMin, 2));
      this.setPercent = toNumber(this.getAttribute('data-set-percent'), toNumber(theme.setDiscountPercent, 25));
      this.threshold = toNumber(this.getAttribute('data-threshold'), toNumber(theme.freeShippingThreshold, 0));

      this.strings = parseJSON(this.querySelector('[data-bundle-strings]'), {});
      this.products = {};

      var self = this;
      var scripts = this.querySelectorAll('script[data-bundle-product]');
      Array.prototype.forEach.call(scripts, function (script) {
        var data = parseJSON(script, null);
        if (!data || !data.id) return;
        if (!Array.isArray(data.variants)) data.variants = [];
        if (!Array.isArray(data.options)) data.options = [];
        self.products[String(data.id)] = data;
      });

      this.cards = [];
      var cardEls = this.querySelectorAll('[data-bundle-card]');
      Array.prototype.forEach.call(cardEls, function (cardEl) {
        self.cards.push(new Card(cardEl, self));
      });

      this.classList.add('is-ready');
    }
  }

  window.customElements.define('bundle-builder', BundleBuilder);

  /* Theme editor: jump to the selected bundle card. */
  document.addEventListener('shopify:block:select', function (event) {
    var card = event.target && event.target.closest ? event.target.closest('[data-bundle-card]') : null;
    if (card && typeof card.scrollIntoView === 'function') {
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
})();
