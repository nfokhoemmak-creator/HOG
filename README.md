# Shark Bite — Shopify Theme

Custom Online Store 2.0 theme for **[sharkbitelb.store](https://sharkbitelb.store)** — plush shark
slippers and the famous wearable shark blanket, delivered across Lebanon.

> *Jaw-droppingly cozy.*

Built from scratch: no Dawn fork, no build step, no vendor bundles. Plain Liquid, one base
stylesheet plus a small CSS file per section, and a handful of vanilla-JS custom elements that
all degrade to working HTML. The theme only *displays* offers — Shopify's automatic discounts
apply them — so the storefront can never promise a price the checkout will not honour.

---

## Requirements

| Tool | Version |
| --- | --- |
| [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) | `>= 3.60` |
| Node.js | `>= 18` (only for the lint and validation scripts) |
| A Shopify store | The live store (`9d81da.myshopify.com`) or a development store |

## Quick start

```bash
git clone <this-repo> shark-bite-theme
cd shark-bite-theme
npm install

# Authenticate and start a live-reloading local preview
npm run dev -- --store 9d81da.myshopify.com
```

The CLI prints a preview URL plus a link to the theme editor. Changes to `sections/`,
`snippets/`, `assets/` and `templates/` hot-reload.

## Everyday commands

```bash
npm run dev            # shopify theme dev   — local preview with hot reload
npm run check          # shopify theme check — Liquid linting (Theme Check, see .theme-check.yml)
npm run validate:json  # parse every JSON file and every {% schema %} block
npm run pull           # pull settings/content changes merchants made in the admin
npm run push           # push to an *unpublished* theme
npm run deploy         # push to the live theme (asks for confirmation)
npm run package        # produce a .zip you can upload in Admin → Online Store → Themes
```

`npm run push` never targets the live theme. Publishing is a deliberate, separate step —
see [Deploying](#deploying).

## Repository layout

```
assets/       base.css (tokens, primitives, header/footer/cart/cards) + section-*.css per section.
              theme.js, cart-drawer.js, product-form.js are shared; section-*.js belong to one section.
config/       settings_schema.json (what merchants edit) + settings_data.json (current values + app embeds).
layout/       theme.liquid wraps every page; password.liquid wraps the pre-launch gate.
locales/      en.default.json (storefront strings); en.default.schema.json (editor labels, nearly empty).
sections/     Every section. main-* sections are the body of a template; *-group.json are the
              header and footer section groups.
snippets/     Reusable partials: product-card, price, rating, icon, video, free-shipping-bar, …
templates/    JSON templates that compose sections. customers/ and gift_card are Liquid.
scripts/      validate-json.mjs — CI-style JSON gate.
```

### Where to change things

| I want to… | Edit |
| --- | --- |
| Change colours, fonts, spacing, offer numbers | Theme editor → Theme settings (`config/settings_schema.json` defines them) |
| Restyle a primitive (buttons, cards, forms, badges) | `assets/base.css` (tokens live in `:root`) |
| Restyle one section | `assets/section-<name>.css` |
| Change the homepage layout or copy | Theme editor, or `templates/index.json` directly |
| Change the header / announcement bar / footer | `sections/header-group.json`, `sections/footer-group.json` |
| Change the product page | `templates/product.json` (slippers) / `templates/product.blanket.json` + `sections/main-product.liquid` |
| Change the bundles page | `templates/page.bundles.json` |
| Change cart drawer behaviour | `sections/cart-drawer.liquid` + `assets/cart-drawer.js` |
| Reword any non-editable storefront string | `locales/en.default.json` |

## Design system

Everything is driven by CSS custom properties emitted from theme settings in
`layout/theme.liquid`; `assets/base.css` carries matching fallbacks so the theme renders
correctly even before settings are saved.

```
--color-bg              #FBF8F2   warm sand page background
--color-surface         #FFFFFF   cards, drawers
--color-surface-alt     #DDEFF1   soft aqua bands (.section--alt)
--color-ink             #0E1B2E   deep navy text
--color-muted           #5B6675   secondary text
--color-brand           #0B3B6F   navy: footer, announcement bar, secondary buttons
--color-accent          #FF6A3D   coral: the primary CTA background and nothing else
--color-success         #177A4C   free-shipping unlocked, in stock
--color-sale            #BF3A24   .badge--sale only
--color-star            #E8A700   rating stars
--font-heading          Outfit (700; 800 for .display/.h1)
--font-body             Nunito Sans (400)
--space-1 … --space-9   .4rem … 12rem spacing scale (1rem = 10px)
--container             1280px max width, --gutter 20px → 32px at ≥990px
--radius                16px; --radius-btn follows it (0 → square buttons, ≥1 → pills)
```

Rules worth knowing before you touch CSS:

- **Coral is the clickable primary action only.** One coral button per viewport. It is never
  text, never a badge fill, never a progress bar (contrast on sand is 2.68:1).
- Body text is ink on sand/white; coloured running text only via `--color-success`,
  `--color-accent-text` (#B9431C) or `--color-brand-muted` on navy.
- Form control borders use `--color-border-strong` (≥3:1); `--color-border` is for hairlines.
- Focus rings are a two-tone offset ring (`--focus-ring`), never removed.
- Mobile-first, breakpoints `750px`, `990px`, `1200px`. Tap targets are 44px minimum.

## JavaScript

No dependencies, no bundler. Every file is loaded with `defer` and guards for the elements it
needs. Everything degrades: product forms are real `<form action="/cart/add">`, bundle cards link
to the products, the cart page works without the drawer.

| File | Responsibility |
| --- | --- |
| `assets/theme.js` | `window.SB` helpers (`formatMoney`, `announce`, `trapFocus`, `lockScroll`), `<menu-drawer>`, `<announcement-rotator>`, `<quantity-input>`, `<sb-modal>`, `.reveal` motion |
| `assets/cart-drawer.js` | `SB.addToCart` / `SB.openCart` / `SB.refreshCart`, `<cart-drawer>`, `<cart-items>` (cart page), quick-add interception, `cart:updated` events |
| `assets/product-form.js` | `<product-form>` (variant resolution, price, availability, low stock, media, URL), `<sticky-atc>` |
| `assets/section-bundle-builder.js` | `<bundle-builder>` — slot pickers, discount math, multi-line add to cart |
| `assets/section-main-product.js` | `<product-gallery>`, `<product-tiers>`, `<product-ship-note>`, `<bundle-companion>`, `<product-description>` |
| `assets/section-product-recommendations.js` | `<product-recommendations>` (Shopify recommendations API) |
| `assets/section-video-reels.js`, `assets/component-video.js` | `<video-reels>` autoplay-in-view scroller, `<video-facade>` click-to-load YouTube/Vimeo |

`layout/theme.liquid` defines `window.theme` before any script: translated strings, routes,
money format, cart type, the free-shipping threshold in cents, the slipper/blanket product ids
and the discount percentages from theme settings. Cart lines are classified by product id
(`/cart.js` items carry no collections) and quantities are summed, never line-counted.

## Section catalogue

| Section | Used on | Notes |
| --- | --- | --- |
| `announcement-bar` | header group | Rotating `announcement` / `rating` blocks; navy by default; scrolls away (only the header sticks) |
| `header` | header group | Sticky, logo, nav from `main-menu`, mobile drawer with WhatsApp CTA, cart count, free-shipping pill |
| `footer` | footer group | `brand` / `menu` / `text` blocks, newsletter form, social links, payment icons, policy links |
| `cart-drawer` | every page (static) | Free-shipping progress bar, line discounts, bundle nudges, trust row |
| `hero` | index | Split or full-bleed, image or video, store rating sticker, `trust` blocks |
| `marquee` | index | Looping `item` / `rating` strip; static under reduced motion |
| `featured-collection` | index | Hand-picked `product_list` first, then a collection, then `shark-slippers` |
| `bundle-builder` | index, bundles page | The money section: `bundle` cards with live discount math, `#bundle-builder` anchor |
| `benefits` | index | Icon + title + text `benefit` blocks |
| `video-reels` | index | 9:16 reel scroller; hidden live until a reel has a video |
| `image-with-text` | index, pages | Image or video, badge, `stat` blocks (can read the store rating) |
| `offer-banner` | index, bundles page | Navy / coral / image band with sticker badge — the Cozy Set push and closing CTA |
| `testimonials` | index, product, bundles | Real reviews as `testimonial` blocks, store rating summary, `@app` blocks for Fera |
| `video-showcase` | index | One feature video with copy beside or over it; hidden live until a video is set |
| `faq` | index, product, bundles | Accordion `question` blocks + `payment_methods` block, FAQPage JSON-LD |
| `newsletter` | index | Shopify customer form (tag `newsletter`), optional WhatsApp button |
| `rich-text` | pages | Eyebrow / heading / text / two buttons |
| `product-spotlight` | any | A full `<product-form>` for one product, for landing pages |
| `collection-list` | any | `collection` blocks as image cards |
| `main-product` | product | Gallery, variant picker with size help, quantity tiers, trust, accordions, complementary product, sticky ATC |
| `complete-the-set` | optional | Standalone blanket cross-sell with its own quick form |
| `product-recommendations` | product | "You may also like" via the recommendations API |
| `main-collection`, `main-collection-banner` | collection | Banner, offer strip on `shark-slippers`, filters, sort, grid |
| `main-cart` | cart | Table layout of the drawer data with the same nudges |
| `main-contact` | contact page | Contact form, WhatsApp card, email block |
| `main-page`, `main-search`, `main-404`, `main-blog`, `main-article`, `main-list-collections`, `main-password` | respective templates | |

## Theme settings

Grouped in the editor as **Brand**, **Colors**, **Typography**, **Layout**, **Offers**,
**Product cards**, **Cart**, **Social** and **Search**. The **Offers** group is the one that
matters commercially:

| Setting | Default | What it drives |
| --- | --- | --- |
| `free_shipping_threshold` | `30` | Free-shipping bar in the drawer, product page note, hero/announcement pills. `0` disables the bar. |
| `free_shipping_text` | `Free standard shipping over {{ amount }} across Lebanon` | Header pill and menu drawer; `{{ amount }}` becomes `$30` |
| `bundle_tier_min` | `2` | Pairs needed before the tier discount shows |
| `bundle_tier_percent` | `20` | Percent shown on cards, tiers, bundle builder, cart nudges. `0` hides the offer |
| `set_discount_percent` | `25` | Blanket discount shown when slippers are in the cart. `0` hides the offer |
| `show_offer_badges` | on | "Buy 2, save 20%" chips |
| `store_rating` / `store_review_count` | `4.9` / `26` | The store-wide figure every section reads (hero, announcement bar, marquee, testimonials, stats) — edit it in one place |
| `low_stock_threshold` | `3` | "Only N left" from real inventory; `0` disables |
| `structured_data_rating` | off | Adds `aggregateRating` to Product JSON-LD — leave off while the Fera embed is active |

### How bundles, discounts and free standard shipping work

The theme never applies a discount itself. Three **automatic, combinable** discounts live in
Shopify admin and the theme settings above must mirror them:

1. **Slipper pairs 20%** — 20% off products in collection `shark-slippers`, minimum quantity 2.
   One Winter + one Originals qualifies because the discount targets the collection.
2. **Blanket 25% with slippers** — Buy X get Y: buy 1 from `shark-slippers`, get 1 from
   `shark-blankets` at 25% off, maximum one per order.
3. **Free standard shipping over $30** — free shipping, minimum purchase $30.00 after product
   discounts, Lebanon only, with "exclude shipping rates over $3.00" ticked so Express ($6) stays
   paid.

Every place the theme shows a price — the bundle builder, the product-page quantity tiers, the
cart nudges, the free-shipping bar — computes it per cart line exactly the way Shopify rounds:
`discount = round(line_price × percent / 100)`, line totals summed. Identical variants merge into
one line, so three pairs of the same variant come to $47.98 while three different variants come
to $47.97; both are correct and both match the cart. The tier percent applies to every
`shark-slippers` line once the **summed** slipper quantity reaches `bundle_tier_min`; the set
percent applies to one blanket unit when at least one pair is present; free standard shipping
unlocks when the post-discount total is `>=` the threshold.

If you change a discount in admin, change the matching theme setting too. If you add a product,
add it to `shark-slippers` or `shark-blankets` — collection membership is how Liquid classifies
lines (`item.product.collections | map: 'handle'`) and how `window.theme.slipperProductIds` /
`blanketProductIds` are built for JavaScript.

Copy rules that keep the storefront honest: it is always "free **standard** shipping" (Express is
never free), discounts are "applied automatically in your cart" (never "at checkout"), there is
no money-back guarantee or free returns — damaged or defective items are replaced within 7 days.

## Content conventions

| Product tag | Effect |
| --- | --- |
| `bestseller` | "Best seller" badge on cards |
| `new` | "New" badge |
| `preorder` | "Pre-order" badge and add-to-cart label |

Product metafields read by the theme (written by the Fera reviews app, namespace `reviews`):

| Metafield | Type | Used for |
| --- | --- | --- |
| `reviews.rating` | rating | Star rating (read only through `snippets/rating.liquid`) |
| `reviews.rating_count` | integer | Review count next to the stars |

Pages the theme links to: `winter-size-chart` (rendered inside the size-guide modal),
`bundles` (template `page.bundles`), `contact` (template `page.contact`). Menus: `main-menu`
(header and footer "Shop"), `footer` (footer "Help & policies").

## Adding videos

Video sections are hidden on the live store until they have a source, so the homepage ships with
empty reel and showcase slots that only appear in the editor.

1. Upload the clip in **Content → Files** (MP4, ideally under 20 MB; 9:16 for reels, 16:9 for the
   showcase) or use a YouTube / Vimeo link.
2. In the theme editor open **Video reels** and pick a reel block; set **Video**, or paste the
   YouTube/Vimeo link, or paste a direct MP4 URL. Add a poster image and, optionally, a featured
   product for the "Shop" chip.
3. For **Video showcase** or the **Hero**, set the video the same way. Shopify-hosted and MP4
   videos can autoplay muted; external videos load on tap behind a poster.
4. Save. The section becomes visible on the storefront as soon as one block has a video.

## Deploying

### With the Shopify CLI

1. `npm run check` and `npm run validate:json` — both must be clean.
2. `npm run push` — uploads to an unpublished theme and prints a preview link.
3. Review the preview on a real phone. Check the bundle builder, the product form, the cart
   drawer and the free-shipping bar with real quantities.
4. `npm run deploy` — publishes.

### From GitHub (zip)

1. On GitHub, **Code → Download ZIP** of the branch you want (or `npm run package` locally, which
   excludes `node_modules` and the tooling files).
2. In admin go to **Online Store → Themes → Add theme → Upload zip file**.
3. Preview the uploaded theme, then **Publish**. Alternatively connect the repository with the
   Shopify GitHub integration so every push to the connected branch updates the theme.

Merchant edits made in the admin (section settings, menus, content) live in
`config/settings_data.json` and the JSON templates. Run `npm run pull` before starting work so you
do not overwrite them. `config/settings_data.json` also carries the app-embed blocks (Fera
reviews); keep that `blocks` object under `current` when editing the file by hand.

## Browser support

Evergreen Chrome, Safari, Firefox and Edge, plus iOS Safari 15+. `color-mix()` and `:has()` are
used progressively with fallbacks.

## Accessibility

- One `h1` per page, semantic headings, labels for every input.
- Visible two-tone focus rings, never removed.
- Skip link to `#MainContent`; drawers and modals trap focus and restore it on close.
- Cart changes and variant swaps are announced through a live region.
- Contrast: AA for text (ink on sand/white/coral, sand on navy) and ≥3:1 for form borders,
  progress fills and focus rings.
- `prefers-reduced-motion` stops the marquee, reveal transitions and announcement rotation.

## License

MIT — see [LICENSE](LICENSE). Brand assets, product photography, logos and the Shark Bite /
SharkBite™ names are not covered by this license and remain the property of Shark Bite.
