# Contributing

## Before you start

Run `npm run pull` first. Merchants edit section settings, menus and content in
the Shopify admin, and those edits live in `config/settings_data.json` and the
JSON templates. Pulling first means your branch doesn't quietly revert them.

## Branches

```
main         always deployable, mirrors the live theme
feat/<name>  new sections, new features
fix/<name>   bug fixes
chore/<name> tooling, docs, dependencies
```

## Working on a change

```bash
npm run dev -- --store houseofgarments.myshopify.com
```

Test every change against a real store with real products. The catalog is small
and mostly limited runs, so check both the in-stock and sold-out states.

## Rules of the road

**Liquid**

- Two-space indent. `{%- -%}` to strip whitespace in loops and conditionals.
- No inline `<style>` blocks — extend `assets/base.css`.
- Every user-facing string goes through `{{ 'some.key' | t }}` and gets an entry
  in `locales/en.default.json`. No hard-coded English in Liquid.
- Section schemas need `presets` if the section can be added on the homepage.
- Prefer `{% render %}` over `{% include %}`. Always.

**CSS**

- One stylesheet. Add to `assets/base.css`, keep the existing section order.
- Use the custom properties in `:root`. Don't introduce a new raw hex value
  unless you also add it as a theme setting.
- Mobile-first. Breakpoints: `750px`, `990px`, `1200px`.

**JavaScript**

- No dependencies, no build step, no jQuery.
- New behaviour becomes a custom element in the relevant file, registered with
  `customElements.define`.
- Everything must degrade: if the script fails to load, the page still works.
- Never block rendering. Scripts are `defer`.

**Accessibility**

- Keyboard path for every mouse path.
- Focus is visible and never `outline: none` without a replacement.
- Drawers trap focus and restore it to the trigger on close.
- Announce async changes (cart adds, variant swaps) via the live regions
  already present in `snippets/cart-drawer.liquid` and `sections/main-product.liquid`.

## Before opening a PR

```bash
npm run check          # Theme Check must be clean
npm run validate:json  # every JSON file parses
```

Then, by hand:

- [ ] Homepage, product, collection, cart, search, 404 all render.
- [ ] Add to cart works from a product page and from a card.
- [ ] Cart drawer opens, updates quantity, removes a line, and closes.
- [ ] Variant picker updates price, availability and media.
- [ ] Sold-out and pre-order products show the right button state.
- [ ] Mobile nav opens and closes; page doesn't scroll behind it.
- [ ] Any new section appears in the theme editor with sensible defaults.

Include a screenshot or short screen recording of the change in the PR body.

## Adding a section

1. Create `sections/my-section.liquid`.
2. Give it a `{% schema %}` with `name`, `settings`, `blocks` (if any), and a
   `presets` entry so it can be added from the editor.
3. Add its labels to `locales/en.default.schema.json`.
4. Add its styles to `assets/base.css` under a `/* my-section */` heading.
5. If it belongs on the homepage by default, add it to `templates/index.json`.

## Deploying

Only `main` gets published, and only via `npm run deploy` after a preview review.
CI runs checks but never deploys.
