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
--color-bg            #f5f4f1   warm off-white page ground
--color-bg-alt        #ecebe6   alternate bands
--color-surface       #ffffff   raised: cards, drawers, dialogs, inputs
--color-border        #dcdad3   hairlines
--color-border-strong #8a8880   inputs and controls (3.2:1 on the ground)
--color-fg            #141414   text
--color-muted         #66655f   secondary text (AA on every surface)
--color-btn-bg        #141414   THE action colour — buttons and nothing else
--color-btn-fg        #f5f4f1   text on a button
--color-accent        #141414   badges use a tint of it; solid black stays on buttons
--color-success       #1e7a4c   in stock, unlocked, confirmed
--color-sale          #c8102e   sale prices, low stock, urgency
--color-gold          #e8c15a   blackjack chips and winnings (on the felt)
--color-felt          #0f5132   blackjack table
--rgb-*               triplets for rgb(var(--rgb-x) / .12) tints
--font-heading        Archivo, uppercase, tracked (display face is a setting, off by default)
--font-body           Assistant
--space-1 … --space-9   4px-based spacing scale
--container           1440px max width
```

The look follows anceplainford.com's "daily essentials" register — light,
quiet, product-led — while keeping House of Garments' own identity (limited
drops, the blackjack table, "EVERYBODY CAN'T HAVE LIMITED ITEMS").


### The one rule that matters

**`--color-btn-bg` means "click me" and appears nowhere else.** A page with two
ember elements has no primary action. That is why badges are a tinted ember on
a translucent fill rather than a solid one, why nav hovers and social icons
underline in `--color-fg`, and why countdowns and low-stock warnings use
`--color-sale`. Accelerated checkout buttons are deliberately quiet: the
add-to-cart button is the primary path.

Every pair in the palette was checked against WCAG: body text 16.8:1, muted
text 5.3:1 (4.9:1 on the alternate band), button text 16.8:1, sale text 5.4:1,
success 4.8:1, gold on the felt 5.4:1, `--color-border-strong` 3.2:1 for
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
| `blackjack` | page.blackjack | The table on its own page. See below. |
| `blackjack-popup` | footer group | The same table in a site-wide dialog with auto-open and a floating button. |
| `viral-program` | page.secret | The "Secret": a viral-video reimbursement program as editable tiers and steps. |
| `marquee` | index, pages | Hairline ticker; the `accent` style is an inverted band. |
| `bundle-builder` | index | Pick 2+ pieces, discount applied at checkout (bundle.js). |
| `trust-bar` | index | Delivery / payment / returns strip |
| `testimonials` | index | Customer quotes with star ratings |
| `faq` | index, pages | Accordion + `FAQPage` structured data |
| `main-search`, `main-404`, `main-page`, `main-blog`, `main-article`, `main-list-collections`, `main-password` | respective templates | |

## Blackjack

`snippets/blackjack-game.liquid` (the table), `sections/blackjack.liquid` (its
page), `sections/blackjack-popup.liquid` (the site-wide dialog) and
`assets/blackjack.js` (the engine).

Rules: a fresh 52-card deck each hand, dealer draws to 16 and stands on all 17s,
hit or stand (no double), a natural pays the top tier, a push burns no hand,
and ties pay the player unless the merchant turns that off. Up to three hands
a day per device; a win streak (three in a row by default) unlocks a higher
tier; using every hand without a win pays a consolation code so nobody leaves
the table with nothing. The reward reveal links to `/discount/<code>?redirect=`
so the code is applied for the customer.

Codes (each must exist in **Discounts**): `BLACKJACK10` win, `BLACKJACK21`
natural, `BLACKJACK15` streak, `BLACKJACK5` consolation. All four exist on the
store and are active — but with no usage limit and not once-per-customer. The
codes are visible in the page source, so set *one use per customer* on each.

The table is a dark island on the light page: leather rail, felt with the
tier and rule markings rendered from the section's settings, physical cards
with mirrored indices and a 3D flip on the hole card, chip stacks for hands
left, a streak pill, and the reward as a ticket. The engine is unchanged from
the previous live theme except that `stand()` delays each drawn card's
animation.

## The Secret page

`sections/viral-program.liquid` + `templates/page.secret.json`. Create a page
in Admin with the template *page.secret* and add it to the menu. Post a video
wearing the brand; at the first tier's view count a percentage of the order is
reimbursed, at the second, more — thresholds, percentages, the cap, the rules
and the contact handle are all settings and blocks, so the page never promises
anything the merchant did not type.

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

The current build is on the store as the unpublished theme **"HOG v6 — light
essentials + blackjack"**, every file checksum-verified against commit
`26393b6`. Preview it from Admin → Online Store → Themes, then **Publish** from
there — publishing is a manual step by design. Note that Shopify's Liquid
parser rejects a literal `'{{ count }}'` inside an output tag even though
Theme Check allows it; `layout/theme.liquid` builds that placeholder from
pieces for exactly this reason.

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
