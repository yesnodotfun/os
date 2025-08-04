import { useCallback, useEffect } from "react";
import { JSONContent } from "@tiptap/core";
import { useTextEditStore } from "@/stores/useTextEditStore";

interface UseTextEditStateProps {
  instanceId?: string;
}

export function useTextEditState({ instanceId }: UseTextEditStateProps) {
  // Store actions
  const createTextEditInstance = useTextEditStore(
    (state) => state.createInstance
  );
  const removeTextEditInstance = useTextEditStore(
    (state) => state.removeInstance
  );
  const updateTextEditInstance = useTextEditStore(
    (state) => state.updateInstance
  );
  const textEditInstances = useTextEditStore((state) => state.instances);

  // Legacy store methods for single-window mode
  const legacySetFilePath = useTextEditStore((state) => state.setLastFilePath);
  const legacySetContentJson = useTextEditStore(
    (state) => state.setContentJson
  );
  const legacySetHasUnsavedChanges = useTextEditStore(
    (state) => state.setHasUnsavedChanges
  );
  const legacyFilePath = useTextEditStore((state) => state.lastFilePath);
  const legacyContentJson = useTextEditStore((state) => state.contentJson);
  const legacyHasUnsavedChanges = useTextEditStore(
    (state) => state.hasUnsavedChanges
  );

  // Create instance when component mounts (only if using instanceId)
  useEffect(() => {
    if (instanceId) {
      createTextEditInstance(instanceId);
    }
  }, [instanceId, createTextEditInstance]);

  // Clean up instance when component unmounts (only if using instanceId)
  useEffect(() => {
    if (!instanceId) return;

    return () => {
      removeTextEditInstance(instanceId);
    };
  }, [instanceId, removeTextEditInstance]);

  // Get current instance data (only if using instanceId)
  const currentInstance = instanceId ? textEditInstances[instanceId] : null;

  // Use instance data if available, otherwise use legacy store
  const currentFilePath = instanceId
    ? currentInstance?.filePath || null
    : legacyFilePath;

  const contentJson = instanceId
    ? currentInstance?.contentJson || null
    : legacyContentJson;

  const hasUnsavedChanges = instanceId
    ? currentInstance?.hasUnsavedChanges || false
    : legacyHasUnsavedChanges;

  const setCurrentFilePath = useCallback(
    (path: string | null) => {
      if (instanceId) {
        // Always use instance-specific method for instances
        updateTextEditInstance(instanceId, { filePath: path });
      } else {
        // Only use legacy method for non-instance mode
        legacySetFilePath(path);
      }
    },
    [instanceId, updateTextEditInstance, legacySetFilePath]
  );

  const setContentJson = useCallback(
    (json: JSONContent | null) => {
      if (instanceId) {
        // Always use instance-specific method for instances
        updateTextEditInstance(instanceId, { contentJson: json });
      } else {
        // Only use legacy method for non-instance mode
        legacySetContentJson(json);
      }
    },
    [instanceId, updateTextEditInstance, legacySetContentJson]
  );

  const setHasUnsavedChanges = useCallback(
    (val: boolean) => {
      if (instanceId) {
        // Always use instance-specific method for instances
        updateTextEditInstance(instanceId, { hasUnsavedChanges: val });
      } else {
        // Only use legacy method for non-instance mode
        legacySetHasUnsavedChanges(val);
      }
    },
    [instanceId, updateTextEditInstance, legacySetHasUnsavedChanges]
  );

  return {
    // Current state
    currentFilePath,
    contentJson,
    hasUnsavedChanges,
    currentInstance,
    
    // State setters
    setCurrentFilePath,
    setContentJson,
    setHasUnsavedChanges,
    
    // Instance management
    instanceId,
    
    // Legacy state (for backwards compatibility)
    legacyFilePath,
    legacyContentJson,
    legacyHasUnsavedChanges,
  };
}