# Project To-dos

## Refactor storage.ts

Here are all the files that still reference `src/utils/storage.ts` (direct `import` / `require`).  All paths are shown from the project root and the imported symbols are noted so you can see what still needs to be migrated.


7. src/components/shared/HtmlPreview.tsx  
   – `loadHtmlPreviewSplit`, `saveHtmlPreviewSplit`

That’s the complete list—once these references are moved to the new store-specific helpers (or a small utility module just for IndexedDB / constants), `utils/storage.ts` can be deleted safely.
