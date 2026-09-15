# Contributing

## Before you start

Run `npm run pull` first. Merchants edit section settings, menus and content in the Shopify admin,
and those edits live in `config/settings_data.json` and the JSON templates. Pulling first means your
branch does not quietly revert them. Never drop the `blocks` object under `current` in
`config/settings_data.json` — it holds the app embeds (Fera reviews).

## Branches

```
main         always deployable, mirrors the live theme
feat/<name>  new sections, new features
fix/<name>   bug fixes
chore/<name> tooling, docs, dependencies
```

## Working on a change

```bash
npm run dev -- --store 9d81da.myshopify.com
```

Test against the real catalogue: two slipper products with Size and Style options (in a
different order on each product), one blanket with four sizes, and inventory that sits at small
numbers. Check both the in-stock and sold-out option states.

## Rules of the road

**Copy**

- It is always "free **standard** shipping" — Express ($6) is never free.
- Discounts are "applied automatically in your cart", never "at checkout".
- No refunds or free returns exist. The true promise is "damaged or defective items are replaced
  within 7 days". Never write "money-back guarantee".
- Delivery is dispatch in 3–5 business days plus courier time (standard 3–5 days, express
  1–2 days). Never quote a door-to-door "1–5 days".
- Allowed material claims: plush/fuzzy lining (Winter), lightweight EVA (Originals),
  cotton/polyester (Blanket). Never "rubber", "non-slip", "fleece", care instructions or insole
  lengths.
- No fake urgency: no countdowns, no invented stock counters. "Only N left" comes from real
  inventory under `low_stock_threshold`.
- Never hard-code a discounted total or a rating. Prices are computed per cart line
  (`round(line × percent / 100)`); the rating comes from `settings.store_rating` /
  `settings.store_review_count` or the `rating` snippet.

**Liquid**

- Two-space indent. `{%- -%}` to strip whitespace in loops and conditionals.
- Every non-editable user-facing string goes through `{{ 'some.key' | t }}` with an entry in
  `locales/en.default.json`. Merchant-editable copy is a setting with a default.
- Schema labels are plain English (no `t:` keys). Section `name` stays at 25 characters or fewer.
- Every homepage-addable section has a `presets` entry; `main-*`, `header`, `footer`,
  `announcement-bar`, `cart-drawer` and `product-recommendations` use `enabled_on` instead.
- Resource settings (`product`, `collection`, `image_picker`, `video`, `product_list`) have no
  `default` — set values in the JSON templates and give the section a Liquid fallback
  (`collections['shark-slippers'].products[0]` and so on).
- Range settings declare `step`, with `(max − min) / step ≤ 101` and defaults on the step grid.
- Every `<img>` and `image_tag` carries `width` and `height`.
- Product ratings are read only through `{% render 'rating', product: product %}`; product cards
  only through `{% render 'product-card', card_product: product %}`.
- Prefer `{% render %}` over `{% include %}`. Always.

**CSS**

- Tokens and primitives live in `assets/base.css`; a section's own rules live in
  `assets/section-<name>.css`, loaded from that section with `stylesheet_tag`.
- Use the custom properties in `:root`. Do not introduce a raw hex value unless you also add it
  as a theme setting.
- Coral (`--color-accent`) is the primary button background only — never text, badge fills or
  progress bars. Form control borders use `--color-border-strong`.
- Mobile-first. Breakpoints: `750px`, `990px`, `1200px`. Tap targets never go below 44px.
- Respect `prefers-reduced-motion` for anything that moves on its own.

**JavaScript**

- No dependencies, no build step, no jQuery.
- New behaviour becomes a custom element, registered with `customElements.define`, in the
  relevant shared file or in `assets/section-<name>.js` loaded with `defer` from that section.
- Use `window.SB` (`SB.addToCart`, `SB.formatMoney`, `SB.announce`, …) and `window.theme`
  (strings, routes, thresholds, product ids). Guard for `SB` being absent and fall back to a
  native form post.
- Classify cart lines by `window.theme.slipperProductIds` / `blanketProductIds` and sum
  `item.quantity`; never count lines.
- Everything must degrade: if the script fails to load, the page still works.
- Never block rendering. Scripts are `defer`.

**Accessibility**

- Keyboard path for every mouse path.
- Focus is visible; no `outline: none` without a replacement.
- Drawers and modals trap focus and restore it to the trigger on close.
- Announce async changes (cart adds, variant swaps) with `SB.announce`.

## Before opening a PR

```bash
npm run check          # Theme Check must report zero errors and zero warnings
npm run validate:json  # every JSON file and every {% schema %} block parses
```

Then, by hand:

- [ ] Homepage, product (slippers and blanket), collection, bundles page, cart, search and 404 render.
- [ ] Add to cart works from a product page, from a card and from the bundle builder.
- [ ] Two pairs in the cart show the tier discount and unlock the free-shipping bar; the numbers
      match what Shopify shows in the cart.
- [ ] Cart drawer opens, updates quantity, removes a line, and closes.
- [ ] Variant picker updates price, availability, media and the sticky add-to-cart bar.
- [ ] Sold-out option values are marked; the size helper and size guide open.
- [ ] Mobile nav opens and closes; the page does not scroll behind it; the WhatsApp button never
      covers the sticky add-to-cart bar.
- [ ] Any new section appears in the theme editor with sensible defaults.

Include a screenshot or short screen recording of the change in the PR body.

## Adding a section

1. Create `sections/my-section.liquid` with `"tag": "section"`, a `color_scheme` select
   (`default | alt | brand`) and `padding_top` / `padding_bottom` ranges (0–120, step 4).
2. Give the `{% schema %}` a `name`, `settings`, `blocks` (if any) and a `presets` entry so it can
   be added from the editor. Plain-English labels, sensible defaults.
3. Put its styles in `assets/section-my-section.css` and load them from the section.
4. If it belongs on the homepage by default, add it to `templates/index.json`; if it belongs on
   the bundles or product pages, add it to `templates/page.bundles.json` or `templates/product.json`.
5. Add a row to the section catalogue in `README.md`.

## Deploying

Only `main` gets published, and only via `npm run deploy` (or by publishing an uploaded zip in
admin) after a preview review on a real phone.
