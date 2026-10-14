# Jamalati — Shopify Theme

Custom Online Store 2.0 theme for **[jamalati.com](https://jamalati.com)** — a
clean-beauty cosmetics brand shipping all over Lebanon.

> *Beauty that feels like you.*

Built from scratch: no Dawn fork, no vendor bundles. Plain Liquid, one
stylesheet, three small vanilla-JS modules. The homepage and product page are
laid out as a conversion funnel: hero with social proof → trust bar →
bestsellers → benefits → before/after → reviews → offer → categories → story →
UGC → FAQ → email capture.

---

## Install in 2 minutes

1. Download **`jamalati-theme.zip`** from this repo (or run `npm run zip`).
2. Shopify admin → **Online Store → Themes → Add theme → Upload zip file**.
3. Click **Customize** on the new theme. The logo, colors, fonts and all
   homepage sections are already set — you only need to:
   - pick a collection for the **Bestsellers** section and the four
     **Find your routine** category tiles,
   - drop in a hero image and two before/after photos,
   - add your WhatsApp number under **Theme settings → Social**,
   - create the `WELCOME10` discount (Discounts → Create) and a free-shipping
     rate over $50 (Settings → Shipping) so the announcement bar and cart
     progress bar are telling the truth.
4. Preview on your phone, then **Publish**.

## Requirements (for development only)

| Tool | Version |
| --- | --- |
| [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) | `>= 3.60` |
| Node.js | `>= 18` |

```bash
npm install
npm run dev -- --store jamalati.myshopify.com   # live preview with hot reload
npm run check                                   # Theme Check (Liquid lint)
npm run validate:json                           # every JSON + section schema parses
npm run zip                                     # build jamalati-theme.zip
```

`npm run push` never targets the live theme. Publishing is a deliberate,
separate step.

## Repository layout

```
assets/           base.css (single stylesheet), theme.js, cart-drawer.js, product-form.js,
                  jamalati-logo.png (transparent), jamalati-favicon.png, jamalati-share.jpg
config/           settings_schema.json (what merchants can edit) + settings_data.json (current values)
layout/           theme.liquid wraps every page. password.liquid wraps the pre-launch gate.
locales/          en.default.json (storefront strings) + en.default.schema.json (editor labels)
sections/         Every section. `main-*` sections are the body of a given template.
snippets/         product-card, price, stars, icon, meta-tags, pagination, social-links
templates/        JSON templates that compose sections.
scripts/          validate-json.mjs, package-zip.mjs
```

## Conversion features

| Where | What | Setting |
| --- | --- | --- |
| Announcement bar | Rotating offers (free shipping, welcome code, COD) | Header group |
| Hero | Split layout, pink highlight word, star rating + "10,000+ customers", perk checklist, floating trust pills | Hero section |
| Trust bar | 4 icon promises under the hero and above the footer | Trust bar section |
| Product cards | Bestseller / New / Sale badges, star rating, "Save X%", quick add | Theme settings → Product cards |
| Before / after | Draggable image comparison with result stats | Before / after section |
| Testimonials | Star reviews with verified badge + rating summary pill | Testimonials section |
| Promo banner | Gradient offer card with optional countdown and discount code | Promo banner section |
| FAQ | Accordion with FAQ structured data for Google | FAQ section |
| Newsletter | "Get 10% off" email capture (tags subscribers `newsletter`) | Newsletter section + footer |
| Product page | Rating under title, benefit checklist, stock urgency, trust icons, guarantee box, ingredients / how-to-use accordions, WhatsApp share | Product template blocks |
| Sticky add-to-cart | Bottom bar appears when the main button scrolls away | Product section settings |
| Cart drawer | Free-shipping progress bar, "complete your routine" upsell, lock icon on checkout | Theme settings → Cart |
| WhatsApp | Floating chat button | Theme settings → Social |

## Design system

Everything is driven by CSS custom properties emitted from theme settings in
`layout/theme.liquid`.

```
--color-bg          #fff7f4   soft cream canvas
--color-bg-alt      #feece9   logo cream, alternate sections
--color-surface     #ffffff   cards and inputs
--color-fg          #2e1622   plum text
--color-muted       #8b6874   secondary text
--color-accent      #f0437f   brand pink (buttons, badges, highlights)
--color-star        #f5a623   review stars
--font-heading      Quicksand Bold (rounded, matches the logo)
--font-body         Nunito Sans
--radius            18px      cards; buttons are pills
```

The logo in `assets/jamalati-logo.png` is used automatically wherever no logo
is uploaded in theme settings (header, mobile menu, footer, password page,
hero placeholder, Organization structured data).

## Content conventions

Product **tags** the theme reads:

| Tag | Effect |
| --- | --- |
| `bestseller` | Pink "Bestseller" badge on cards and the product page |
| `new` | "New" badge |
| `limited` | "Limited" badge |
| `preorder` | "Pre-order" badge; add-to-cart label changes |

Product **metafields** (namespace `custom` unless noted, all optional):

| Metafield | Type | Used for |
| --- | --- | --- |
| `reviews.rating` / `reviews.rating_count` | rating / integer | Stars on cards and product page (filled by Judge.me, Loox, Shopify Reviews…) |
| `custom.benefits` | multi-line text | Benefit checklist under the price (one per line) |
| `custom.ingredients` | rich text | Ingredients accordion |
| `custom.how_to_use` | rich text | How to use accordion |

## Accessibility

- Visible focus rings, never removed.
- Skip link to `#MainContent`.
- Drawers trap focus and restore it on close.
- The before/after slider is a real `<input type="range">`.
- Brand pink on white meets WCAG AA for large/bold text; body text is plum on cream (15:1).

## License

MIT — see [LICENSE](LICENSE). Brand assets, product photography, the logo and
the Jamalati name are not covered by this license and remain the property of
Jamalati.
