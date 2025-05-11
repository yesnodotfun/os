# Project To-dos

## Refactor storage.ts

Here are all the files that still reference `src/utils/storage.ts` (direct `import` / `require`).  All paths are shown from the project root and the imported symbols are noted so you can see what still needs to be migrated.

1. src/apps/ipod/components/IpodScreen.tsx  
   – `Track`

2. src/apps/finder/components/FinderAppComponent.tsx  
   – `calculateStorageSpace`

3. src/apps/finder/hooks/useFileSystem.ts  
   – `ensureIndexedDBInitialized`

4. src/apps/control-panels/components/ControlPanelsAppComponent.tsx  
   – `clearAllAppStates`, `ensureIndexedDBInitialized`

5. src/apps/pc/components/PcMenuBar.tsx  
   – `Game`, `loadGames`

6. src/apps/pc/components/PcAppComponent.tsx  
   – `Game`, `loadGames`

7. src/components/shared/HtmlPreview.tsx  
   – `loadHtmlPreviewSplit`, `saveHtmlPreviewSplit`

8. src/components/layout/WindowFrame.tsx  
   – `APP_STORAGE_KEYS`

9. src/hooks/useWindowManager.ts  
   – `APP_STORAGE_KEYS`  (relative path import `../utils/storage`)

10. src/stores/useAppStore.ts  
    – `ensureIndexedDBInitialized`

11. src/stores/usePaintStore.ts  
    – `APP_STORAGE_KEYS`  (migration helper only)

12. src/stores/usePhotoBoothStore.ts  
    – `APP_STORAGE_KEYS`  (migration helper only)

13. src/stores/useTextEditStore.ts  
    – `require("@/utils/storage").APP_STORAGE_KEYS`  (migration helper)

That’s the complete list—once these references are moved to the new store-specific helpers (or a small utility module just for IndexedDB / constants), `utils/storage.ts` can be deleted safely.
