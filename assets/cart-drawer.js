/* ==========================================================================
   Shark Bite — cart-drawer.js
   Ajax cart: SB.addToCart / openCart / closeCart / refreshCart / getCart,
   the <cart-drawer> element, the <cart-items> element on the cart page and
   quick-add form interception.

   The drawer is progressive enhancement over /cart. Every trigger that opens
   it is a real link to the cart page and every form posts natively, so a JS
   failure costs the visitor a page load, not the purchase.

   Every mutation asks Shopify to bundle the freshly rendered `cart-drawer`
   section (Section Rendering API) so the drawer updates in one round-trip.
   ========================================================================== */

(function () {
  'use strict';

  const theme = window.theme || {};
  const routes = theme.routes || {};
  const strings = theme.strings || {};
  const SB = (window.SB = window.SB || {});

  const DRAWER_SECTION = 'cart-drawer';
  const root = routes.root || '/';
  const cartUrl = routes.cart || '/cart';
  const addUrl = routes.cartAdd || '/cart/add';
  const changeUrl = routes.cartChange || '/cart/change';
  const updateUrl = routes.cartUpdate || '/cart/update';

  const jsUrl = (url) => (url.endsWith('.js') ? url : `${url}.js`);
  const errorText = () => strings.cartError || 'Something went wrong. Please try again.';

  /* -------------------------------------------------------------- fetching */

  function sectionsToRender() {
    const ids = [DRAWER_SECTION];
    document.querySelectorAll('cart-items[data-section-id]').forEach((node) => {
      const id = node.getAttribute('data-section-id');
      if (id && !ids.includes(id)) ids.push(id);
    });
    return ids;
  }

  async function parseResponse(response) {
    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      data = {};
    }
    if (!response.ok) {
      const message = data.description || data.message || errorText();
      const err = new Error(typeof message === 'string' ? message : errorText());
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function postJSON(url, body) {
    const response = await fetch(jsUrl(url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(body)
    });
    return parseResponse(response);
  }

  async function postForm(url, formData) {
    const response = await fetch(jsUrl(url), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: formData
    });
    return parseResponse(response);
  }

  async function getCart() {
    const response = await fetch(`${root.replace(/\/$/, '')}/cart.js`, {
      headers: { Accept: 'application/json' }
    });
    return parseResponse(response);
  }

  async function fetchSectionHTML(sectionId, pathname) {
    const base = pathname || window.location.pathname;
    const url = `${base}${base.includes('?') ? '&' : '?'}section_id=${encodeURIComponent(sectionId)}`;
    const response = await fetch(url, { headers: { Accept: 'text/html' } });
    if (!response.ok) throw new Error(errorText());
    return response.text();
  }

  /* ------------------------------------------------------------- rendering */

  function drawerElement() {
    return document.querySelector('cart-drawer');
  }

  function renderSections(sections) {
    if (!sections) return false;
    let rendered = false;

    const drawer = drawerElement();
    if (drawer && sections[DRAWER_SECTION]) {
      drawer.render(sections[DRAWER_SECTION]);
      rendered = true;
    }

    document.querySelectorAll('cart-items[data-section-id]').forEach((node) => {
      const id = node.getAttribute('data-section-id');
      if (id && sections[id]) {
        node.render(sections[id]);
        rendered = true;
      }
    });

    return rendered;
  }

  async function refreshDrawerFromServer() {
    const drawer = drawerElement();
    if (!drawer) return;
    try {
      const html = await fetchSectionHTML(DRAWER_SECTION, root);
      drawer.render(html);
    } catch (error) {
      // A stale drawer is recoverable on the next interaction.
    }
  }

  /**
   * Re-fetches /cart.js, syncs header counts, dispatches `cart:updated` and
   * returns the cart JSON. Called after every mutation.
   */
  async function broadcast() {
    const cart = await getCart();
    if (typeof SB.updateCartCount === 'function') SB.updateCartCount(cart.item_count);
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
    return cart;
  }

  async function refreshCart() {
    await refreshDrawerFromServer();
    return broadcast();
  }

  /* ------------------------------------------------------------ public API */

  function openCart(opener) {
    const drawer = drawerElement();
    if (!drawer || theme.cartType === 'page') {
      window.location.href = cartUrl;
      return;
    }
    drawer.open(opener);
  }

  function closeCart() {
    const drawer = drawerElement();
    if (drawer) drawer.close();
  }

  /**
   * SB.addToCart(payload, opener)
   * payload: FormData (from a product form) or { items: [{ id, quantity, properties? }] }.
   */
  async function addToCart(payload, opener) {
    const sections = sectionsToRender().join(',');
    const sectionsUrl = window.location.pathname;
    let data;

    if (typeof FormData !== 'undefined' && payload instanceof FormData) {
      payload.set('sections', sections);
      payload.set('sections_url', sectionsUrl);
      data = await postForm(addUrl, payload);
    } else {
      const body = Object.assign({}, payload || {});
      if (!Array.isArray(body.items)) {
        throw new Error(errorText());
      }
      body.sections = sections;
      body.sections_url = sectionsUrl;
      data = await postJSON(addUrl, body);
    }

    if (!renderSections(data.sections)) await refreshDrawerFromServer();
    const cart = await broadcast();
    data.cart = cart;

    SB.announce(strings.itemAdded || strings.added || 'Added to cart');

    if (theme.cartType === 'page' || !drawerElement()) {
      window.location.href = cartUrl;
    } else {
      openCart(opener);
    }

    return data;
  }

  async function changeLine(key, quantity) {
    const data = await postJSON(changeUrl, {
      id: key,
      quantity,
      sections: sectionsToRender().join(','),
      sections_url: window.location.pathname
    });
    // Shopify answers 200 with the unchanged cart plus an `errors` message when
    // the requested quantity exceeds available inventory.
    if (data && data.errors) {
      const message = Array.isArray(data.errors) ? data.errors.join(' ') : String(data.errors);
      throw new Error(message || errorText());
    }
    if (!renderSections(data.sections)) await refreshDrawerFromServer();
    await broadcast();
    return data;
  }

  async function updateNote(note) {
    return postJSON(updateUrl, { note });
  }

  Object.assign(SB, {
    addToCart,
    openCart,
    closeCart,
    refreshCart,
    getCart,
    changeLine,
    updateNote,
    fetchSectionHTML
  });

  /* --------------------------------------------------------- <cart-drawer> */

  class CartDrawer extends HTMLElement {
    connectedCallback() {
      this.releaseFocus = null;
      this.opener = null;
      this.isOpen = false;
      this.pending = 0;

      if (this.bound) return;
      this.bound = true;

      // Delegated listeners survive innerHTML swaps.
      this.addEventListener('click', (event) => this.onClick(event));
      this.addEventListener('change', (event) => this.onChange(event));
      this.addEventListener('input', (event) => this.onInput(event));

      // Other scripts may dispatch `cart:open` to ask for the drawer; open()
      // is idempotent so the event it fires itself is ignored.
      document.addEventListener('cart:open', (event) => {
        this.open(event.detail && event.detail.opener);
      });
      document.addEventListener('cart:close', () => this.close());
    }

    get panel() {
      return this.querySelector('[data-cart-panel]') || this;
    }

    onClick(event) {
      const close = event.target.closest('[data-cart-close]');
      if (close) {
        event.preventDefault();
        this.close();
        return;
      }
      if (event.target.closest('[data-cart-overlay]')) {
        this.close();
        return;
      }
      const remove = event.target.closest('[data-line-remove]');
      if (remove) {
        event.preventDefault();
        this.change(remove.getAttribute('data-line-remove'), 0, remove);
      }
    }

    onChange(event) {
      const input = event.target.closest('[data-line-quantity]');
      if (!input) return;
      const quantity = parseInt(input.value, 10);
      if (Number.isNaN(quantity)) return;
      this.change(input.getAttribute('data-line-quantity'), quantity, input);
    }

    onInput(event) {
      const note = event.target.closest('[data-cart-note]');
      if (!note) return;
      if (!this.saveNote) {
        this.saveNote = SB.debounce((value) => updateNote(value).catch(() => {}), 500);
      }
      this.saveNote(note.value);
    }

    async change(key, quantity, source) {
      if (!key) return;
      this.setBusy(true);
      this.hideError();
      // render() replaces the whole body while this request is in flight;
      // remember the source so focus lands back on the same line's field.
      this.pendingFocusSource = source || null;
      try {
        await changeLine(key, quantity);
      } catch (error) {
        // Put the server's numbers back first: the refresh replaces the whole
        // drawer body (including the error node), so the message goes in after.
        await refreshDrawerFromServer();
        this.showError(error.message);
        SB.announce(error.message || errorText());
      } finally {
        this.setBusy(false);
        this.pendingFocusSource = null;
        this.restoreFocus(source);
      }
    }

    restoreFocus(source) {
      if (!this.isOpen) return;
      if (document.activeElement && this.contains(document.activeElement) && document.activeElement !== document.body) return;
      let target = null;
      if (source && source.hasAttribute && source.hasAttribute('data-line-quantity')) {
        target = this.querySelector(`[data-line-quantity="${source.getAttribute('data-line-quantity')}"]`);
      }
      (target || this.querySelector('[data-cart-close]') || this.panel).focus({ preventScroll: true });
    }

    open(opener) {
      if (this.isOpen) return;
      this.isOpen = true;
      this.opener = opener && typeof opener.focus === 'function' ? opener : document.activeElement;
      this.removeAttribute('hidden');
      this.setAttribute('aria-hidden', 'false');
      void this.offsetWidth;
      this.classList.add('is-open');
      SB.lockScroll(true);
      // Trap on the host element: render() replaces the panel's markup after
      // every mutation, so a trap bound to the panel would be lost.
      this.releaseFocus = SB.trapFocus(this, () => this.close());
      document.dispatchEvent(new CustomEvent('cart:open', { detail: { opener: this.opener } }));
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.classList.remove('is-open');
      this.setAttribute('aria-hidden', 'true');
      SB.lockScroll(false);
      if (this.releaseFocus) this.releaseFocus();
      this.releaseFocus = null;
      window.setTimeout(() => {
        if (!this.isOpen) this.setAttribute('hidden', '');
      }, SB.reducedMotion ? 0 : 260);
      if (this.opener && document.body.contains(this.opener)) this.opener.focus();
      this.opener = null;
      document.dispatchEvent(new CustomEvent('cart:close'));
    }

    /**
     * Replaces the drawer body with freshly rendered section HTML. Accepts the
     * full section markup returned by the Section Rendering API.
     */
    render(html) {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const fresh = parsed.querySelector('cart-drawer');
      if (!fresh) return;
      const scroller = this.querySelector('[data-cart-body]');
      const scrollTop = scroller ? scroller.scrollTop : 0;
      this.innerHTML = fresh.innerHTML;
      const nextScroller = this.querySelector('[data-cart-body]');
      if (nextScroller) nextScroller.scrollTop = scrollTop;
      const count = fresh.getAttribute('data-item-count');
      if (count !== null && typeof SB.updateCartCount === 'function') SB.updateCartCount(count);
      if (this.isOpen) this.restoreFocus(this.pendingFocusSource);
    }

    setBusy(busy) {
      this.pending = Math.max(0, this.pending + (busy ? 1 : -1));
      const active = this.pending > 0;
      this.setAttribute('aria-busy', String(active));
      this.classList.toggle('is-busy', active);
    }

    showError(message) {
      const target = this.querySelector('[data-cart-error]');
      if (!target) return;
      target.textContent = message || errorText();
      target.removeAttribute('hidden');
    }

    hideError() {
      const target = this.querySelector('[data-cart-error]');
      if (target) target.setAttribute('hidden', '');
    }
  }

  if (!customElements.get('cart-drawer')) customElements.define('cart-drawer', CartDrawer);

  /* ----------------------------------------------------------- <cart-items>
     The cart page. Quantity changes go through /cart/change.js and the
     section is re-rendered from the bundled HTML; without JS the form posts
     `updates[]` to /cart as usual. */

  class CartItems extends HTMLElement {
    connectedCallback() {
      if (this.bound) return;
      this.bound = true;
      this.addEventListener('change', (event) => {
        const input = event.target.closest('[data-line-quantity]');
        if (!input) return;
        const quantity = parseInt(input.value, 10);
        if (Number.isNaN(quantity)) return;
        this.change(input.getAttribute('data-line-quantity'), quantity);
      });
      this.addEventListener('click', (event) => {
        const remove = event.target.closest('[data-line-remove]');
        if (!remove) return;
        event.preventDefault();
        this.change(remove.getAttribute('data-line-remove'), 0);
      });
      this.addEventListener('input', (event) => {
        const note = event.target.closest('[data-cart-note]');
        if (!note) return;
        if (!this.saveNote) {
          this.saveNote = SB.debounce((value) => updateNote(value).catch(() => {}), 500);
        }
        this.saveNote(note.value);
      });
    }

    async change(key, quantity) {
      this.setAttribute('aria-busy', 'true');
      this.classList.add('is-busy');
      this.hideError();
      try {
        await changeLine(key, quantity);
      } catch (error) {
        try {
          const html = await fetchSectionHTML(this.getAttribute('data-section-id'));
          this.render(html);
        } catch (refreshError) {
          // Leave the visible numbers; the next action re-syncs.
        }
        // Show the message after the re-render replaced the error node.
        this.showError(error.message);
        SB.announce(error.message || errorText());
      } finally {
        this.setAttribute('aria-busy', 'false');
        this.classList.remove('is-busy');
      }
    }

    render(html) {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const fresh = parsed.querySelector('cart-items');
      if (!fresh) return;
      this.innerHTML = fresh.innerHTML;
    }

    showError(message) {
      const target = this.querySelector('[data-cart-error]');
      if (!target) return;
      target.textContent = message || errorText();
      target.removeAttribute('hidden');
    }

    hideError() {
      const target = this.querySelector('[data-cart-error]');
      if (target) target.setAttribute('hidden', '');
    }
  }

  if (!customElements.get('cart-items')) customElements.define('cart-items', CartItems);

  /* --------------------------------------------------------- cart triggers */

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-cart-trigger]');
    if (!trigger) return;
    if (theme.cartType === 'page' || !drawerElement()) return; // follow the link
    event.preventDefault();
    openCart(trigger);
  });

  /* ------------------------------------------------------------- quick add */

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-quick-add-form]');
    if (!form) return;

    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    const label = button ? button.querySelector('[data-add-text]') || button : null;
    const original = label ? label.textContent : '';

    if (button) {
      button.setAttribute('aria-busy', 'true');
      button.disabled = true;
    }
    if (label && strings.adding) label.textContent = strings.adding;

    try {
      await addToCart(new FormData(form), button);
      if (label) label.textContent = strings.added || original;
      window.setTimeout(() => {
        if (label) label.textContent = original;
      }, 1800);
    } catch (error) {
      if (label) label.textContent = error.message || errorText();
      SB.announce(error.message || errorText());
      window.setTimeout(() => {
        if (label) label.textContent = original;
      }, 3000);
    } finally {
      if (button) {
        button.removeAttribute('aria-busy');
        button.disabled = false;
      }
    }
  });

  /* ---------------------------------------------------------- theme editor */

  document.addEventListener('shopify:section:load', (event) => {
    const drawer = event.target && event.target.querySelector && event.target.querySelector('cart-drawer');
    if (drawer && typeof drawer.connectedCallback === 'function') drawer.connectedCallback();
  });
})();
