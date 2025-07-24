Add macosx-specific icon overrides (PNG or SVG) into this folder.

File naming must match logical icon names used in code, e.g.:
- directory.png
- file.png
- file-text.png
- image.png
- trash-empty.png
- trash-full.png
- documents.png
- sounds.png

Any icon missing here will fall back automatically to the default theme via pickIconPath().

After adding or removing icons:
1. Update THEME_DIRS in scripts/generate-icon-manifest.ts to include "macosx" if not already.
2. Run: bun scripts/generate-icon-manifest.ts
3. Reload the app; ThemedIcon will resolve new macosx variants.

