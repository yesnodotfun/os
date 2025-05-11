import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TextEditStoreState {
  /** The absolute path of the currently open file, or null if the document is untitled. */
  lastFilePath: string | null;
  /** Raw ProseMirror JSON content for crash-recovery / hand-off to other apps. */
  contentJson: any | null;
  /** Whether the in-memory document has edits that have not been saved to disk yet. */
  hasUnsavedChanges: boolean;
  // actions
  setLastFilePath: (path: string | null) => void;
  setContentJson: (json: any | null) => void;
  setHasUnsavedChanges: (val: boolean) => void;
  /** Clear the store back to its initial state. */
  reset: () => void;
  /** Apply an external update to the document (e.g. Chat GPT tool calls). */
  applyExternalUpdate: (json: any) => void;
  /**
   * Append (or prepend) a simple paragraph node containing plain text.
   * This helper is primarily used by AI tool calls so they can modify the
   * document without needing direct access to the TipTap editor instance.
   */
  insertText: (text: string, position?: "start" | "end") => void;
}

const CURRENT_TEXTEDIT_STORE_VERSION = 1;

export const useTextEditStore = create<TextEditStoreState>()(
  persist(
    (set) => ({
      lastFilePath: null,
      contentJson: null,
      hasUnsavedChanges: false,
      setLastFilePath: (path) => set({ lastFilePath: path }),
      setContentJson: (json) => set({ contentJson: json }),
      setHasUnsavedChanges: (val) => set({ hasUnsavedChanges: val }),
      /**
       * Append (or prepend) a simple paragraph node containing plain text.
       * This helper is primarily used by AI tool calls so they can modify the
       * document without needing direct access to the TipTap editor instance.
       */
      insertText: (text: string, position: "start" | "end" = "end") =>
        set((state) => {
          // Build a ProseMirror paragraph node for the text snippet
          const paragraphNode = {
            type: "paragraph",
            content: [{ type: "text", text }],
          } as any;

          let newDocJson: any;

          if (state.contentJson && Array.isArray(state.contentJson.content)) {
            // Shallow-clone the existing document JSON (preserve other metadata)
            const cloned = JSON.parse(JSON.stringify(state.contentJson));
            if (position === "start") {
              cloned.content.unshift(paragraphNode);
            } else {
              cloned.content.push(paragraphNode);
            }
            newDocJson = cloned;
          } else {
            // No existing doc – create a new one
            newDocJson = {
              type: "doc",
              content: [paragraphNode],
            };
          }

          return {
            contentJson: newDocJson,
            hasUnsavedChanges: true,
          } as Partial<TextEditStoreState>;
        }),
      reset: () =>
        set({ lastFilePath: null, contentJson: null, hasUnsavedChanges: false }),
      applyExternalUpdate: (json) =>
        set({
          contentJson: json,
          hasUnsavedChanges: true,
        }),
    }),
    {
      name: "ryos:textedit",
      version: CURRENT_TEXTEDIT_STORE_VERSION,
      migrate: (persistedState, version) => {
        // If no persisted state (first load) try to migrate from old APP_STORAGE_KEYS
        if (!persistedState || version < CURRENT_TEXTEDIT_STORE_VERSION) {
          try {
            // Dynamically import to avoid circular deps
            // eslint-disable-next-line @typescript-eslint/consistent-type-imports
            const { APP_STORAGE_KEYS } = require("@/utils/storage");
            const lastFilePath = localStorage.getItem(
              APP_STORAGE_KEYS.textedit.LAST_FILE_PATH
            );
            const rawJson = localStorage.getItem(
              APP_STORAGE_KEYS.textedit.CONTENT
            );
            const migratedState: TextEditStoreState = {
              lastFilePath: lastFilePath ?? null,
              contentJson: rawJson ? JSON.parse(rawJson) : null,
              hasUnsavedChanges: false,
              setLastFilePath: () => {},
              setContentJson: () => {},
              setHasUnsavedChanges: () => {},
              reset: () => {},
              applyExternalUpdate: () => {},
              insertText: () => {},
            };

            // Clean up old keys once migrated
            if (lastFilePath || rawJson) {
              localStorage.removeItem(APP_STORAGE_KEYS.textedit.LAST_FILE_PATH);
              localStorage.removeItem(APP_STORAGE_KEYS.textedit.CONTENT);
            }

            return migratedState;
          } catch (e) {
            console.warn("TextEditStore migration failed", e);
          }
        }
        return persistedState as TextEditStoreState;
      },
      partialize: (state) => ({
        lastFilePath: state.lastFilePath,
        contentJson: state.contentJson,
        hasUnsavedChanges: state.hasUnsavedChanges,
      }),
    }
  )
);