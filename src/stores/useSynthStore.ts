import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { loadSynthPresets, loadSynthCurrentPreset, loadSynthLabelType, saveSynthPresets, saveSynthCurrentPreset, saveSynthLabelType, SynthPreset } from "@/utils/storage";

export type NoteLabelType = "note" | "key" | "off";

interface SynthStoreState {
  presets: SynthPreset[];
  currentPreset: SynthPreset | null;
  labelType: NoteLabelType;
  setPresets: (presets: SynthPreset[]) => void;
  setCurrentPreset: (preset: SynthPreset) => void;
  setLabelType: (type: NoteLabelType) => void;
  reset: () => void;
}

const STORE_VERSION = 1;
const STORE_NAME = "ryos:synth";

export const useSynthStore = create<SynthStoreState>()(
  persist(
    (set) => ({
      presets: loadSynthPresets(),
      currentPreset: loadSynthCurrentPreset(),
      labelType: loadSynthLabelType(),
      setPresets: (presets) => {
        set({ presets });
        saveSynthPresets(presets);
      },
      setCurrentPreset: (preset) => {
        set({ currentPreset: preset });
        saveSynthCurrentPreset(preset);
      },
      setLabelType: (type) => {
        set({ labelType: type });
        saveSynthLabelType(type);
      },
      reset: () => {
        set({ presets: [], currentPreset: null, labelType: "off" });
      },
    }),
    {
      name: STORE_NAME,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        presets: state.presets,
        currentPreset: state.currentPreset,
        labelType: state.labelType,
      }),
    }
  )
); 