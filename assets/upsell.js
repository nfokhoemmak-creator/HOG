/* ==========================================================================
   House of Garments — upsell.js
   Product recommendations, twice: <cart-upsells> renders compact rows inside
   the cart drawer, <complete-look> renders a tile rail on the product page.
   Both share one fetcher (recommendations endpoint, complementary→related
   fallback, 5-minute sessionStorage cache) and one card renderer.

   Purely additive. Nothing here is required to buy: no recommendations, no
   markup. All DOM is built with createElement/textContent — product titles
   from the API never touch innerHTML. Adds go through HOG.addItems so the
   drawer refreshes and opens exactly like any other add.
   ========================================================================== */

(function () {
  'use strict';

  const theme = window.theme || {};
  const routes = theme.routes || {};
  const strings = theme.strings || {};

  const CACHE_TTL = 5 * 60 * 1000;

  function formatMoney(cents) {
    if (window.HOG && typeof window.HOG.formatMoney === 'function') {
      return window.HOG.formatMoney(cents);
    }
    return '$' + (cents / 100).toFixed(2);
  }

  /* -------------------------------------------------------------- caching */

  function readCache(key) {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (!entry || !Array.isArray(entry.products)) return null;
      if (Date.now() - entry.t > CACHE_TTL) return null;
      return entry.products;
    } catch (error) {
      return null;
    }
  }

  function writeCache(key, products) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), products }));
    } catch (error) {
      // Private mode or full storage — recommendations still work, uncached.
    }
  }

  /* ------------------------------------------------------------- fetching */

  async function fetchRecommendations(productId, intent) {
    const key = `hog_recs_${productId}_${intent}`;
    const cached = readCache(key);
    if (cached) return cached;

    let base = routes.productRecommendations || '/recommendations/products';
    if (!/\.json$/.test(base)) base += '.json';

    const response = await fetch(`${base}?product_id=${productId}&limit=8&intent=${intent}`);
    if (!response.ok) return [];

    const data = await response.json();
    const products = (data && data.products) || [];

    writeCache(key, products);
    return products;
  }

  async function getRecommendations(productId, intent) {
    let products = await fetchRecommendations(productId, intent);
    if (products.length === 0 && intent === 'complementary') {
      products = await fetchRecommendations(productId, 'related');
    }
    return products;
  }

  /* ------------------------------------------------------------- add flow */

  async function addFromCard(button, select) {
    const variantId = parseInt(select ? select.value : button.dataset.variantId, 10);
    if (!variantId || !window.HOG || typeof window.HOG.addItems !== 'function') return;

    const original = strings.upsellAdd || 'ADD';
    button.disabled = true;
    button.textContent = strings.upsellAdding || 'ADDING…';

    try {
      await window.HOG.addItems([{ id: variantId, quantity: 1 }], button);
      button.disabled = false;
      button.textContent = strings.upsellAdded || 'ADDED';
      window.setTimeout(() => {
        button.textContent = original;
      }, 1800);
    } catch (error) {
      button.disabled = false;
      button.textContent = error.message || strings.cartError || original;
      window.setTimeout(() => {
        button.textContent = original;
      }, 2800);
    }
  }

  /* -------------------------------------------------------- card renderer */

  function buildCard(product, tile) {
    const item = document.createElement('li');
    item.className = tile ? 'upsell-card upsell-card--tile' : 'upsell-card';

    const imageLink = document.createElement('a');
    imageLink.className = 'upsell-card__image';
    imageLink.href = product.url;

    if (product.featured_image) {
      const image = document.createElement('img');
      image.src = product.featured_image;
      image.alt = '';
      image.loading = 'lazy';
      imageLink.appendChild(image);
    }
    item.appendChild(imageLink);

    const info = document.createElement('div');
    info.className = 'upsell-card__info';

    const title = document.createElement('a');
    title.className = 'upsell-card__title';
    title.href = product.url;
    title.textContent = product.title;
    info.appendChild(title);

    const price = document.createElement('span');
    price.className = 'upsell-card__price';
    price.textContent = formatMoney(product.price);
    info.appendChild(price);

    const availableVariants = (product.variants || []).filter((variant) => variant.available);
    let select = null;

    if (product.variants && product.variants.length > 1) {
      select = document.createElement('select');
      select.className = 'upsell-card__select';
      select.setAttribute('aria-label', 'Options for ' + product.title);
      availableVariants.forEach((variant) => {
        const option = document.createElement('option');
        option.value = String(variant.id);
        option.textContent = variant.title;
        select.appendChild(option);
      });
      info.appendChild(select);
    }

    item.appendChild(info);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--small upsell-card__btn';
    button.textContent = strings.upsellAdd || 'ADD';

    if (!select) {
      button.dataset.variantId = availableVariants.length ? String(availableVariants[0].id) : '';
    }

    // Unavailable products are filtered out before render; belt and braces.
    if (availableVariants.length === 0) {
      button.disabled = true;
      button.textContent = strings.upsellSoldOut || 'SOLD OUT';
    } else {
      button.addEventListener('click', () => addFromCard(button, select));
    }

    item.appendChild(button);
    return item;
  }

  /* ------------------------------------------------------ custom elements */

  class UpsellBase extends HTMLElement {
    connectedCallback() {
      this.productId = this.dataset.productId;
      this.intent = this.dataset.intent || 'related';
      this.limit = parseInt(this.dataset.limit, 10) || this.defaultLimit();
      this.exclude = (this.dataset.exclude || '')
        .split(',')
        .map((value) => parseInt(value, 10))
        .filter((value) => !Number.isNaN(value));

      if (!this.productId) {
        this.renderEmpty();
        return;
      }

      this.load();
    }

    defaultLimit() {
      return 2;
    }

    async load() {
      let products = [];
      try {
        products = await getRecommendations(this.productId, this.intent);
      } catch (error) {
        products = [];
      }

      products = products
        .filter((product) => product.available && this.exclude.indexOf(product.id) === -1)
        .slice(0, this.limit);

      // The drawer may have swapped this instance out while we were fetching.
      if (!this.isConnected) return;

      if (products.length === 0) {
        this.renderEmpty();
      } else {
        this.render(products);
      }
    }
  }

  class CartUpsells extends UpsellBase {
    renderEmpty() {
      this.textContent = '';
      this.hidden = true;
    }

    render(products) {
      this.textContent = '';
      this.hidden = false;

      const wrapper = document.createElement('div');
      wrapper.className = 'upsells';

      const heading = document.createElement('p');
      heading.className = 'upsells__heading';
      heading.textContent = this.dataset.heading || 'COMPLETE THE FIT';
      wrapper.appendChild(heading);

      const list = document.createElement('ul');
      list.className = 'upsells__list';
      products.forEach((product) => list.appendChild(buildCard(product, false)));
      wrapper.appendChild(list);

      this.appendChild(wrapper);
    }
  }

  class CompleteLook extends UpsellBase {
    defaultLimit() {
      return 4;
    }

    sectionWrapper() {
      return this.closest('.shopify-section') || this.closest('.section') || this;
    }

    renderEmpty() {
      this.sectionWrapper().hidden = true;
    }

    render(products) {
      const list = this.querySelector('[data-upsell-list]');
      if (!list) return;

      list.textContent = '';
      products.forEach((product) => list.appendChild(buildCard(product, true)));
      this.sectionWrapper().hidden = false;
    }
  }

  if (!customElements.get('cart-upsells')) {
    customElements.define('cart-upsells', CartUpsells);
  }

  if (!customElements.get('complete-look')) {
    customElements.define('complete-look', CompleteLook);
  }
})();
