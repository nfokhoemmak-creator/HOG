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
--color-bg            #0b0b0d   near-black canvas
--color-bg-alt        #141418   alternate band
--color-surface       #1d1d23   raised: cards, drawers, the felt
--color-border        #2a2a32   hairlines
--color-border-strong #63636f   inputs and controls (3:1 against the canvas)
--color-fg            #f7f7f5   off-white text
--color-muted         #9a9aa6   secondary text, meta
--color-btn-bg        #ff4d1c   THE action colour — buttons and nothing else
--color-btn-fg        #0b0b0d   text on a button
--color-accent        #ff4d1c   badges and highlights; tracks the button
--color-success       #2fd98a   in stock, order placed, code unlocked
--color-sale          #ff2d55   sale prices, low stock, countdowns
--color-gold          #e8c15a   blackjack chips and winnings
--color-felt          #0e5c3a   blackjack table
--font-heading        condensed uppercase display face
--font-body           system/neutral sans
--space-1 … --space-8   4px-based spacing scale
--container           1440px max width
```

### The one rule that matters

**`--color-btn-bg` means "click me" and appears nowhere else.** A page with two
ember elements has no primary action. That is why badges are a tinted ember on
a translucent fill rather than a solid one, why nav hovers and social icons
underline in `--color-fg`, and why countdowns and low-stock warnings use
`--color-sale`. Accelerated checkout buttons are deliberately quiet: the
add-to-cart button is the primary path.

Every pair in the palette was checked against WCAG: body text 18.3:1, muted
text 7.1:1, button text on ember 5.9:1, `--color-border-strong` 3.3:1 for
non-text controls. If you change a colour in the editor, re-check the pair —
the theme does not police it for you.


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
| `assets/blackjack.js` | The `<blackjack-table>` game. Loaded by its own section, not globally. |

Custom elements used: `<cart-drawer>`, `<product-form>`, `<countdown-timer>`,
`<quantity-input>`, `<menu-drawer>`, `<blackjack-table>`. All degrade to working HTML when JS fails —
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
| `blackjack` | index, pages | Beat-the-dealer discount game. See below. |
| `trust-bar` | index | Delivery / payment / returns strip |
| `testimonials` | index | Customer quotes with star ratings |
| `faq` | index, pages | Accordion + `FAQPage` structured data |
| `main-search`, `main-404`, `main-page`, `main-blog`, `main-article`, `main-list-collections`, `main-password` | respective templates | |

## Blackjack

`sections/blackjack.liquid` + `assets/blackjack.js`. One hand against the
dealer; beat the house and a discount code is revealed.

Rules: six-deck shoe reshuffled at the cut card, dealer draws to 16 and stands
on 17 (soft-17 behaviour is a setting), hit / stand / double on the opening two
cards, natural blackjack pays the top reward tier, a push costs nothing and
returns the hand. Roughly **41% of hands end in a code** — simulated over 80,000
rounds, which matches the real distribution (about 4.7% naturals, 9% pushes).
Turning on *Dealer hits soft 17* only moves that to about 40.8%; if you need a
lower win rate, change the reward, not the rules.

### The codes are not secret

Reward codes are section settings, so they ship in the page HTML. Anyone can
read them without playing a hand. That is fine for a promo mechanic as long as
the discount itself is capped:

1. Create the discount in **Discounts**, not just in the theme.
2. Set **Maximum discount uses** → *Limit to one use per customer*, and cap the
   total uses if the offer is meant to be scarce.
3. Set an end date that matches the drop.

The *Plays allowed* setting (one per day / one ever / unlimited) is held in the
visitor's browser, so clearing site data resets it. It shapes the experience;
it does not protect the margin. The usage limit on the discount does.

### Turning it off

Clear the discount code in the section settings and the whole section stops
rendering, or remove it from `templates/index.json`.

## Conversion features

Beyond the palette, the pieces that exist specifically to move orders:

| Feature | Where |
| --- | --- |
| Sticky buy bar on mobile | `main-product` → *Buy buttons* block. A second submit for the same form, revealed once the real button scrolls away. |
| Free-shipping progress | `snippets/shipping-meter.liquid`, in the cart drawer and cart page. Threshold is a theme setting under **Cart**. |
| Trust row under add-to-cart | `main-product` → *Trust row* block |
| Trust bar on the homepage | `sections/trust-bar.liquid` |
| Social proof | `sections/testimonials.liquid` |
| Objection handling + SEO | `sections/faq.liquid`, which emits `FAQPage` structured data |
| In-stock confirmation | `product-form.js` — says "in stock" as well as "only N left" |

The homepage order is deliberate: prove (trust bar), sell (drop), engage
(blackjack), reassure (testimonials, FAQ), capture (newsletter).

Two settings that need a matching change in Shopify Admin, not just the editor:

- **Free shipping over** — set the matching rate under *Settings → Shipping*,
  or the meter promises something checkout will not honour.
- **Blackjack codes** — must exist in *Discounts*, with a usage limit.

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
