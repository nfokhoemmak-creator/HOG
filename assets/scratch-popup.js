/* ==========================================================================
   House of Garments — scratch-popup.js
   Full-screen scratch-card discount popup.

   Waits a configurable delay, honours the merchant's frequency cap
   (hog:scratch:* storage keys), then paints a gold-foil canvas the visitor
   scratches with any pointer. Once enough foil is gone the prize panel
   underneath is revealed; claiming pre-applies the code via
   window.HOG.applyDiscount.

   In the theme editor the popup never auto-opens and ignores caps — it
   follows section select / deselect instead. No dependencies.
   ========================================================================== */

(function () {
  'use strict';

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STORE_PREFIX = 'hog:scratch:';
  const DAY_MS = 24 * 60 * 60 * 1000;
  const SCRATCH_RADIUS = 26; /* ~2.6rem */
  const SAMPLE_INTERVAL = 200; /* ms between alpha samples */

  /* Storage access is wrapped: private browsing may throw on any call. */

  function readKey(store, key) {
    try {
      return store.getItem(STORE_PREFIX + key);
    } catch (error) {
      return null;
    }
  }

  function writeKey(store, key, value) {
    try {
      store.setItem(STORE_PREFIX + key, value);
    } catch (error) {
      /* Popup simply shows again next time. */
    }
  }

  function removeKey(store, key) {
    try {
      store.removeItem(STORE_PREFIX + key);
    } catch (error) {
      /* ignore */
    }
  }

  function designMode() {
    return Boolean(window.Shopify && window.Shopify.designMode);
  }

  class ScratchPopup extends HTMLElement {
    connectedCallback() {
      this.dialog = this.querySelector('[data-scratch-dialog]');
      this.canvas = this.querySelector('[data-scratch-canvas]');
      this.prize = this.querySelector('[data-scratch-prize]');
      this.timerOutput = this.querySelector('[data-scratch-timer]');
      this.copyButton = this.querySelector('[data-scratch-copy]');
      this.revealButton = this.querySelector('[data-scratch-reveal]');

      this.code = this.dataset.code || '';
      this.frequency = this.dataset.frequency || 'once_per_day';
      this.threshold = parseInt(this.dataset.threshold, 10) || 50;
      this.timerMinutes = parseInt(this.dataset.timerMinutes, 10) || 0;
      this.copyLabel = this.copyButton ? this.copyButton.textContent : '';

      this.isOpen = false;
      this.revealed = false;
      this.scratching = false;
      this.lastSample = 0;
      this.lastPoint = null;
      this.releaseFocus = null;
      this.ctx = null;

      this.bindControls();

      if (designMode()) {
        this.onSelect = (event) => {
          if (this.matchesSection(event)) this.open();
        };
        this.onDeselect = (event) => {
          if (this.matchesSection(event)) this.close();
        };
        document.addEventListener('shopify:section:select', this.onSelect);
        document.addEventListener('shopify:section:deselect', this.onDeselect);
        return;
      }

      if (!this.shouldOpen()) return;

      const delay = (parseInt(this.dataset.delay, 10) || 0) * 1000;
      this.openTimeout = window.setTimeout(() => this.open(), delay);
    }

    disconnectedCallback() {
      window.clearTimeout(this.openTimeout);
      window.clearTimeout(this.copyTimeout);
      window.clearTimeout(this.resizeTimeout);
      window.clearInterval(this.countdown);

      if (this.onSelect) document.removeEventListener('shopify:section:select', this.onSelect);
      if (this.onDeselect) document.removeEventListener('shopify:section:deselect', this.onDeselect);
      if (this.boundResize) window.removeEventListener('resize', this.boundResize);

      if (this.isOpen) {
        if (this.releaseFocus) this.releaseFocus();
        if (window.HOG && !document.querySelector('.cart-drawer.is-open, .menu-drawer.is-open')) {
          window.HOG.lockScroll(false);
        }
      }
    }

    matchesSection(event) {
      if (event.detail && event.detail.sectionId) {
        return String(event.detail.sectionId) === this.dataset.sectionId;
      }
      return Boolean(event.target && event.target.contains && event.target.contains(this));
    }

    /* ----------------------------------------------------- frequency caps */

    shouldOpen() {
      switch (this.frequency) {
        case 'every_visit':
          return true;
        case 'once_per_session':
          return !readKey(window.sessionStorage, 'session');
        case 'once_per_visitor':
          return !readKey(window.localStorage, 'visitor');
        case 'once_per_day':
        default: {
          const seenAt = parseInt(readKey(window.localStorage, 'day'), 10);
          return !seenAt || Date.now() - seenAt > DAY_MS;
        }
      }
    }

    setCap() {
      if (designMode()) return;

      /* The popup's run is over — a later eligible showing (e.g. tomorrow
         under once_per_day in the same tab) starts a fresh countdown. */
      removeKey(window.sessionStorage, 'deadline');

      switch (this.frequency) {
        case 'once_per_session':
          writeKey(window.sessionStorage, 'session', '1');
          break;
        case 'once_per_day':
          writeKey(window.localStorage, 'day', String(Date.now()));
          break;
        case 'once_per_visitor':
          writeKey(window.localStorage, 'visitor', '1');
          break;
      }
    }

    /* ---------------------------------------------------------- wiring up */

    bindControls() {
      const close = this.querySelector('[data-scratch-close]');
      const dismiss = this.querySelector('[data-scratch-dismiss]');
      const claim = this.querySelector('[data-scratch-claim]');

      if (close) close.addEventListener('click', () => this.dismiss());
      if (dismiss) dismiss.addEventListener('click', () => this.dismiss());
      if (claim) claim.addEventListener('click', () => this.claim());
      if (this.revealButton) this.revealButton.addEventListener('click', () => this.reveal());
      if (this.copyButton) this.copyButton.addEventListener('click', () => this.copyCode());

      if (this.canvas) {
        this.canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event));
        this.canvas.addEventListener('pointermove', (event) => this.onPointerMove(event));
        this.canvas.addEventListener('pointerup', () => {
          this.scratching = false;
        });
        this.canvas.addEventListener('pointercancel', () => {
          this.scratching = false;
        });
      }
    }

    /* --------------------------------------------------------- open/close */

    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      this.hidden = false;

      if (window.HOG) {
        window.HOG.lockScroll(true);
        this.releaseFocus = window.HOG.trapFocus(this.dialog || this, () => this.dismiss());
      }

      window.requestAnimationFrame(() => this.paintFoil());
      this.startTimer();

      this.boundResize = () => {
        window.clearTimeout(this.resizeTimeout);
        this.resizeTimeout = window.setTimeout(() => {
          if (this.isOpen && !this.revealed) this.paintFoil();
        }, 150);
      };
      window.addEventListener('resize', this.boundResize);
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.hidden = true;

      window.clearInterval(this.countdown);

      if (this.boundResize) {
        window.removeEventListener('resize', this.boundResize);
        this.boundResize = null;
      }

      if (this.releaseFocus) {
        this.releaseFocus();
        this.releaseFocus = null;
      }

      // The scroll lock is shared: don't release it out from under an open
      // cart or menu drawer.
      if (window.HOG && !document.querySelector('.cart-drawer.is-open, .menu-drawer.is-open')) {
        window.HOG.lockScroll(false);
      }
    }

    dismiss() {
      this.setCap();
      this.close();
    }

    async claim() {
      this.setCap();

      if (window.HOG && typeof window.HOG.applyDiscount === 'function') {
        await window.HOG.applyDiscount(this.code);
      }

      if (window.HOG) window.HOG.announce('Discount applied');
      this.close();
    }

    /* ---------------------------------------------------------- countdown */

    startTimer() {
      if (!this.timerOutput || this.timerMinutes <= 0) return;

      /* Persist the deadline so re-opening the popup never resets the clock.
         Only a deadline still in the future is reused, and the theme editor
         skips storage so previews always reflect the configured minutes. */
      let deadline = designMode()
        ? NaN
        : parseInt(readKey(window.sessionStorage, 'deadline'), 10);
      if (!deadline || deadline <= Date.now()) {
        deadline = Date.now() + this.timerMinutes * 60000;
        if (!designMode()) writeKey(window.sessionStorage, 'deadline', String(deadline));
      }

      const tick = () => {
        const remaining = Math.max(0, deadline - Date.now());
        const seconds = Math.floor(remaining / 1000);
        const minutes = Math.floor(seconds / 60);
        this.timerOutput.textContent = minutes + ':' + String(seconds % 60).padStart(2, '0');
        if (remaining <= 0) window.clearInterval(this.countdown);
      };

      window.clearInterval(this.countdown);
      tick();
      this.countdown = window.setInterval(tick, 1000);
    }

    /* ---------------------------------------------------------- gold foil */

    paintFoil() {
      if (!this.canvas || !this.canvas.getContext) return;

      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.round(rect.width * dpr);
      this.canvas.height = Math.round(rect.height * dpr);

      const ctx = this.canvas.getContext('2d');
      if (!ctx) return;
      this.ctx = ctx;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';

      const w = rect.width;
      const h = rect.height;

      /* Foil base: diagonal gold gradient. */
      const foil = ctx.createLinearGradient(0, 0, w, h);
      foil.addColorStop(0, '#e9c96d');
      foil.addColorStop(0.28, '#f7e7ae');
      foil.addColorStop(0.5, '#d2a63d');
      foil.addColorStop(0.72, '#f2dd96');
      foil.addColorStop(1, '#c8992f');
      ctx.fillStyle = foil;
      ctx.fillRect(0, 0, w, h);

      /* Brushed streaks: alternating darker and lighter diagonals. */
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 26; i += 1) {
        const x = (i / 26) * (w + h) - h;
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(122, 88, 26, 0.1)' : 'rgba(255, 255, 255, 0.14)';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + h, h);
        ctx.stroke();
      }

      /* Scribble marks hinting at the gesture. */
      ctx.strokeStyle = 'rgba(122, 88, 26, 0.3)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(w * 0.14, h * 0.3);
      ctx.quadraticCurveTo(w * 0.22, h * 0.14, w * 0.3, h * 0.28);
      ctx.quadraticCurveTo(w * 0.36, h * 0.4, w * 0.26, h * 0.4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(w * 0.68, h * 0.7);
      ctx.quadraticCurveTo(w * 0.76, h * 0.56, w * 0.84, h * 0.68);
      ctx.quadraticCurveTo(w * 0.88, h * 0.78, w * 0.78, h * 0.78);
      ctx.stroke();

      /* Faint instruction in the heading face. */
      const headingFont =
        getComputedStyle(document.documentElement).getPropertyValue('--font-heading-family').trim() ||
        'serif';
      ctx.fillStyle = 'rgba(104, 74, 18, 0.5)';
      ctx.font = '400 16px ' + headingFont;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S C R A T C H  H E R E', w / 2, h / 2);
    }

    /* ---------------------------------------------------------- scratching */

    onPointerDown(event) {
      if (this.revealed || !this.ctx) return;

      this.scratching = true;
      this.lastPoint = null;
      this.cardRect = this.canvas.getBoundingClientRect();

      if (this.canvas.setPointerCapture) {
        try {
          this.canvas.setPointerCapture(event.pointerId);
        } catch (error) {
          /* Capture is a nicety, not a requirement. */
        }
      }

      this.scratchAt(event);
    }

    onPointerMove(event) {
      if (!this.scratching || this.revealed) return;
      this.scratchAt(event);
    }

    scratchAt(event) {
      if (!this.ctx || !this.cardRect) return;

      const x = event.clientX - this.cardRect.left;
      const y = event.clientY - this.cardRect.top;

      this.ctx.globalCompositeOperation = 'destination-out';

      this.ctx.beginPath();
      this.ctx.arc(x, y, SCRATCH_RADIUS, 0, Math.PI * 2);
      this.ctx.fill();

      /* Join fast strokes so the erasure stays continuous. */
      if (this.lastPoint) {
        this.ctx.lineWidth = SCRATCH_RADIUS * 2;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
      }

      this.ctx.globalCompositeOperation = 'source-over';
      this.lastPoint = { x: x, y: y };

      this.sampleProgress();
    }

    sampleProgress() {
      const now = Date.now();
      if (now - this.lastSample < SAMPLE_INTERVAL || !this.ctx) return;
      this.lastSample = now;

      let data;
      try {
        data = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
      } catch (error) {
        return;
      }

      let cleared = 0;
      let total = 0;

      /* Every 16th pixel: 16 pixels x 4 channels = a stride of 64 bytes. */
      for (let i = 3; i < data.length; i += 64) {
        total += 1;
        if (data[i] < 128) cleared += 1;
      }

      if (total && (cleared / total) * 100 >= this.threshold) this.reveal();
    }

    /* ------------------------------------------------------------- reveal */

    reveal() {
      if (this.revealed) return;
      this.revealed = true;
      this.scratching = false;

      if (this.canvas) {
        this.canvas.classList.add('is-cleared');
        const retire = () => {
          this.canvas.hidden = true;
        };
        if (REDUCED_MOTION) retire();
        else window.setTimeout(retire, 450);
      }

      if (this.prize) {
        this.prize.removeAttribute('inert');
        this.prize.setAttribute('aria-hidden', 'false');
        this.prize.classList.add('is-revealed');
      }

      if (this.revealButton) this.revealButton.hidden = true;

      if (window.HOG) {
        const label = this.prize ? this.prize.querySelector('.scratch-popup__prize-label') : null;
        window.HOG.announce(label ? label.textContent.trim() : 'Prize revealed');

        /* Re-trap so the newly interactive prize controls join the loop. */
        if (this.isOpen) {
          if (this.releaseFocus) this.releaseFocus();
          this.releaseFocus = window.HOG.trapFocus(this.dialog || this, () => this.dismiss());
        }
      }

      if (this.copyButton) this.copyButton.focus();
    }

    /* --------------------------------------------------------------- copy */

    async copyCode() {
      if (!this.copyButton) return;
      let copied = false;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(this.code);
          copied = true;
        } catch (error) {
          copied = false;
        }
      }

      if (!copied) {
        const scratchpad = document.createElement('textarea');
        scratchpad.value = this.code;
        scratchpad.setAttribute('readonly', '');
        scratchpad.style.position = 'fixed';
        scratchpad.style.opacity = '0';
        document.body.appendChild(scratchpad);
        scratchpad.select();
        try {
          copied = document.execCommand('copy');
        } catch (error) {
          copied = false;
        }
        scratchpad.remove();
      }

      if (!copied) return;

      this.copyButton.textContent = 'Copied!';
      window.clearTimeout(this.copyTimeout);
      this.copyTimeout = window.setTimeout(() => {
        this.copyButton.textContent = this.copyLabel;
      }, 2000);
    }
  }

  if (!customElements.get('scratch-popup')) {
    customElements.define('scratch-popup', ScratchPopup);
  }
})();
