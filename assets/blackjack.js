/* ==========================================================================
   House of Garments — blackjack.js
   The house deals blackjack for discount codes: single 52-card deck per
   hand, dealer stands on all 17s, naturals pay the big code, pushes burn
   nothing. Wins reveal a real code with a copy button and a /discount
   deep link.

   Loaded by sections/blackjack.liquid, which supplies the tiers, codes and
   daily hand limit as a JSON blob. The daily count and win streak live in
   localStorage (guarded — private mode just forgets between visits).
   No dependencies; without JS the section shows its noscript note.
   ========================================================================== */

(function () {
  'use strict';

  const STORAGE_KEY = 'hog_blackjack';

  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUIT_NAMES = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
  const RANK_NAMES = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };

  /* ----------------------------------------------------------------- deck */

  function randomInt(max) {
    const cryptoObj = window.crypto || window.msCrypto;
    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
      // Rejection sampling keeps the modulo from biasing low cards.
      const limit = Math.floor(4294967296 / max) * max;
      const buffer = new Uint32Array(1);
      let value;
      do {
        cryptoObj.getRandomValues(buffer);
        value = buffer[0];
      } while (value >= limit);
      return value % max;
    }
    return Math.floor(Math.random() * max);
  }

  function buildDeck() {
    const deck = [];
    SUITS.forEach((suit) => {
      RANKS.forEach((rank) => deck.push({ rank, suit }));
    });
    return deck;
  }

  function shuffle(deck) {
    // Fisher–Yates, back to front.
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      const swap = deck[i];
      deck[i] = deck[j];
      deck[j] = swap;
    }
    return deck;
  }

  /* -------------------------------------------------------------- scoring */

  function handValue(cards) {
    let total = 0;
    let aces = 0;

    cards.forEach((card) => {
      if (card.rank === 'A') {
        total += 11;
        aces += 1;
      } else if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') {
        total += 10;
      } else {
        total += parseInt(card.rank, 10);
      }
    });

    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }

    // Soft while at least one ace still counts as 11.
    return { total: total, soft: aces > 0 };
  }

  function scoreLabel(cards) {
    if (cards.length === 0) return '';
    const value = handValue(cards);
    if (value.soft && value.total !== 21) {
      return (value.total - 10) + ' / ' + value.total;
    }
    return String(value.total);
  }

  /* ----------------------------------------------------------------- misc */

  function todayKey() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  }

  function cardName(card) {
    return (RANK_NAMES[card.rank] || card.rank) + ' of ' + SUIT_NAMES[card.suit];
  }

  function cardElement(card, down) {
    const el = document.createElement('div');
    el.className = 'bj-card bj-card--flip';
    el.setAttribute('role', 'img');

    if (down) {
      // Face-down: no rank or suit in the DOM until the reveal.
      el.classList.add('bj-card--down');
      el.setAttribute('aria-label', 'Face-down card');
      return el;
    }

    el.setAttribute('aria-label', cardName(card));
    if (card.suit === '♥' || card.suit === '♦') el.classList.add('bj-card--red');

    const label = card.rank + card.suit;

    const cornerTop = document.createElement('span');
    cornerTop.className = 'bj-card__corner';
    cornerTop.textContent = label;

    const pip = document.createElement('span');
    pip.className = 'bj-card__pip';
    pip.textContent = card.suit;

    const cornerBottom = document.createElement('span');
    cornerBottom.className = 'bj-card__corner';
    cornerBottom.textContent = label;

    el.appendChild(cornerTop);
    el.appendChild(pip);
    el.appendChild(cornerBottom);
    return el;
  }

  function tierFrom(raw, fallbackCode, fallbackPercent) {
    raw = raw && typeof raw === 'object' ? raw : {};
    return {
      code: typeof raw.code === 'string' && raw.code !== '' ? raw.code : fallbackCode,
      percent: parseInt(raw.percent, 10) || fallbackPercent
    };
  }

  /* ------------------------------------------------------ <blackjack-game> */

  class BlackjackGame extends HTMLElement {
    connectedCallback() {
      this.dealerCards = this.querySelector('[data-bj-dealer-cards]');
      this.playerCards = this.querySelector('[data-bj-player-cards]');
      this.dealerScore = this.querySelector('[data-bj-dealer-score]');
      this.playerScore = this.querySelector('[data-bj-player-score]');
      this.statusTarget = this.querySelector('[data-bj-status]');
      this.dealBtn = this.querySelector('[data-bj-deal]');
      this.hitBtn = this.querySelector('[data-bj-hit]');
      this.standBtn = this.querySelector('[data-bj-stand]');
      this.resultTarget = this.querySelector('[data-bj-result]');
      this.resultTitle = this.querySelector('[data-bj-result-title]');
      this.codeTarget = this.querySelector('[data-bj-code]');
      this.copyBtn = this.querySelector('[data-bj-copy]');
      this.shopLink = this.querySelector('[data-bj-shop]');
      this.metaTarget = this.querySelector('[data-bj-meta]');

      if (!this.dealerCards || !this.playerCards || !this.dealBtn) return;

      this.config = this.readConfig();
      this.state = this.readState();
      this.inHand = false;
      this.activeCode = '';

      if (!this.bound) {
        this.bound = true;
        this.dealBtn.addEventListener('click', () => this.deal());
        if (this.hitBtn) this.hitBtn.addEventListener('click', () => this.hit());
        if (this.standBtn) this.standBtn.addEventListener('click', () => this.stand());
        if (this.copyBtn) this.copyBtn.addEventListener('click', () => this.copyCode());
      }

      // Catch the date rolling over while the tab sits open overnight.
      this.onVisible = () => {
        if (document.visibilityState === 'visible') this.syncDay();
      };
      document.addEventListener('visibilitychange', this.onVisible);

      if (this.playsLeft() > 0) {
        this.setStatus("DEALER'S READY WHEN YOU ARE.");
      } else {
        this.setStatus("TABLE'S CLOSED FOR TODAY.");
      }
      this.updateMeta();
      this.updateButtons();
    }

    disconnectedCallback() {
      document.removeEventListener('visibilitychange', this.onVisible);
      window.clearTimeout(this.copyTimer);
    }

    /* -------------------------------------------------------------- config */

    readConfig() {
      let parsed = {};
      const el = this.querySelector('[data-bj-config]');
      if (el) {
        try {
          parsed = JSON.parse(el.textContent) || {};
        } catch (error) {
          parsed = {};
        }
      }

      const tiers = parsed.tiers && typeof parsed.tiers === 'object' ? parsed.tiers : {};
      const streak = tierFrom(tiers.streak, 'BLACKJACK15', 15);
      streak.length = parseInt(tiers.streak && tiers.streak.length, 10) || 3;

      return {
        playsPerDay: Math.max(1, parseInt(parsed.playsPerDay, 10) || 3),
        tiers: {
          win: tierFrom(tiers.win, 'BLACKJACK10', 10),
          blackjack: tierFrom(tiers.blackjack, 'BLACKJACK21', 21),
          streak: streak
        },
        shopUrl: typeof parsed.shopUrl === 'string' && parsed.shopUrl !== '' ? parsed.shopUrl : '/collections/all',
        shopLabel: typeof parsed.shopLabel === 'string' && parsed.shopLabel !== '' ? parsed.shopLabel : 'APPLY CODE & SHOP'
      };
    }

    /* --------------------------------------------------------------- state */

    readState() {
      const today = todayKey();
      let stored = null;
      try {
        stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      } catch (error) {
        stored = null;
      }

      const state = { d: today, plays: 0, streak: 0 };
      if (stored && typeof stored === 'object') {
        state.streak = Math.max(0, parseInt(stored.streak, 10) || 0);
        if (stored.d === today) {
          state.plays = Math.max(0, parseInt(stored.plays, 10) || 0);
        }
      }
      return state;
    }

    writeState() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (error) {
        // Private mode — the hand still plays, the house just forgets.
      }
    }

    syncDay() {
      if (this.state.d === todayKey()) return;
      this.state.d = todayKey();
      this.state.plays = 0;
      this.writeState();
      if (!this.inHand) {
        this.setStatus("DEALER'S READY WHEN YOU ARE.");
        this.updateMeta();
        this.updateButtons();
      }
    }

    playsLeft() {
      return Math.max(0, this.config.playsPerDay - this.state.plays);
    }

    /* ---------------------------------------------------------------- play */

    deal() {
      this.syncDay();
      if (this.inHand || this.playsLeft() < 1) return;

      this.inHand = true;
      this.deck = shuffle(buildDeck());
      this.player = [this.deck.pop(), this.deck.pop()];
      this.dealer = [this.deck.pop(), this.deck.pop()];
      this.holeHidden = true;

      this.playerCards.textContent = '';
      this.dealerCards.textContent = '';
      this.hideResult();

      this.playerCards.appendChild(cardElement(this.player[0], false));
      this.playerCards.appendChild(cardElement(this.player[1], false));
      this.dealerCards.appendChild(cardElement(this.dealer[0], false));
      this.dealerCards.appendChild(cardElement(this.dealer[1], true));

      this.updateScores();
      this.updateButtons();

      if (handValue(this.player).total === 21) {
        // Natural — resolve on the spot, checking the dealer for a push.
        const dealerNatural = handValue(this.dealer).total === 21;
        this.revealHole();
        if (dealerNatural) {
          this.finish('push', 'TWO BLACKJACKS.');
        } else {
          this.finish('blackjack', null);
        }
        return;
      }

      this.setStatus('HIT OR STAND?');
    }

    hit() {
      if (!this.inHand || this.holeHidden !== true) return;

      const card = this.deck.pop();
      this.player.push(card);
      this.playerCards.appendChild(cardElement(card, false));
      this.updateScores();

      const value = handValue(this.player);
      if (value.total > 21) {
        // Bust — the dealer wins without drawing.
        this.revealHole();
        this.finish('lose', 'BUST.');
      } else if (value.total === 21) {
        this.stand();
      }
    }

    stand() {
      if (!this.inHand) return;

      this.revealHole();

      // Dealer draws to 17 and stands on all 17s, soft included.
      let dealerValue = handValue(this.dealer);
      while (dealerValue.total < 17) {
        const card = this.deck.pop();
        this.dealer.push(card);
        this.dealerCards.appendChild(cardElement(card, false));
        dealerValue = handValue(this.dealer);
      }
      this.updateScores();

      const playerTotal = handValue(this.player).total;
      if (dealerValue.total > 21) {
        this.finish('win', 'DEALER BUSTS.');
      } else if (dealerValue.total > playerTotal) {
        this.finish('lose', null);
      } else if (dealerValue.total < playerTotal) {
        this.finish('win', null);
      } else {
        this.finish('push', null);
      }
    }

    finish(outcome, note) {
      this.inHand = false;
      const prefix = note ? note + ' ' : '';

      if (outcome === 'push') {
        // A push burns no daily play and keeps the streak alive.
        this.setStatus(prefix + 'PUSH. NO HAND BURNED — DEAL AGAIN.');
      } else if (outcome === 'lose') {
        this.state.plays += 1;
        this.state.streak = 0;
        this.writeState();
        const left = this.playsLeft();
        this.setStatus(
          prefix + 'HOUSE WINS. ' + left + (left === 1 ? ' HAND' : ' HANDS') + ' LEFT TODAY.'
        );
      } else {
        // 'win' or 'blackjack' — a winning final play still pays out.
        this.state.plays += 1;
        this.state.streak += 1;
        this.writeState();

        const natural = outcome === 'blackjack';
        let tier = natural ? this.config.tiers.blackjack : this.config.tiers.win;
        let streakLine = '';

        const streakTier = this.config.tiers.streak;
        if (this.state.streak >= streakTier.length && streakTier.percent > tier.percent) {
          tier = streakTier;
          streakLine = this.state.streak + ' WINS IN A ROW. ';
        }

        this.setStatus(prefix + streakLine + (natural ? 'BLACKJACK.' : 'YOU BEAT THE HOUSE.'));
        this.showResult(tier, natural);
      }

      this.updateMeta();
      this.updateButtons();
    }

    /* ------------------------------------------------------------ rendering */

    revealHole() {
      if (this.holeHidden !== true) return;
      this.holeHidden = false;
      const downCard = this.dealerCards.querySelector('.bj-card--down');
      if (downCard) downCard.replaceWith(cardElement(this.dealer[1], false));
      this.updateScores();
    }

    updateScores() {
      if (this.playerScore) this.playerScore.textContent = scoreLabel(this.player || []);
      if (this.dealerScore) {
        const visible = this.holeHidden ? (this.dealer || []).slice(0, 1) : this.dealer || [];
        this.dealerScore.textContent = scoreLabel(visible);
      }
    }

    setStatus(message) {
      if (this.statusTarget) this.statusTarget.textContent = message;
    }

    updateMeta() {
      if (!this.metaTarget) return;
      const left = this.playsLeft();
      this.metaTarget.textContent =
        left > 0
          ? left + ' OF ' + this.config.playsPerDay + ' HANDS LEFT TODAY. PUSHES ARE FREE.'
          : "YOU'RE DONE FOR TODAY — BACK TOMORROW.";
    }

    updateButtons() {
      const idle = !this.inHand;
      this.dealBtn.hidden = !idle;
      if (this.hitBtn) this.hitBtn.hidden = idle;
      if (this.standBtn) this.standBtn.hidden = idle;

      const locked = idle && this.playsLeft() < 1;
      this.dealBtn.disabled = locked;
      this.dealBtn.setAttribute('aria-disabled', String(locked));
    }

    showResult(tier, natural) {
      if (!this.resultTarget) return;

      this.activeCode = tier.code;

      if (this.resultTitle) {
        this.resultTitle.textContent = natural
          ? 'BLACKJACK. ' + tier.percent + '% OFF'
          : 'YOU WIN ' + tier.percent + '% OFF';
      }

      if (this.codeTarget) this.codeTarget.textContent = tier.code;

      if (this.shopLink) {
        this.shopLink.href =
          '/discount/' + encodeURIComponent(tier.code) + '?redirect=' + encodeURIComponent(this.config.shopUrl);
        this.shopLink.textContent = this.config.shopLabel;
      }

      if (this.copyBtn) {
        this.copyBtn.textContent = 'COPY';
        this.copyBtn.disabled = false;
      }

      this.resultTarget.hidden = false;
    }

    hideResult() {
      if (!this.resultTarget) return;
      this.resultTarget.hidden = true;
      this.activeCode = '';
    }

    /* ----------------------------------------------------------------- copy */

    copyCode() {
      const code = this.activeCode;
      if (!code || !this.copyBtn) return;

      const done = () => this.flashCopyButton('COPIED ✓');
      const fail = () => this.flashCopyButton('COPY FAILED');

      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(code).then(done, () => this.copyFallback(code, done, fail));
      } else {
        this.copyFallback(code, done, fail);
      }
    }

    copyFallback(code, done, fail) {
      const input = document.createElement('input');
      input.value = code;
      input.setAttribute('readonly', '');
      input.style.position = 'absolute';
      input.style.left = '-9999px';
      this.appendChild(input);
      input.select();
      input.setSelectionRange(0, code.length);

      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch (error) {
        copied = false;
      }

      input.remove();
      if (copied) {
        done();
      } else {
        fail();
      }
    }

    flashCopyButton(label) {
      if (!this.copyBtn) return;
      this.copyBtn.textContent = label;
      window.clearTimeout(this.copyTimer);
      this.copyTimer = window.setTimeout(() => {
        this.copyBtn.textContent = 'COPY';
      }, 1800);
    }
  }

  if (!customElements.get('blackjack-game')) {
    customElements.define('blackjack-game', BlackjackGame);
  }
})();
