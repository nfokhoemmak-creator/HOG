# Mareluce theme (Shopify, Horizon based)

Files applied to the unpublished "Mareluce" theme (gid://shopify/OnlineStoreTheme/205666582865)
on cq5c0n-n2.myshopify.com. The theme is a duplicate of Shopify's Horizon with these four
files replaced through the Admin API (themeFilesUpsert):

- `templates-index.json`  -> `templates/index.json` (homepage)
- `sections-header-group.json` -> `sections/header-group.json`
- `sections-footer-group.json` -> `sections/footer-group.json`
- `config-settings_data.json` -> `config/settings_data.json`

`build.py` generates the verbose versions; the committed copies are the trimmed ones that
passed Shopify's setting validation (hero padding capped at 100, icon width minimum 12,
footer logo height on the range step).

Assets referenced live in the store's Files: mareluce-logo-ink.png, mareluce-logo-cream.png,
mareluce-monogram.png, mareluce-hero-juliette.mp4, mareluce-film-juliette.mp4,
mareluce-film-nova.mp4 and the three poster PNGs.
