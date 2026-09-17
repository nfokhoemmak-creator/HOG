# Goodest Chews — Shopify Theme

Custom Online Store 2.0 theme for **[goodestchews.com](https://goodestchews.com)** — a one-product store selling 8-in-1 multivitamin soft chews for dogs.

> *For the goodest dogs.*

Built from scratch: no Dawn fork, no vendor bundles. Plain Liquid, one stylesheet, three small vanilla-JS modules. Everything is tuned for a single product sold in bundles: a long-form landing page, a bundle-first product page, a cart drawer with a bundle upsell, and sticky buy bars.

---

## Requirements

| Tool | Version |
| --- | --- |
| [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) | `>= 3.60` |
| Node.js | `>= 18` (only for lint/format scripts) |
| A Shopify store | The live `goodestchews.com` store (`xwxndg-q8.myshopify.com`) |

## Quick start

```bash
npm install
npm run dev -- --store xwxndg-q8.myshopify.com
```

The CLI prints a preview URL plus a link to the theme editor. Changes to
`sections/`, `snippets/`, `assets/` and `templates/` hot-reload.

## Everyday commands

```bash
npm run dev        # shopify theme dev  — local preview with hot reload
npm run check      # shopify theme check — Liquid linting (Theme Check)
npm run pull       # pull settings/content changes made in the admin
npm run push       # push to an *unpublished* theme
npm run deploy     # push to the live theme (asks for confirmation)
npm run package    # produce a .zip you can upload in Admin → Themes
```

## Repository layout

```
assets/           base.css (single stylesheet) + theme.js, cart-drawer.js, product-form.js
config/           settings_schema.json (theme settings) + settings_data.json (current values)
layout/           theme.liquid wraps every page. password.liquid wraps the pre-launch gate.
locales/          en.default.json — every storefront string
sections/         Every section. `main-*` sections are the body of a template.
snippets/         icon, logo (image or CSS wordmark fallback), stars, price, product-card, sticky-cta
templates/        JSON templates. index.json is the landing page; product.json the product page.
```

## The one product

Everything points at the product chosen in **Theme settings → Brand → The product**.
Bundles are plain variants of that product (option "Bundle": `1 Jar`, `2 Jars`, `3 Jars`).
The theme reads the number of jars from the variant title, so:

- the bundle cards and the product-page picker show per-jar price and % saved from `compare_at_price`,
- the cart drawer offers to upgrade a single jar to the next bundle,
- the sticky bars always show the selected bundle's price.

To change prices or savings, edit the variants in Shopify admin — no theme change needed.

## Landing page (`templates/index.json`)

Hero → trust bar → problem/solution → scrolling strip → 8 benefits → how it works →
what's inside → **bundles** → reviews → comparison table → certifications → guarantee → FAQ → final CTA.

Every section is editable in the theme editor; every heading, bullet and review is a setting.

## Reviews and ratings

`sections/reviews.liquid` renders review blocks from the template and computes the average,
count and star breakdown from those blocks. The reviews shipped in `templates/index.json` and
`templates/product.json` are **sample placeholders** — replace them with real customer reviews
(or a reviews app) before launch.

The star rating in the hero and on the product page reads **Theme settings → Trust & guarantee →
Average rating**. It is empty by default and nothing renders until you set it.

## Guarantee length

**Theme settings → Trust & guarantee → Guarantee length** drives the hero badge, guarantee seal,
cart, sticky bars and every text setting that contains the `[days]` token (announcements, hero
bullets, bundle perks, FAQ answers, footer). Write `[days]` in copy instead of a number.

## Certifications

`sections/certifications.liquid` lists the manufacturing facility's certifications with
certificate numbers. Each block has an optional image picker for the certificate scan
(adds a "View certificate" link) and a verification URL.

## Design system

Tokens are emitted from theme settings in `layout/theme.liquid`:

```
--color-bg        #FFFBF4  cream canvas
--color-green     #0F5132  brand green (headings, trust)
--color-orange    #F07F1F  brand orange (CTAs, highlights)
--font-heading    Fredoka  (rounded, matches the logo)
--font-body       Nunito
--radius          20px
```

## JavaScript

| File | Responsibility |
| --- | --- |
| `assets/theme.js` | Menu drawer, announcement rotation, header shadow, reveal-on-scroll, count-ups, `<sticky-bar>`, `<product-gallery>`, one-open FAQ |
| `assets/cart-drawer.js` | Ajax cart, drawer open/close, quick-add forms, bundle upsell swap |
| `assets/product-form.js` | Bundle picker → price / savings / per-jar / availability / sticky bar |

All custom elements degrade to working HTML: forms post to `/cart/add`, the cart page works without the drawer.

## Deploying

1. `npm run validate:json && npm run check` — must be clean.
2. `npm run push` — uploads to an unpublished theme; the CLI gives you a preview link.
3. Review on a real phone: hero, bundle cards, sticky bar, cart drawer upsell.
4. `npm run deploy` — publishes.

## License

MIT — see [LICENSE](LICENSE). Brand assets, product photography, the logo and the
Goodest Chews name are not covered by this license and remain the property of Goodest Chews.
