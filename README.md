# House of Garments — Shopify Theme

Custom Online Store 2.0 theme for **[houseofgarments.co](https://houseofgarments.co)** — a Lebanon-based streetwear label.

> *EVERYBODY CAN'T HAVE LIMITED ITEMS.*

Built from scratch: no Dawn fork, no vendor bundles. Plain Liquid, one stylesheet, three small vanilla-JS modules. It ships with a drop-oriented homepage, a cart drawer, a countdown-capable hero, and section settings tuned for a small catalog of limited runs.

---

## Requirements

| Tool | Version |
| --- | --- |
| [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) | `>= 3.60` |
| Node.js | `>= 18` (only for lint/format scripts) |
| A Shopify store | Partner dev store or the live `houseofgarments.co` store |

## Quick start

```bash
git clone <this-repo> house-of-garments-theme
cd house-of-garments-theme
npm install

# Authenticate + start a live-reloading local preview
npm run dev -- --store houseofgarments.myshopify.com
```

The CLI prints a preview URL plus a link to the theme editor. Changes to
`sections/`, `snippets/`, `assets/` and `templates/` hot-reload.

## Everyday commands

```bash
npm run dev        # shopify theme dev  — local preview with hot reload
npm run check      # shopify theme check — Liquid linting (Theme Check)
npm run pull       # pull settings/content changes merchants made in the admin
npm run push       # push to an *unpublished* theme
npm run deploy     # push to the live theme (asks for confirmation)
npm run package    # produce a .zip you can upload in Admin → Themes
```

`npm run push` never targets the live theme. Publishing is a deliberate,
separate step — see [Deploying](#deploying).

## Repository layout

```
assets/           CSS + JS. base.css is the single stylesheet; JS is split by concern.
config/           settings_schema.json (what merchants can edit) + settings_data.json (current values).
layout/           theme.liquid wraps every page. password.liquid wraps the pre-launch gate.
locales/          en.default.json (storefront strings) + en.default.schema.json (editor labels).
sections/         Every section. `main-*` sections are the body of a given template.
snippets/         Reusable partials: product-card, price, icon, meta-tags, pagination.
templates/        JSON templates that compose sections. customers/ are Liquid (2.0 has no JSON there).
```

### Where to change things

| I want to… | Edit |
| --- | --- |
| Change brand colors, type scale, spacing | `config/settings_schema.json` → then set values in the theme editor |
| Restyle anything | `assets/base.css` (CSS custom properties live in `:root`) |
| Change the homepage layout | Theme editor, or `templates/index.json` directly |
| Add a new homepage block type | New file in `sections/`, then add it to `templates/index.json` |
| Change product page behaviour | `sections/main-product.liquid` + `assets/product-form.js` |
| Change cart drawer behaviour | `snippets/cart-drawer.liquid` + `assets/cart-drawer.js` |
| Add or reword any storefront string | `locales/en.default.json` |

## Design system

Everything is driven by CSS custom properties emitted from theme settings in
`layout/theme.liquid`. Nothing is hard-coded twice.

```
--color-bg          #0a0a0a   near-black canvas
--color-fg          #f5f5f5   off-white text
--color-accent      #d6ff3f   drop/limited highlight
--color-muted       #8a8a8a   secondary text, meta
--font-heading      condensed uppercase display face
--font-body         system/neutral sans
--space-1 … --space-8   4px-based spacing scale
--container         1440px max width
```

Layout is CSS grid + `clamp()` for fluid type. There is no CSS framework and no
build step for styles — `base.css` is served as-is by Shopify's CDN.

## JavaScript

Three ES modules, no dependencies, no bundler. Each is loaded with `defer` and
guards for the elements it needs before doing anything.

| File | Responsibility |
| --- | --- |
| `assets/theme.js` | Mobile nav, announcement rotation, scroll header, details polyfilling, `<countdown-timer>` |
| `assets/cart-drawer.js` | Cart Ajax API (`/cart/add.js`, `/cart/change.js`), drawer open/close, focus trap, live count |
| `assets/product-form.js` | Variant matching from the option inputs, price/availability swap, media sync, add-to-cart |

Custom elements used: `<cart-drawer>`, `<product-form>`, `<countdown-timer>`,
`<quantity-input>`, `<menu-drawer>`. All degrade to working HTML when JS fails —
the product form is a real `<form action="/cart/add">`, and the cart page works
without the drawer.

## Sections

| Section | Used on | Notes |
| --- | --- | --- |
| `announcement-bar` | all | Rotating messages. Default: *DELIVERY ALL OVER LEBANON* |
| `header` | all | Sticky, logo, nav, search, account, cart count |
| `footer` | all | Menus, Instagram, payment icons, newsletter opt-in |
| `hero` | index | Full-bleed image/video, optional drop countdown |
| `featured-collection` | index | Grid of N products from a chosen collection |
| `drop-banner` | index | Large type + CTA for the current release |
| `image-with-text` | index, pages | Editorial split block |
| `newsletter` | index, footer | Shopify customer form, `contact` type |
| `rich-text` | index, pages | Free text block |
| `main-product` | product | Gallery, variant picker, form, accordions |
| `main-collection` | collection | Filters, sort, grid, pagination |
| `main-cart` | cart | Full cart page fallback for the drawer |
| `main-search`, `main-404`, `main-page`, `main-blog`, `main-article`, `main-list-collections`, `main-password` | respective templates | |

## Theme settings

Grouped in the editor as **Brand**, **Colors**, **Typography**, **Layout**,
**Product cards**, **Cart**, **Social**, and **Advanced**. Notable ones:

- **Cart type** — drawer, page, or none.
- **Show "sold out" as "SOLD"** — streetwear convention, on by default.
- **Badge: limited / pre-order** — reads the product tag `limited` or a title
  prefix of `PRE-ORDER` and renders an accent badge on the card.
- **Currency code display** — appends `USD`, which matters for a Lebanon-based
  store pricing in dollars.

## Content conventions

The theme keys off a small set of tags. Keeping them consistent is what makes
the merchandising work.

| Tag | Effect |
| --- | --- |
| `limited` | Accent "LIMITED" badge on cards and the product page |
| `preorder` | "PRE-ORDER" badge; add-to-cart button label changes |
| `new` | "NEW" badge |
| `drop-<n>` | Groups a release, e.g. `drop-03`, for collection automation |

Product metafields read by the theme (all optional, namespace `custom`):

| Metafield | Type | Used for |
| --- | --- | --- |
| `custom.fabric` | single line text | Materials accordion |
| `custom.fit` | single line text | Fit accordion, e.g. "Boxy, oversized" |
| `custom.size_guide` | rich text | Size guide accordion |
| `custom.drop_date` | date and time | Hero + product countdown |

## Deploying

1. `npm run check` — must be clean.
2. `npm run push` — uploads to an unpublished theme; the CLI gives you a preview link.
3. Review the preview on a real device. Check the cart drawer and the product form.
4. `npm run deploy` — publishes.

Merchant edits made in the admin (menus, section settings, content) live in
`config/settings_data.json` and the JSON templates. Run `npm run pull` before
starting new work so you don't overwrite them.

### CI

`.github/workflows/theme-check.yml` runs Theme Check and validates every JSON
file on push and pull request. It does not deploy — publishing stays manual.

## Browser support

Evergreen Chrome, Safari, Firefox and Edge, plus iOS Safari 15+. The theme uses
`:has()` progressively — layouts do not depend on it.

## Accessibility

- Visible focus rings, never removed.
- Skip link to `#MainContent`.
- Drawers trap focus and restore it on close.
- All decorative imagery has empty `alt`; product imagery uses the media alt text.
- Color pairs in the default palette meet WCAG AA at body sizes.

## License

MIT — see [LICENSE](LICENSE). Brand assets, product photography, logos and the
House of Garments name are not covered by this license and remain the property
of House of Garments.
