/* ==========================================================================
   Shark Bite — section-video-reels.js
   <video-reels>: a horizontal scroll-snap row of 9:16 videos.
   - The card that is mostly in view (>= 60%) autoplays muted; the others
     pause (IntersectionObserver).
   - Each card has a mute toggle (only one card carries sound at a time) and
     a play/pause toggle; tapping the video itself also toggles play/pause.
   - Prev/next arrows on desktop, arrow keys on the focused track.
   Videos are rendered with preload="none", so nothing downloads until a
   reel scrolls into view. Without JS the posters show and nothing breaks.
   ========================================================================== */

(function () {
  'use strict';

  if (customElements.get('video-reels')) return;

  const REDUCED_MOTION =
    !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const VISIBLE_RATIO = 0.6;

  class VideoReels extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector('[data-reels-track]');
      if (!this.track) return;

      this.autoplay = this.getAttribute('data-autoplay') !== 'false' && !REDUCED_MOTION;
      this.cards = Array.from(this.querySelectorAll('[data-reel]'))
        .map((card) => ({
          card,
          video: card.querySelector('video'),
          play: card.querySelector('[data-reel-play]'),
          mute: card.querySelector('[data-reel-mute]'),
          visible: false,
          userPaused: false
        }))
        .filter((entry) => entry.video);

      this.prevButton = this.querySelector('[data-reels-prev]');
      this.nextButton = this.querySelector('[data-reels-next]');

      this.onVisibility = this.onVisibility.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onKeydown = this.onKeydown.bind(this);
      this.onPrev = () => this.scrollByCard(-1);
      this.onNext = () => this.scrollByCard(1);

      this.cards.forEach((entry) => this.setupCard(entry));
      this.observe();

      if (this.prevButton) this.prevButton.addEventListener('click', this.onPrev);
      if (this.nextButton) this.nextButton.addEventListener('click', this.onNext);
      this.track.addEventListener('scroll', this.onScroll, { passive: true });
      this.track.addEventListener('keydown', this.onKeydown);
      document.addEventListener('visibilitychange', this.onVisibility);

      this.updateArrows();
    }

    disconnectedCallback() {
      if (this.observer) this.observer.disconnect();
      if (this.prevButton) this.prevButton.removeEventListener('click', this.onPrev);
      if (this.nextButton) this.nextButton.removeEventListener('click', this.onNext);
      if (this.track) {
        this.track.removeEventListener('scroll', this.onScroll);
        this.track.removeEventListener('keydown', this.onKeydown);
      }
      document.removeEventListener('visibilitychange', this.onVisibility);
      (this.cards || []).forEach((entry) => this.pause(entry));
    }

    /* ------------------------------------------------------------ cards */

    setupCard(entry) {
      const { card, video, play, mute } = entry;

      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.setAttribute('playsinline', '');
      video.removeAttribute('controls');

      if (play) {
        play.hidden = false;
        play.addEventListener('click', (event) => {
          event.preventDefault();
          this.togglePlay(entry);
        });
      }

      if (mute) {
        mute.hidden = false;
        mute.addEventListener('click', (event) => {
          event.preventDefault();
          this.toggleMute(entry);
        });
      }

      video.addEventListener('click', () => this.togglePlay(entry));
      video.addEventListener('play', () => this.reflect(entry));
      video.addEventListener('pause', () => this.reflect(entry));
      video.addEventListener('volumechange', () => this.reflect(entry));

      this.reflect(entry);
    }

    reflect(entry) {
      const { card, video, play, mute } = entry;
      const playing = !video.paused && !video.ended;
      card.classList.toggle('is-playing', playing);
      if (play) {
        play.setAttribute(
          'aria-label',
          playing ? play.getAttribute('data-label-pause') || 'Pause' : play.getAttribute('data-label-play') || 'Play'
        );
      }
      if (mute) {
        mute.setAttribute('aria-pressed', video.muted ? 'true' : 'false');
        mute.setAttribute(
          'aria-label',
          video.muted ? mute.getAttribute('data-label-unmute') || 'Unmute' : mute.getAttribute('data-label-mute') || 'Mute'
        );
      }
    }

    play(entry) {
      const { video } = entry;
      if (!video.paused) return;
      const attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => {
          // Autoplay was blocked (e.g. data saver). Leave the poster and the
          // play button; a tap will start it.
          video.muted = true;
          this.reflect(entry);
        });
      }
    }

    pause(entry) {
      const { video } = entry;
      if (!video.paused) video.pause();
    }

    togglePlay(entry) {
      if (entry.video.paused) {
        entry.userPaused = false;
        this.play(entry);
      } else {
        entry.userPaused = true;
        this.pause(entry);
      }
    }

    toggleMute(entry) {
      const { video } = entry;
      const unmuting = video.muted;
      if (unmuting) {
        // Only one reel carries sound at a time.
        this.cards.forEach((other) => {
          if (other !== entry) other.video.muted = true;
        });
        video.muted = false;
        entry.userPaused = false;
        this.play(entry);
      } else {
        video.muted = true;
      }
      this.reflect(entry);
    }

    /* ------------------------------------------------------- observing */

    observe() {
      if (!('IntersectionObserver' in window)) return;

      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((change) => {
            const entry = this.cards.find((item) => item.card === change.target);
            if (!entry) return;
            entry.visible = change.isIntersecting && change.intersectionRatio >= VISIBLE_RATIO;

            if (entry.visible) {
              if (this.autoplay && !entry.userPaused && !document.hidden) this.play(entry);
            } else {
              this.pause(entry);
              // Re-mute when a reel leaves the viewport so it can autoplay again later.
              entry.video.muted = true;
              entry.userPaused = false;
            }
          });
        },
        { root: null, threshold: [0, VISIBLE_RATIO, 1] }
      );

      this.cards.forEach((entry) => this.observer.observe(entry.card));
    }

    onVisibility() {
      if (document.hidden) {
        this.cards.forEach((entry) => this.pause(entry));
      } else if (this.autoplay) {
        this.cards.forEach((entry) => {
          if (entry.visible && !entry.userPaused) this.play(entry);
        });
      }
    }

    /* ------------------------------------------------------ navigation */

    cardStep() {
      const first = this.track.querySelector('[data-reel]');
      if (!first) return this.track.clientWidth * 0.8;
      const styles = window.getComputedStyle(this.track);
      const gap = parseFloat(styles.columnGap || styles.gap) || 0;
      return first.getBoundingClientRect().width + gap;
    }

    scrollByCard(direction) {
      this.track.scrollBy({
        left: this.cardStep() * direction,
        behavior: REDUCED_MOTION ? 'auto' : 'smooth'
      });
    }

    onKeydown(event) {
      if (event.target !== this.track) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.scrollByCard(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.scrollByCard(-1);
      }
    }

    onScroll() {
      if (this.scrollRaf) return;
      this.scrollRaf = window.requestAnimationFrame(() => {
        this.scrollRaf = null;
        this.updateArrows();
      });
    }

    updateArrows() {
      if (!this.prevButton && !this.nextButton) return;
      const maxScroll = this.track.scrollWidth - this.track.clientWidth;
      const position = this.track.scrollLeft;
      if (this.prevButton) this.prevButton.disabled = position <= 2;
      if (this.nextButton) this.nextButton.disabled = position >= maxScroll - 2;
    }
  }

  customElements.define('video-reels', VideoReels);
})();
