# HOG Atelier — Shopify Theme

A custom, conversion-focused Shopify Online Store 2.0 theme for a premium
dropshipping storefront: minimal luxury look (light palette, serif display
headings, black buttons, gold accent), built to sell.

Built from scratch: no Dawn fork, no vendor bundles. Plain Liquid, one base
stylesheet, small vanilla-JS modules. Everything works without JS (real forms
everywhere) and everything is configurable from the theme editor.

---

## Store features

**Conversion toolkit**

- **Announcement bar** — rotating offers (free shipping / sale / bundle deal).
- **Scratch-card popup** — full-screen "Try your luck" popup with a countdown
  timer and a canvas scratch card that reveals a discount code and applies it
  to checkout automatically. Frequency capping (per visitor / day / session),
  fully configurable in the editor.
- **Free-shipping progress bar** — in the cart drawer and cart page, driven by
  one threshold setting.
- **Bundle & save (quantity breaks)** — Buy 1 / Buy 2 / Buy 3 tiles on the
  product page with per-tier savings, badges ("MOST POPULAR", "BEST VALUE")
  and optional per-tier discount codes that auto-apply at checkout.
- **Bundle promo section** — homepage "Complete the set" offer that adds 2–3
  products to the cart in one click and applies a bundle code.
- **Product page** — star rating row, urgency countdown, trust badges,
  payment icons, benefit checklist, shipping/warranty accordions, sticky
  mobile add-to-cart bar, thumbnail gallery, variant-aware pricing.
- **Reviews** — testimonial carousel with star ratings, plus a **Trustpilot**
  section: paste your TrustBox business-unit ID for the real widget, or use
  the built-in static rating until you have one.
- **Video** — hero background video (uploaded or .mp4 URL) and a standalone
  video section (uploaded, YouTube or Vimeo).
- **USP bar, press-logo marquee, image-with-text, newsletter** — the rest of
  the homepage system.

### Make the offers real (one-time admin setup)

The theme displays offers; Shopify applies the actual money off. Create these
discounts in **Admin → Discounts** (names must match the codes configured in
the theme editor — defaults below):

| Code | Type | Suggested rule |
| --- | --- | --- |
| `BUNDLE10` | Percentage code, 10% | Minimum quantity 2 |
| `BUNDLE15` | Percentage code, 15% | Minimum quantity 3 (also used by the homepage bundle) |
| `LUCKY15` | Percentage code, 15% | The scratch-popup prize |

Tip: create them as **automatic discounts** with the same quantity rules if
you also want customers who ignore the widgets to get the deal. The theme's
widgets pre-apply the code via `/discount/CODE`, so checkout picks it up
without the customer typing anything.

Set the **free shipping threshold** in Theme settings → Cart, and configure a
matching free-shipping rate in **Settings → Shipping** so the promise is real.

---

## Requirements

| Tool | Version |
| --- | --- |
| [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) | `>= 3.60` |
| Node.js | `>= 18` (only for lint/format scripts) |
| A Shopify store | Any plan; a Partner dev store works |

## Quick start

```bash
git clone <this-repo> theme && cd theme
npm install

# Authenticate + start a live-reloading local preview
npm run dev -- --store your-store.myshopify.com
```

### Publishing without the CLI

- **Zip upload:** `npm run package` (or zip the repo minus `node_modules`,
  `scripts`, `.git`) → Admin → Online Store → Themes → **Add theme → Upload
  zip file**.
- **GitHub:** Admin → Themes → **Add theme → Connect from GitHub** and pick
  this repo/branch — pushes then sync to the theme automatically.

## Everyday commands

```bash
npm run dev             # shopify theme dev — local preview with hot reload
npm run check           # shopify theme check — Liquid linting
npm run validate:json   # every JSON document parses (incl. section schemas)
npm run validate:theme  # cross-reference lint: sections/blocks/snippets exist,
                        # balanced Liquid tags, preset sanity
npm run pull            # pull settings/content merchants changed in the admin
npm run push            # push to an *unpublished* theme
npm run deploy          # push to the live theme (asks for confirmation)
npm run package         # produce a .zip for Admin → Themes
```

## Repository layout

