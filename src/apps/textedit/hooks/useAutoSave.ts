import { useEffect, useRef } from "react";
import { useFileSystem } from "@/apps/finder/hooks/useFileSystem";
import { htmlToMarkdown } from "@/utils/markdown";

interface UseAutoSaveProps {
  hasUnsavedChanges: boolean;
  currentFilePath: string | null;
  editor: any; // TipTap Editor
  instanceId?: string;
  onSaveSuccess: () => void;
  debounceMs?: number;
}

export function useAutoSave({
  hasUnsavedChanges,
  currentFilePath,
  editor,
  instanceId,
  onSaveSuccess,
  debounceMs = 1500,
}: UseAutoSaveProps) {
  const { saveFile } = useFileSystem("/Documents");
  const editorContentRef = useRef<string>(""); // Ref to store latest markdown content for debounced save

  // Update the content ref whenever editor content changes
  useEffect(() => {
    if (editor && hasUnsavedChanges) {
      editorContentRef.current = htmlToMarkdown(editor.getHTML());
    }
  }, [editor, hasUnsavedChanges]);

  // Debounced Autosave Effect
  useEffect(() => {
    // Only run if there are changes and a file path exists
    if (hasUnsavedChanges && currentFilePath) {
      console.log(
        "[TextEdit] Changes detected, scheduling autosave for:",
        currentFilePath,
        "Instance ID:",
        instanceId
      );
      
      const handler = setTimeout(async () => {
        console.log("[TextEdit] Autosaving:", currentFilePath);
        const fileName = currentFilePath.split("/").pop() || "Untitled";
        
        try {
          await saveFile({
            name: fileName,
            path: currentFilePath,
            content: editorContentRef.current, // Save the latest markdown content from ref
          });
          
          onSaveSuccess(); // Mark as saved after successful save
          console.log("[TextEdit] Autosave successful:", currentFilePath);
        } catch (error) {
          console.error("[TextEdit] Autosave failed:", error);
          // Optionally notify user or leave hasUnsavedChanges true
        }
      }, debounceMs); // Autosave after specified debounce time

      // Cleanup function to clear timeout if changes occur before saving
      return () => {
        console.log(
          "[TextEdit] Keystroke detected, clearing autosave timeout."
        );
        clearTimeout(handler);
      };
    } else if (hasUnsavedChanges && !currentFilePath) {
      console.log(
        "[TextEdit] Has unsaved changes but no file path - autosave skipped. Instance ID:",
        instanceId
      );
    }
  }, [
    hasUnsavedChanges,
    currentFilePath,
    saveFile,
    onSaveSuccess,
    instanceId,
    debounceMs,
  ]); // Dependencies: trigger on change flag or path change

  return {
    editorContentRef,
  };
}