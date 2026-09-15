/* ==========================================================================
   Shark Bite — component-video.js
   <video-facade>: click-to-load wrapper for external (YouTube / Vimeo)
   videos rendered by snippets/video.liquid. Nothing from the video host is
   requested until the visitor taps play; the iframe src is prepared in
   Liquid (data-embed-src). Without JS the <noscript> link opens the video
   on the host site.
   ========================================================================== */

(function () {
  'use strict';

  if (customElements.get('video-facade')) return;

  class VideoFacade extends HTMLElement {
    connectedCallback() {
      this.button = this.querySelector('[data-video-play]');
      if (!this.button) return;
      this.onClick = this.onClick.bind(this);
      this.button.addEventListener('click', this.onClick);
    }

    disconnectedCallback() {
      if (this.button) this.button.removeEventListener('click', this.onClick);
    }

    onClick(event) {
      event.preventDefault();
      this.load();
    }

    load() {
      if (this.classList.contains('is-loaded')) return;
      const src = this.getAttribute('data-embed-src');
      if (!src) return;

      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.title = this.getAttribute('data-embed-title') || 'Video';
      iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

      this.appendChild(iframe);
      this.classList.add('is-loaded');
      this.dispatchEvent(new CustomEvent('video:loaded', { bubbles: true }));
      iframe.focus();
    }
  }

  customElements.define('video-facade', VideoFacade);
})();