```
assets/           CSS + JS. base.css is the single stylesheet; JS split by concern.
config/           settings_schema.json (what merchants edit) + settings_data.json (values).
layout/           theme.liquid wraps every page. password.liquid wraps the launch gate.
locales/          en.default.json (storefront strings) + en.default.schema.json (editor labels).
sections/         Every section. `main-*` sections are the body of a template.
snippets/         Reusable partials: product-card, price, icon, star-rating, bundle-offers…
templates/        JSON templates that compose sections. customers/ are Liquid.
scripts/          Node lint helpers used by the validate:* commands.
```

## Design system

Everything is driven by CSS custom properties emitted from theme settings in
`layout/theme.liquid`. Nothing is hard-coded twice.

```
--color-bg          #ffffff   canvas
--color-bg-alt      #f7f6f3   tinted bands, cards
--color-fg          #141414   text
--color-accent      #8f7339   gold — highlights, savings, progress
--color-muted       #75706a   secondary text, meta
--font-heading      Marcellus (serif display, tracked uppercase)
--font-body         Assistant (neutral sans)
--space-1 … --space-9   4px-based spacing scale
--container         1400px max width
```

New sections carry their component CSS in a scoped `{% style %}` block and
consume only these variables, so retheming stays a settings-only job.

## JavaScript

No dependencies, no bundler. Each file is loaded with `defer` and degrades:
the storefront renders, navigates and checks out with JS disabled.

| File | Responsibility |
| --- | --- |
| `assets/theme.js` | Mobile nav, announcement rotation, reveal-on-scroll, `<countdown-timer>`, `<quantity-input>` |
| `assets/cart-drawer.js` | Ajax cart (`/cart/add.js`, `/cart/change.js`), drawer, `HOG.addItems`, `HOG.applyDiscount` |
| `assets/product-form.js` | Variant matching, price/availability swap, media sync, `variant:change` event |
| `assets/conversion.js` | `<evergreen-countdown>`, `<bundle-offer>` quantity breaks, `<sticky-atc>` |
| `assets/scratch-popup.js` | `<scratch-popup>` — canvas scratch card, timer, frequency capping |

## Sections

| Section | Used on | Notes |
| --- | --- | --- |
| `announcement-bar` | all | Rotating offer messages |
| `header` / `footer` | all | Sticky header; footer menus, newsletter, payment icons |
| `scratch-popup` | all (footer group) | Scratch-to-win discount popup with timer |
| `hero` | index | Full-bleed image or video, optional countdown |
| `usp-bar` | index | Icon benefit strip (shipping / warranty / returns / support) |
| `featured-collection` | index, product | Product grid from a chosen collection |
| `image-with-text` | index, pages | Editorial split block |
| `bundle-promo` | index | 2–3 product set with one-click add + bundle code |
| `video-section` | index, pages | Uploaded / YouTube / Vimeo video |
| `testimonials` | index, product | Star-rated review carousel |
| `trustpilot` | index | TrustBox embed or static rating fallback |
| `logo-list` | index | "As featured in" marquee |
| `newsletter` | index, footer | Shopify customer form |
| `main-product` | product | Gallery, rating, countdown, bundles, trust badges, sticky ATC |
| `main-collection` | collection | Filters, sort, grid, pagination |
| `main-cart` | cart | Cart page with free-shipping progress |
| `main-*` (search, 404, page, blog, article, list-collections, password) | respective templates | |

## Theme settings

Grouped in the editor as **Brand**, **Colors**, **Typography**, **Layout**,
**Product cards**, **Cart**, **Social**, and **Search**. Notable ones:

- **Cart → Free shipping threshold** — drives the progress bar in drawer + cart.
- **Cart type** — drawer (default) or page.
- **Badges** — product tags `limited`, `preorder`, `new` render card badges.
- **Rating metafields** — if `reviews.rating` / `reviews.rating_count`
  metafields exist (set by most review apps), the product-page rating block
  uses them automatically instead of its manual settings.

## Validation

```bash
npm run validate:json && npm run validate:theme
```

Both run offline (no Shopify auth needed) and catch the mistakes that break a
theme upload: bad JSON, missing section/snippet references, unbalanced Liquid
tags, presets pointing at undeclared blocks.

## Browser support

Evergreen Chrome, Safari, Firefox and Edge, plus iOS Safari 15+.

## Accessibility

- Visible focus rings, never removed.
- Skip link to `#MainContent`; drawers and popups trap focus and restore it.
- Scratch popup and drawers close on Escape; countdowns are `aria-live` safe.
- Color pairs in the default palette meet WCAG AA at body sizes.

## License

MIT — see [LICENSE](LICENSE). Brand assets, product photography and store
names are not covered by this license.
