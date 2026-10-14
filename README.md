# Jamalati — Shopify Theme

Custom Online Store 2.0 theme for **[jamalati.com](https://jamalati.com)** — a
lip plumper brand shipping all over Lebanon for a flat $4.

> *Fuller lips. No needles.*

Built from scratch: no Dawn fork, no vendor bundles. Plain Liquid, one
stylesheet, three small vanilla-JS modules. The homepage is a single-product
funnel: hero with the product and social proof → trust bar ($4 shipping, cash
on delivery) → the five flavors with one-tap add to bag → how it works →
benefits → before/after → reviews → comparison vs filler → mix & match offer →
story → gallery → FAQ → email capture.

---

## Install in 2 minutes

1. Download **`jamalati-theme.zip`** from this repo (or run `npm run zip`).
2. Shopify admin → **Online Store → Themes → Add theme → Upload zip file**.
3. Click **Customize** on the new theme. The logo, colors, fonts, menus,
   the **Lip Plumpers** collection and all homepage sections are already
   wired up — you only need to:
   - drop in two before/after photos (Before / after section),
   - add your WhatsApp number under **Theme settings → Social**,
   - create the `WELCOME10` discount and the “buy 2, get the 3rd free”
     automatic discount (Discounts → Create), or edit those two messages,
   - replace the sample reviews with real ones.
4. Preview on your phone, then **Publish**.

The $4 flat rate is read from **Theme settings → Cart → Flat shipping rate**
and must match the Lebanon rate in **Settings → Shipping** (it does today).

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
| Announcement bar | Rotating messages ($4 shipping, cash on delivery, welcome code) | Header group |
| Hero | Featured product image + price in the button, highlight word, rating row, perk checklist, floating pills | Hero section |
| Trust bar | 4 icon promises under the hero and above the footer | Trust bar section |
| Flavor grid | All five plumpers with an always-visible “Add to bag” button | Featured collection + Theme settings → Product cards |
| How it works | 3 numbered steps | How it works section |
| Comparison | Jamalati vs lip filler vs regular gloss, check/cross cells | Comparison table section |
| Product cards | Bestseller / New / Sale badges, star rating, "Save X%", quick add | Theme settings → Product cards |
| Before / after | Draggable image comparison with result stats | Before / after section |
| Testimonials | Star reviews with verified badge + rating summary pill | Testimonials section |
| Promo banner | Gradient offer card with optional countdown and discount code | Promo banner section |
| FAQ | Accordion with FAQ structured data for Google | FAQ section |
| Newsletter | "Get 10% off" email capture (tags subscribers `newsletter`) | Newsletter section + footer |
| Product page | Rating, “+ $4 shipping · cash on delivery” under the price, benefit checklist, **flavor switcher** across the five products, stock urgency, trust icons, guarantee box, how-to-use / ingredients accordions, WhatsApp share | Product template blocks |
| Sticky add-to-cart | Bottom bar appears when the main button scrolls away | Product section settings |
| Cart drawer | Subtotal + $4 flat shipping + estimated total (no checkout surprises), “add another flavor” upsell, optional free-shipping progress bar | Theme settings → Cart |
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

Flavors are separate products. Put them all in one collection (today:
`lip-plumpers`) and the product page's **Flavor switcher** block links between
them, stripping the text “LipPlumper” from the names.

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
