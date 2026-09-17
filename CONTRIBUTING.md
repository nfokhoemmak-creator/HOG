# Contributing

## Before you start

Run `npm run pull` first. Section settings, reviews and copy are edited in the
Shopify theme editor, and those edits live in `config/settings_data.json` and
the JSON templates. Pulling first means your branch doesn't quietly revert them.

## Working on a change

```bash
npm run dev -- --store xwxndg-q8.myshopify.com
```

Test against the real product with all three bundle variants. Check the
in-stock and sold-out states of each bundle, the cart drawer upsell, and the
sticky bars on a phone.

## Rules of the road

**Liquid**

- Two-space indent. `{%- -%}` to strip whitespace in loops and conditionals.
- No inline `<style>` blocks — extend `assets/base.css`.
- Every user-facing string goes through `{{ 'some.key' | t }}` and gets an entry
  in `locales/en.default.json`, unless it is merchant-editable section copy.
- Section schemas need `presets` if the section can be added on the homepage.
- Prefer `{% render %}` over `{% include %}`. Always.

**CSS**

- One stylesheet. Add to `assets/base.css`, keep the existing section order.
- Colours come from the tokens in `:root`. Never hard-code a hex.
- Motion uses transforms and opacity only, and must respect `prefers-reduced-motion`.

**JS**

- No dependencies, no bundler. Custom elements, `defer`, and progressive enhancement.

## Checks

```bash
npm run validate:json
npm run check
```

Both must pass before you push.
