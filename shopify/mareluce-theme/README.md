# Mareluce Shopify theme files

Source of the Mareluce storefront, built on Shopify's Horizon theme. Each file
maps to a theme path (dashes stand for directory separators):

- `templates-index.json` -> `templates/index.json` (homepage)
- `templates-product.json` -> `templates/product.json` (adds the shipping note under the buy buttons)
- `sections-header-group.json` -> `sections/header-group.json` (announcement bar, header)
- `sections-footer-group.json` -> `sections/footer-group.json`
- `config-settings_data.json` -> `config/settings_data.json` (palette, fonts, logo, cart drawer auto-open)
- `snippets-theme-drawer-header.liquid` -> `snippets/theme-drawer-header.liquid` (renders the free shipping bar in the cart drawer)
- `snippets-mareluce-shipping-bar.liquid` -> `snippets/mareluce-shipping-bar.liquid` (threshold constant, must match the free shipping rates)

`build.py` generates the JSON files; `strip.py` removes settings that equal the
Horizon schema defaults so the payloads stay small. Files are applied with the
Admin API `themeFilesUpsert` mutation on an unpublished copy of the theme, then
published from the Shopify admin.
