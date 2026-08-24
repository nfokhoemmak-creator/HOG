# BAHRATI — Storefront

A complete, self-contained storefront for the BAHRATI accessories brand:
a conversion-focused homepage plus a full product page for **The Cross
Bracelet** in two finishes (18K Gold / Sterling Silver).

## What's inside

```
bahrati-store/
├── index.html            Homepage (hero, USP bar, product, film, story,
│                         reviews, trust badges, shipping, FAQ, newsletter)
├── product.html          Product page (gallery, variants, accordions,
│                         full reviews, sticky mobile add-to-cart)
├── assets/
│   ├── css/style.css     All styling (ivory & gold design system)
│   ├── js/main.js        Variants, cart drawer, carousels, accordions
│   ├── img/              Product photography, hero, favicon
│   └── video/            The brand film + poster frame
└── README.md
```

## Run it

No build step, no dependencies. Open `index.html` in a browser, or serve
the folder with any static host (Netlify, Vercel, GitHub Pages, S3…):

```
npx serve bahrati-store
```

## Swap in your own product photos

The pages reference images by filename, so replacing artwork is just
overwriting files in `assets/img/` (keep the same names):

| File                         | Used as                                  |
| ---------------------------- | ---------------------------------------- |
| `product-silver.jpg`         | Silver variant main shot (4:5)           |
| `product-gold.jpg`           | Gold variant main shot (4:5)             |
| `lifestyle-silver-cuff.jpg`  | Silver on-wrist detail (4:5)             |
| `lifestyle-silver-chest.jpg` | Silver on-model shot (4:5)               |
| `lifestyle-gold-wrist.jpg`   | Gold on-wrist detail (4:5)               |
| `hero.jpg`                   | Homepage hero (16:9, wide)               |
| `duo-still.jpg`              | Story section + gallery still (1:1)      |
| `film-poster.jpg`            | Video poster frame (16:9)                |

The film lives at `assets/video/bahrati-film.mp4` — replace it with any
H.264 MP4 to change the video section.

## Edit prices, variants & copy

Product data used by the cart and variant switcher sits at the top of
`assets/js/main.js` (`PRODUCT` object): price, compare-at price, currency
symbol, free-shipping threshold, and the image list per variant. Prices
shown in the HTML (`index.html` / `product.html`) are plain text — search
for `$34.95` to update them everywhere.

## Going live (checkout)

The cart is fully client-side (localStorage) and the checkout button is a
demo stub. To take real payments, either:

1. Rebuild the theme on Shopify and reuse these assets/copy, or
2. Wire the checkout button to a payment link (Stripe Payment Links,
   PayPal, Shopify Buy Button) — it's the `data-checkout` button in the
   cart drawer of both HTML files.

Also before launch: replace the placeholder contact address
(`hello@bahrati.com`) and review the sample review content, shipping
times and guarantees so they match your actual policies.
