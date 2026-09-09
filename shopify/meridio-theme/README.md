# Meridio Shopify theme files

Source of the Meridio storefront, built on Shopify's Horizon theme. Each file
maps to a theme path (dashes stand for directory separators):

- `templates-index.json` -> `templates/index.json` (homepage; product cards carry a `review` star block)
- `templates-product.json` -> `templates/product.json` (star rating block under the title, shipping note under the buy buttons)
- `sections-header-group.json` -> `sections/header-group.json` (announcement bar, header)
- `sections-footer-group.json` -> `sections/footer-group.json`
- `config-settings_data.json` -> `config/settings_data.json` (palette, fonts, logo, cart drawer auto-open)
- `snippets-theme-drawer-header.liquid` -> `snippets/theme-drawer-header.liquid` (renders the free shipping bar in the cart drawer)
- `snippets-mareluce-shipping-bar.liquid` -> `snippets/mareluce-shipping-bar.liquid` (threshold constant, must match the free shipping rates)

`build.py` generates the JSON files; `strip.py` removes settings that equal the
Horizon schema defaults so the payloads stay small. Files are applied with the
Admin API `themeFilesUpsert` mutation on an unpublished copy of the theme, then
published from the Shopify admin.

The `review` blocks read `product.metafields.reviews.rating` and
`reviews.rating_count`, which only a reviews app writes. They render nothing
until such an app is installed; no ratings are hard-coded.

The homepage "Shop by collection" grid lists the `men` collection first. That
collection is automated in Shopify: any product tagged `Men` appears in it, so
new men's products only need the tag.
