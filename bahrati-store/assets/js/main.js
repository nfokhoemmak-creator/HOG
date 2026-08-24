/* ============================================================
   BAHRATI — storefront interactions
   ============================================================ */
(function () {
  "use strict";

  var PRODUCT = {
    id: "cross-bracelet",
    name: "The Cross Bracelet",
    price: 34.95,
    compareAt: 49.95,
    currency: "$",
    freeShipThreshold: 50,
    variants: {
      silver: {
        label: "Sterling Silver",
        images: [
          "assets/img/product-silver.jpg",
          "assets/img/lifestyle-silver-cuff.jpg",
          "assets/img/lifestyle-silver-chest.jpg",
          "assets/img/duo-still.jpg"
        ]
      },
      gold: {
        label: "18K Gold",
        images: [
          "assets/img/product-gold.jpg",
          "assets/img/lifestyle-gold-wrist.jpg",
          "assets/img/duo-still.jpg",
          "assets/img/lifestyle-silver-chest.jpg"
        ]
      }
    }
  };

  var money = function (n) {
    return PRODUCT.currency + n.toFixed(2);
  };

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Announcement rotator ---------- */
  (function () {
    var items = $$(".announce__item");
    if (items.length < 2) return;
    var i = 0;
    setInterval(function () {
      items[i].classList.remove("is-active");
      i = (i + 1) % items.length;
      items[i].classList.add("is-active");
    }, 3800);
  })();

  /* ---------- Sticky header state ---------- */
  (function () {
    var header = $(".header");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  })();

  /* ---------- Mobile nav ---------- */
  (function () {
    var nav = $(".mobile-nav");
    if (!nav) return;
    var open = function () { nav.classList.add("is-open"); document.body.classList.add("no-scroll"); };
    var close = function () { nav.classList.remove("is-open"); document.body.classList.remove("no-scroll"); };
    $$("[data-nav-open]").forEach(function (b) { b.addEventListener("click", open); });
    $$("[data-nav-close]").forEach(function (b) { b.addEventListener("click", close); });
    $$(".mobile-nav__links a", nav).forEach(function (a) { a.addEventListener("click", close); });
  })();

  /* ---------- Variant switching + gallery ---------- */
  var state = { variant: "silver", qty: 1 };

  function setMainImage(src) {
    var main = $("[data-gallery-main]");
    if (!main) return;
    if (main.getAttribute("src") === src) return;
    main.classList.add("is-fading");
    setTimeout(function () {
      main.setAttribute("src", src);
      main.onload = function () { main.classList.remove("is-fading"); };
      setTimeout(function () { main.classList.remove("is-fading"); }, 250);
    }, 180);
  }

  function renderThumbs() {
    var wrap = $("[data-gallery-thumbs]");
    if (!wrap) return;
    var imgs = PRODUCT.variants[state.variant].images;
    wrap.innerHTML = "";
    imgs.forEach(function (src, idx) {
      var b = document.createElement("button");
      b.className = "gallery__thumb" + (idx === 0 ? " is-active" : "");
      b.setAttribute("aria-label", "View image " + (idx + 1));
      b.innerHTML = '<img src="' + src + '" alt="' + PRODUCT.name + " in " + PRODUCT.variants[state.variant].label + '" loading="lazy">';
      b.addEventListener("click", function () {
        $$(".gallery__thumb", wrap).forEach(function (t) { t.classList.remove("is-active"); });
        b.classList.add("is-active");
        setMainImage(src);
      });
      wrap.appendChild(b);
    });
  }

  function applyVariant(v) {
    state.variant = v;
    $$("[data-variant]").forEach(function (s) {
      s.classList.toggle("is-active", s.getAttribute("data-variant") === v);
      s.setAttribute("aria-pressed", s.getAttribute("data-variant") === v ? "true" : "false");
    });
    $$("[data-variant-label]").forEach(function (el) {
      el.textContent = PRODUCT.variants[v].label;
    });
    setMainImage(PRODUCT.variants[v].images[0]);
    renderThumbs();
    var sticky = $("[data-sticky-img]");
    if (sticky) sticky.setAttribute("src", PRODUCT.variants[v].images[0]);
  }

  (function () {
    if (!$("[data-variant]")) return;
    $$("[data-variant]").forEach(function (s) {
      s.addEventListener("click", function () { applyVariant(s.getAttribute("data-variant")); });
    });
    var m = window.location.search.match(/[?&]finish=(gold|silver)/);
    if (m) applyVariant(m[1]);
    else renderThumbs();
  })();

  /* ---------- Quantity steppers (buy box) ---------- */
  (function () {
    var out = $("[data-qty-out]");
    if (!out) return;
    $$("[data-qty]").forEach(function (b) {
      b.addEventListener("click", function () {
        var d = parseInt(b.getAttribute("data-qty"), 10);
        state.qty = Math.min(9, Math.max(1, state.qty + d));
        out.textContent = state.qty;
      });
    });
  })();

  /* ---------- Accordions ---------- */
  $$(".accordion__item").forEach(function (item) {
    var btn = $(".accordion__btn", item);
    var body = $(".accordion__body", item);
    if (!btn || !body) return;
    btn.setAttribute("aria-expanded", item.classList.contains("is-open") ? "true" : "false");
    if (item.classList.contains("is-open")) body.style.maxHeight = body.scrollHeight + "px";
    btn.addEventListener("click", function () {
      var isOpen = item.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      body.style.maxHeight = isOpen ? body.scrollHeight + "px" : "0px";
    });
  });

  /* ---------- Reviews rail arrows ---------- */
  (function () {
    var rail = $("[data-reviews-rail]");
    if (!rail) return;
    var step = function () {
      var card = $(".review-card", rail);
      return card ? card.getBoundingClientRect().width + 20 : 380;
    };
    var prev = $("[data-reviews-prev]");
    var next = $("[data-reviews-next]");
    if (prev) prev.addEventListener("click", function () { rail.scrollBy({ left: -step(), behavior: "smooth" }); });
    if (next) next.addEventListener("click", function () { rail.scrollBy({ left: step(), behavior: "smooth" }); });
  })();

  /* ---------- Film sound toggle ---------- */
  (function () {
    var video = $("[data-film]");
    var btn = $("[data-film-sound]");
    if (!video || !btn) return;
    btn.addEventListener("click", function () {
      video.muted = !video.muted;
      btn.setAttribute("aria-label", video.muted ? "Unmute film" : "Mute film");
      $("[data-icon-muted]", btn).style.display = video.muted ? "" : "none";
      $("[data-icon-sound]", btn).style.display = video.muted ? "none" : "";
    });
  })();

  /* ---------- Cart (localStorage) ---------- */
  var CART_KEY = "bahrati_cart_v1";

  function readCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function writeCart(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { /* private mode */ }
    renderCart(items);
  }

  function cartCount(items) {
    return items.reduce(function (n, it) { return n + it.qty; }, 0);
  }

  function cartSubtotal(items) {
    return items.reduce(function (n, it) { return n + it.qty * PRODUCT.price; }, 0);
  }

  function renderCart(items) {
    items = items || readCart();

    var countEl = $("[data-cart-count]");
    if (countEl) {
      var n = cartCount(items);
      countEl.textContent = n;
      countEl.classList.toggle("has-items", n > 0);
    }

    var list = $("[data-cart-items]");
    var empty = $("[data-cart-empty]");
    var foot = $("[data-cart-foot]");
    if (!list) return;

    list.innerHTML = "";
    var hasItems = items.length > 0;
    if (empty) empty.style.display = hasItems ? "none" : "";
    if (foot) foot.style.display = hasItems ? "" : "none";

    items.forEach(function (it, idx) {
      var v = PRODUCT.variants[it.variant];
      var row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML =
        '<img src="' + v.images[0] + '" alt="' + PRODUCT.name + '">' +
        '<div><div class="cart-item__name">' + PRODUCT.name + "</div>" +
        '<div class="cart-item__variant">' + v.label + "</div>" +
        '<div class="qty"><button type="button" data-ci-minus aria-label="Decrease">&minus;</button><output>' + it.qty + "</output><button type=\"button\" data-ci-plus aria-label=\"Increase\">+</button></div>" +
        '<button type="button" class="cart-item__remove" data-ci-remove>Remove</button></div>' +
        '<div class="cart-item__price">' + money(it.qty * PRODUCT.price) + "</div>";
      $("[data-ci-minus]", row).addEventListener("click", function () { updateQty(idx, -1); });
      $("[data-ci-plus]", row).addEventListener("click", function () { updateQty(idx, 1); });
      $("[data-ci-remove]", row).addEventListener("click", function () { removeItem(idx); });
      list.appendChild(row);
    });

    var sub = cartSubtotal(items);
    $$("[data-cart-subtotal]").forEach(function (el) { el.textContent = money(sub); });

    var shipEl = $("[data-cart-shipping]");
    var freeMsg = $("[data-free-msg]");
    var freeBar = $("[data-free-bar]");
    var freeShip = sub >= PRODUCT.freeShipThreshold;
    if (shipEl) shipEl.textContent = hasItems ? (freeShip ? "Free" : "Calculated at checkout") : "—";
    if (freeMsg) {
      freeMsg.innerHTML = freeShip
        ? "&#10003; You've unlocked <strong>free worldwide shipping</strong>"
        : "You're <strong>" + money(PRODUCT.freeShipThreshold - sub) + "</strong> away from free worldwide shipping";
    }
    if (freeBar) freeBar.style.width = Math.min(100, (sub / PRODUCT.freeShipThreshold) * 100) + "%";
  }

  function updateQty(idx, d) {
    var items = readCart();
    if (!items[idx]) return;
    items[idx].qty = Math.max(0, Math.min(9, items[idx].qty + d));
    if (items[idx].qty === 0) items.splice(idx, 1);
    writeCart(items);
  }

  function removeItem(idx) {
    var items = readCart();
    items.splice(idx, 1);
    writeCart(items);
  }

  function addToCart(variant, qty) {
    var items = readCart();
    var found = items.filter(function (it) { return it.variant === variant; })[0];
    if (found) found.qty = Math.min(9, found.qty + qty);
    else items.push({ variant: variant, qty: qty });
    writeCart(items);
    openCart();
  }

  function openCart() {
    var d = $("[data-cart-drawer]");
    if (!d) return;
    renderCart();
    d.classList.add("is-open");
    document.body.classList.add("no-scroll");
  }

  function closeCart() {
    var d = $("[data-cart-drawer]");
    if (!d) return;
    d.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  }

  $$("[data-cart-open]").forEach(function (b) { b.addEventListener("click", openCart); });
  $$("[data-cart-close]").forEach(function (b) { b.addEventListener("click", closeCart); });

  $$("[data-add-to-cart]").forEach(function (b) {
    b.addEventListener("click", function () {
      addToCart(state.variant, state.qty);
      toast("Added to your bag — " + PRODUCT.variants[state.variant].label);
    });
  });

  (function () {
    var checkout = $("[data-checkout]");
    if (checkout) {
      checkout.addEventListener("click", function () {
        toast("Demo store — connect a payment provider to enable checkout.");
      });
    }
  })();

  renderCart();

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    var el = $("[data-toast]");
    if (!el) return;
    $("[data-toast-msg]", el).textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-visible"); }, 3400);
  }

  /* ---------- Newsletter ---------- */
  $$("[data-newsletter]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = $(".newsletter__ok", form.parentElement);
      if (ok) ok.style.display = "block";
      form.style.display = "none";
    });
  });

  /* ---------- Sticky mobile add-to-cart ---------- */
  (function () {
    var bar = $("[data-sticky-atc]");
    var anchor = $("[data-buy-box]");
    if (!bar || !anchor || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      bar.classList.toggle("is-visible", !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0);
    }, { threshold: 0 });
    io.observe(anchor);
  })();

  /* ---------- Reveal on scroll ---------- */
  (function () {
    var els = $$(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-inview"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-inview");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- Footer year ---------- */
  (function () {
    var y = $("[data-year]");
    if (y) y.textContent = new Date().getFullYear();
  })();
})();
