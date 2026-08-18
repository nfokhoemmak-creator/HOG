/* ==========================================================================
   House of Garments — cart-drawer.js
   Talks to the Shopify Ajax Cart API and keeps the drawer in sync.

   The drawer is progressive enhancement over /cart. Every trigger that opens
   it is a real link to the cart page, so a JS failure costs the visitor a page
   load, not the purchase.
   ========================================================================== */

(function () {
  'use strict';

  const routes = (window.theme && window.theme.routes) || {};
  const strings = (window.theme && window.theme.strings) || {};

  /* ------------------------------------------------------------- fetching */

  async function postJSON(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.description || data.message || strings.cartError);
    }
    return data;
  }

  async function getSectionHTML(section) {
    const url = `${routes.root || '/'}?section_id=${section}`;
    const response = await fetch(url);
    return response.text();
  }

  /* -------------------------------------------------------------- <cart-drawer> */

  class CartDrawer extends HTMLElement {
    connectedCallback() {
      this.panel = this.querySelector('.cart-drawer__panel');
      this.overlay = this.querySelector('.cart-drawer__overlay');
      this.closeButton = this.querySelector('[data-cart-close]');
      this.releaseFocus = null;
      this.opener = null;

      if (this.overlay) this.overlay.addEventListener('click', () => this.close());
      if (this.closeButton) this.closeButton.addEventListener('click', () => this.close());

      this.bindLineItems();

      document.addEventListener('cart:updated', (event) => {
        this.render(event.detail && event.detail.sections);
      });

      document.addEventListener('cart:open', (event) => {
        this.open(event.detail && event.detail.opener);
      });

      // Any link to the cart opens the drawer instead, when the drawer is on.
      document.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-cart-trigger]');
        if (!trigger) return;
        event.preventDefault();
        this.open(trigger);
      });
    }

    bindLineItems() {
      this.querySelectorAll('[data-line-remove]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          this.change(button.dataset.lineRemove, 0);
        });
      });

      this.querySelectorAll('[data-line-quantity]').forEach((input) => {
        input.addEventListener('change', () => {
          this.change(input.dataset.lineQuantity, parseInt(input.value, 10));
        });
      });
    }

    open(opener) {
      this.opener = opener || null;
      this.classList.add('is-open');
      this.setAttribute('aria-hidden', 'false');
      if (window.HOG) {
        window.HOG.lockScroll(true);
        this.releaseFocus = window.HOG.trapFocus(this.panel, () => this.close());
      }
    }

    close() {
      this.classList.remove('is-open');
      this.setAttribute('aria-hidden', 'true');
      if (window.HOG) window.HOG.lockScroll(false);
      if (this.releaseFocus) this.releaseFocus();
      if (this.opener && document.body.contains(this.opener)) this.opener.focus();
    }

    async change(key, quantity) {
      this.setBusy(true);
      try {
        await postJSON(routes.cartChange || '/cart/change.js', { id: key, quantity });
        await this.refresh();
      } catch (error) {
        this.showError(error.message);
      } finally {
        this.setBusy(false);
      }
    }

    async refresh() {
      const html = await getSectionHTML('cart-drawer');
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const fresh = parsed.querySelector('cart-drawer');
      if (!fresh) return;

      const wasOpen = this.classList.contains('is-open');
      this.innerHTML = fresh.innerHTML;
      this.connectedCallback();
      if (wasOpen) this.classList.add('is-open');

      updateCartCount();
    }

    render() {
      this.refresh();
    }

    setBusy(busy) {
      this.toggleAttribute('aria-busy', busy);
      this.querySelectorAll('button, input').forEach((node) => {
        node.disabled = busy;
      });
    }

    showError(message) {
      const target = this.querySelector('[data-cart-error]');
      if (!target) return;
      target.textContent = message || strings.cartError;
      target.hidden = false;
    }
  }

  if (!customElements.get('cart-drawer')) {
    customElements.define('cart-drawer', CartDrawer);
  }

  /* --------------------------------------------------------- header count */

  async function updateCartCount() {
    try {
      const response = await fetch(`${routes.root || '/'}cart.js`);
      const cart = await response.json();
      document.querySelectorAll('[data-cart-count]').forEach((node) => {
        node.textContent = cart.item_count;
        node.hidden = cart.item_count === 0;
      });
    } catch (error) {
      // A stale count is not worth surfacing to the visitor.
    }
  }

  /* -------------------------------------------------------------- add API */

  async function addToCart(formData, opener) {
    const body = {};
    formData.forEach((value, key) => {
      body[key] = value;
    });

    const data = await postJSON(routes.cartAdd || '/cart/add.js', body);

    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { item: data } }));

    if (window.HOG) window.HOG.announce(strings.itemAdded);

    const drawer = document.querySelector('cart-drawer');
    if (drawer && window.theme && window.theme.cartType === 'drawer') {
      await drawer.refresh();
      drawer.open(opener);
    } else {
      window.location.href = routes.cart || '/cart';
    }

    return data;
  }

  window.HOG = Object.assign(window.HOG || {}, { addToCart, updateCartCount });

  /* ------------------------------------------------------------ quick add */

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-quick-add-form]');
    if (!form) return;

    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const original = button ? button.textContent : '';

    if (button) {
      button.disabled = true;
      button.textContent = strings.adding || 'Adding…';
    }

    try {
      await addToCart(new FormData(form), button);
    } catch (error) {
      if (button) button.textContent = error.message;
      window.setTimeout(() => {
        if (button) button.textContent = original;
      }, 2500);
      return;
    } finally {
      if (button) button.disabled = false;
    }

    if (button) button.textContent = original;
  });
})();
