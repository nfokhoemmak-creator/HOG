/* ==========================================================================
   Shark Bite — section-product-recommendations.js
   <product-recommendations data-url="/recommendations/products?section_id=…&product_id=…&limit=4&intent=related">
   Fetches the section rendered with the recommended products and swaps its
   own content for the result. Loads lazily when the element nears the
   viewport. Without JS the section simply stays empty.
   ========================================================================== */

(function () {
  'use strict';

  class ProductRecommendations extends HTMLElement {
    connectedCallback() {
      this.url = this.getAttribute('data-url') || '';
      if (!this.url || this.loaded) return;

      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(
          (entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            this.observer.disconnect();
            this.load();
          },
          { rootMargin: '0px 0px 400px 0px' }
        );
        this.observer.observe(this);
      } else {
        this.load();
      }
    }

    disconnectedCallback() {
      if (this.observer) this.observer.disconnect();
    }

    async load() {
      if (this.loaded) return;
      this.loaded = true;

      try {
        const response = await fetch(this.url, { headers: { Accept: 'text/html' } });
        if (!response.ok) throw new Error(`Recommendations request failed (${response.status})`);
        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const fresh = doc.querySelector('product-recommendations');

        if (fresh && fresh.innerHTML.trim().length > 0) {
          this.innerHTML = fresh.innerHTML;
          this.classList.add('is-loaded');
          if (this.querySelector('.card')) this.classList.add('has-products');
          // Reveal-on-scroll observers only know about nodes present at boot.
          this.querySelectorAll('.reveal').forEach((node) => node.classList.add('is-visible'));
          document.dispatchEvent(new CustomEvent('recommendations:loaded', { detail: { element: this } }));
        } else {
          this.classList.add('is-empty');
        }
      } catch (error) {
        this.loaded = false;
        this.classList.add('is-empty');
      }
    }
  }

  if (!customElements.get('product-recommendations')) {
    customElements.define('product-recommendations', ProductRecommendations);
  }
})();
