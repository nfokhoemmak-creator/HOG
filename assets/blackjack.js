/* ==========================================================================
   House of Garments — blackjack.js
   <blackjack-table> — beat the dealer, unlock a discount code.

   Rules implemented: 6-deck shoe reshuffled at the cut card, blackjack pays
   the top reward tier, player may hit / stand / double on the opening two
   cards, dealer draws to 16 and stands on 17 (soft 17 behaviour is a section
   setting). Push returns the play without spending it.

   The reward codes are section settings, so they ship in the page source.
   They are a promo mechanic, not a secret — set a usage limit on the discount
   in Shopify Admin. See "Blackjack" in README.md.

   No dependencies. If this file fails to load the section renders a static
   headline and the rest of the page is unaffected.
   ========================================================================== */

(function () {
  'use strict';

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SUITS = [
    { symbol: '♠', name: 'spades', red: false },
    { symbol: '♥', name: 'hearts', red: true },
    { symbol: '♦', name: 'diamonds', red: true },
    { symbol: '♣', name: 'clubs', red: false }
  ];

  const RANKS = [
    { label: 'A', value: 11 },
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '4', value: 4 },
    { label: '5', value: 5 },
    { label: '6', value: 6 },
    { label: '7', value: 7 },
    { label: '8', value: 8 },
    { label: '9', value: 9 },
    { label: '10', value: 10 },
    { label: 'J', value: 10 },
    { label: 'Q', value: 10 },
    { label: 'K', value: 10 }
  ];

  const DECKS = 6;
  const STORAGE_KEY = 'hog:blackjack';

  /* ------------------------------------------------------------ shoe/cards */

  function buildShoe() {
    const cards = [];
    for (let d = 0; d < DECKS; d += 1) {
      SUITS.forEach((suit) => {
        RANKS.forEach((rank) => cards.push({ rank, suit }));
      });
    }
    return shuffle(cards);
  }

  // Fisher-Yates, seeded from crypto where the browser offers it so the
  // shuffle isn't predictable from Math.random's state.
  function shuffle(cards) {
    const random = randomSource(cards.length);
    for (let i = cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const swap = cards[i];
      cards[i] = cards[j];
      cards[j] = swap;
    }
    return cards;
  }

  function randomSource(count) {
    if (!window.crypto || !window.crypto.getRandomValues) return Math.random;
    const pool = new Uint32Array(count);
    window.crypto.getRandomValues(pool);
    let cursor = 0;
    return function next() {
      if (cursor >= pool.length) return Math.random();
      cursor += 1;
      return pool[cursor - 1] / 4294967296;
    };
  }

  /* ------------------------------------------------------------ hand maths */

  // Returns { total, soft }. Aces count 11 until that would bust, then 1.
  function score(hand) {
    let total = 0;
    let aces = 0;

    hand.forEach((card) => {
      total += card.rank.value;
      if (card.rank.label === 'A') aces += 1;
    });

    let soft = aces > 0;
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
      soft = aces > 0;
    }

    return { total: total, soft: soft };
  }

  function isBlackjack(hand) {
    return hand.length === 2 && score(hand).total === 21;
  }

  /* -------------------------------------------------------------- storage */

  // Play limits are a courtesy, not enforcement — localStorage is trivially
  // cleared. The real limit belongs on the discount code in Shopify Admin.
  function readState() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function writeState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* Private mode, quota, or storage disabled — the game still plays. */
    }
  }

  function periodKey(limit) {
    if (limit === 'daily') return new Date().toISOString().slice(0, 10);
    if (limit === 'once') return 'once';
    return null;
  }

  /* -------------------------------------------------------- <blackjack-table> */

  class BlackjackTable extends HTMLElement {
    connectedCallback() {
      const config = this.querySelector('[data-blackjack-config]');
      if (!config) return;

      try {
        this.config = JSON.parse(config.textContent);
      } catch (error) {
        return;
      }

      this.el = {
        dealerCards: this.querySelector('[data-dealer-cards]'),
        dealerScore: this.querySelector('[data-dealer-score]'),
        playerCards: this.querySelector('[data-player-cards]'),
        playerScore: this.querySelector('[data-player-score]'),
        status: this.querySelector('[data-status]'),
        controls: this.querySelector('[data-controls]'),
        reward: this.querySelector('[data-reward]'),
        rewardLabel: this.querySelector('[data-reward-label]'),
        rewardCode: this.querySelector('[data-reward-code]'),
        rewardCopy: this.querySelector('[data-reward-copy]'),
        rewardShop: this.querySelector('[data-reward-shop]'),
        intro: this.querySelector('[data-intro]'),
        table: this.querySelector('[data-table]'),
        deal: this.querySelector('[data-action="deal"]'),
        hit: this.querySelector('[data-action="hit"]'),
        stand: this.querySelector('[data-action="stand"]'),
        double: this.querySelector('[data-action="double"]'),
        again: this.querySelector('[data-action="again"]')
      };

      this.shoe = buildShoe();
      this.round = null;

      this.bind();
      this.restore();
    }

    bind() {
      if (this.el.deal) this.el.deal.addEventListener('click', () => this.deal());
      if (this.el.again) this.el.again.addEventListener('click', () => this.deal());
      if (this.el.hit) this.el.hit.addEventListener('click', () => this.hit());
      if (this.el.stand) this.el.stand.addEventListener('click', () => this.stand());
      if (this.el.double) this.el.double.addEventListener('click', () => this.double());
      if (this.el.rewardCopy) this.el.rewardCopy.addEventListener('click', () => this.copyCode());
    }

    /* ------------------------------------------------------------- state */

    // A visitor who already won keeps their code across reloads; a visitor
    // who used up their play sees why the table is closed.
    restore() {
      const key = periodKey(this.config.playLimit);
      if (!key) return;

      const saved = readState();
      if (saved.period !== key) return;

      if (saved.code) {
        this.showReward(saved.tier, saved.code, true);
        return;
      }

      if (saved.spent) this.lockOut();
    }

    remember(patch) {
      const key = periodKey(this.config.playLimit);
      if (!key) return;
      writeState(Object.assign({ period: key }, patch));
    }

    lockOut() {
      this.setStatus(this.config.strings.comeBack, 'over');
      this.toggle({ deal: false, hit: false, stand: false, double: false, again: false });
      if (this.el.intro) this.el.intro.hidden = true;
    }

    /* -------------------------------------------------------------- play */

    draw() {
      // Reshuffle at the cut card rather than dealing the shoe to the felt.
      if (this.shoe.length < DECKS * 52 * 0.25) this.shoe = buildShoe();
      return this.shoe.pop();
    }

    deal() {
      const saved = readState();
      const key = periodKey(this.config.playLimit);
      if (key && saved.period === key && (saved.spent || saved.code)) {
        this.lockOut();
        return;
      }

      this.round = {
        player: [this.draw(), this.draw()],
        dealer: [this.draw(), this.draw()],
        doubled: false,
        over: false
      };

      if (this.el.intro) this.el.intro.hidden = true;
      if (this.el.table) this.el.table.hidden = false;
      if (this.el.reward) this.el.reward.hidden = true;

      this.render();

      // A natural resolves immediately — no decision to make.
      if (isBlackjack(this.round.player) || isBlackjack(this.round.dealer)) {
        this.finish();
        return;
      }

      this.setStatus(this.config.strings.yourMove, 'live');
      this.toggle({ deal: false, hit: true, stand: true, double: this.config.allowDouble, again: false });
    }

    hit() {
      if (!this.round || this.round.over) return;

      this.round.player.push(this.draw());
      this.render();

      if (score(this.round.player).total > 21) {
        this.finish();
        return;
      }

      // Double is a first-decision-only option.
      this.toggle({ deal: false, hit: true, stand: true, double: false, again: false });
    }

    double() {
      if (!this.round || this.round.over || this.round.player.length !== 2) return;

      this.round.doubled = true;
      this.round.player.push(this.draw());
      this.render();
      this.stand();
    }

    stand() {
      if (!this.round || this.round.over) return;

      this.toggle({ deal: false, hit: false, stand: false, double: false, again: false });

      if (score(this.round.player).total > 21) {
        this.finish();
        return;
      }

      this.dealerPlay();
    }

    // Dealer reveals, then draws one card at a time so the player can follow.
    dealerPlay() {
      const step = () => {
        const hand = score(this.round.dealer);
        const mustHit =
          hand.total < 17 || (hand.total === 17 && hand.soft && this.config.dealerHitsSoft17);

        if (!mustHit) {
          this.finish();
          return;
        }

        this.round.dealer.push(this.draw());
        this.render(true);

        if (REDUCED_MOTION) step();
        else window.setTimeout(step, 550);
      };

      this.round.revealed = true;
      this.render(true);

      if (REDUCED_MOTION) step();
      else window.setTimeout(step, 450);
    }

    /* ---------------------------------------------------------- outcomes */

    outcome() {
      const player = score(this.round.player).total;
      const dealer = score(this.round.dealer).total;
      const playerNatural = isBlackjack(this.round.player);
      const dealerNatural = isBlackjack(this.round.dealer);

      if (playerNatural && dealerNatural) return 'push';
      if (playerNatural) return 'blackjack';
      if (dealerNatural) return 'lose';
      if (player > 21) return 'bust';
      if (dealer > 21) return 'win';
      if (player > dealer) return 'win';
      if (player < dealer) return 'lose';
      return 'push';
    }

    finish() {
      this.round.over = true;
      this.round.revealed = true;
      this.render(true);

      const result = this.outcome();
      const won = result === 'win' || result === 'blackjack';
      const tier = result === 'blackjack' && this.config.rewards.blackjack.code
        ? 'blackjack'
        : 'win';

      if (won) {
        const reward = this.config.rewards[tier];
        this.setStatus(this.config.strings[result], 'won');
        this.remember({ spent: true, code: reward.code, tier: tier });
        this.showReward(tier, reward.code, false);
        this.toggle({ deal: false, hit: false, stand: false, double: false, again: false });
        return;
      }

      this.setStatus(this.config.strings[result], result === 'push' ? 'push' : 'lost');

      // A push costs nothing — the player gets the hand back.
      if (result === 'push') {
        this.toggle({ deal: false, hit: false, stand: false, double: false, again: true });
        return;
      }

      this.remember({ spent: true });
      this.toggle({
        deal: false,
        hit: false,
        stand: false,
        double: false,
        again: this.config.playLimit === 'none'
      });

      if (this.config.playLimit !== 'none' && this.config.strings.comeBack) {
        this.appendStatus(this.config.strings.comeBack);
      }
    }

    showReward(tier, code, restored) {
      if (!this.el.reward || !code) return;

      const reward = this.config.rewards[tier] || this.config.rewards.win;

      if (this.el.rewardLabel) this.el.rewardLabel.textContent = reward.label;
      if (this.el.rewardCode) this.el.rewardCode.textContent = code;
      if (this.el.rewardShop && reward.url) this.el.rewardShop.href = reward.url;

      this.el.reward.hidden = false;
      if (this.el.intro) this.el.intro.hidden = true;

      if (restored) {
        if (this.el.table) this.el.table.hidden = true;
        this.setStatus(this.config.strings.alreadyWon, 'won');
      }

      if (window.HOG && window.HOG.announce) {
        window.HOG.announce(reward.label + ' ' + code);
      }
    }

    copyCode() {
      const code = this.el.rewardCode ? this.el.rewardCode.textContent.trim() : '';
      if (!code) return;

      const done = () => {
        const original = this.el.rewardCopy.dataset.label || this.el.rewardCopy.textContent;
        this.el.rewardCopy.dataset.label = original;
        this.el.rewardCopy.textContent = this.config.strings.copied;
        window.setTimeout(() => {
          this.el.rewardCopy.textContent = original;
        }, 2000);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done, () => {});
        return;
      }

      // Older Safari and any non-secure context.
      const field = document.createElement('textarea');
      field.value = code;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      try {
        document.execCommand('copy');
        done();
      } catch (error) {
        /* Leave the code on screen to be copied by hand. */
      }
      document.body.removeChild(field);
    }

    /* ----------------------------------------------------------- render */

    render(revealDealer) {
      const reveal = revealDealer || this.round.revealed;

      this.paint(this.el.playerCards, this.round.player, false);
      this.paint(this.el.dealerCards, this.round.dealer, !reveal);

      const player = score(this.round.player);
      if (this.el.playerScore) this.el.playerScore.textContent = this.label(player);

      if (this.el.dealerScore) {
        this.el.dealerScore.textContent = reveal
          ? this.label(score(this.round.dealer))
          : this.label(score([this.round.dealer[0]]), true);
      }
    }

    // "17" for a hard hand, "7 / 17" for a soft one, "?" while the hole card
    // is face down. At 21 the soft reading is noise — a natural should read
    // "21", not "11 / 21".
    label(hand, partial) {
      if (partial) return hand.total + ' + ?';
      if (!hand.soft || hand.total >= 21) return String(hand.total);
      return hand.total - 10 + ' / ' + hand.total;
    }

    paint(target, hand, hideSecond) {
      if (!target) return;
      target.innerHTML = '';

      hand.forEach((card, index) => {
        const facedown = hideSecond && index === 1;
        target.appendChild(this.cardNode(card, facedown, index));
      });
    }

    cardNode(card, facedown, index) {
      const node = document.createElement('div');
      node.className = 'bj-card' + (facedown ? ' bj-card--back' : '');
      if (!facedown && card.suit.red) node.classList.add('bj-card--red');
      if (!REDUCED_MOTION) node.style.animationDelay = index * 70 + 'ms';

      if (facedown) {
        node.setAttribute('aria-label', this.config.strings.faceDown);
        return node;
      }

      node.setAttribute(
        'aria-label',
        card.rank.label + ' of ' + card.suit.name
      );

      const rank = document.createElement('span');
      rank.className = 'bj-card__rank';
      rank.textContent = card.rank.label;

      const suit = document.createElement('span');
      suit.className = 'bj-card__suit';
      suit.textContent = card.suit.symbol;
      suit.setAttribute('aria-hidden', 'true');

      node.appendChild(rank);
      node.appendChild(suit);
      return node;
    }

    setStatus(message, tone) {
      if (!this.el.status) return;
      this.el.status.textContent = message;
      this.el.status.dataset.tone = tone || '';
    }

    appendStatus(message) {
      if (!this.el.status) return;
      this.el.status.textContent = this.el.status.textContent + ' ' + message;
    }

    toggle(map) {
      Object.keys(map).forEach((key) => {
        const node = this.el[key];
        if (node) node.hidden = !map[key];
      });
    }
  }

  if (!customElements.get('blackjack-table')) {
    customElements.define('blackjack-table', BlackjackTable);
  }
})();
