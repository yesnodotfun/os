import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";
import { useInternetExplorerStore } from "@/stores/useInternetExplorerStore";

interface FutureSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const FutureSettingsDialog = ({
  isOpen,
  onOpenChange,
}: FutureSettingsDialogProps) => {
  const [selectedYear, setSelectedYear] = useState<string>("2030");
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  
  // Use the store directly
  const { timelineSettings, setTimelineSettings } = useInternetExplorerStore();

  // Create future years array
  const futureYears = [
    "2030", "2040", "2050", "2060", "2080", "2100", "2150", "2200", "2300", "2500", "3000"
  ];

  // Get default timeline text for a year
  const getDefaultTimelineText = (year: string): string => {
    const yearNum = parseInt(year);
    if (yearNum >= 2500) return "2500-3000: Singularity complete. Transcendent intelligence. Reality-spanning minds. Physical constants manipulation. Alternative physics computation. Multiverse access. Novel-physics biospheres. Multi-dimensional life. Conscious planets. Stellar engineering. Galaxy-spanning network. Information-pattern existence.";
    if (yearNum >= 2300) return "2300-2500: Voluntary hive minds. Universal consciousness access. Reality architects. Pocket dimensions. Laws-of-physics engineering. Computational multiverse. Environment-free adaptation. Space-native humans. Dark matter biology. Controlled black holes. 50+ colonized systems. Galactic internet.";
    if (yearNum >= 2200) return "2200-2300: Fluid minds. Substrate migration. Multiform existence. Hyperspace cognition. Exotic computation. Dimensional engineering. Quantum reality manipulation. Multi-body consciousness. Distributed existence. Star lifting technology. Stable wormholes. Solar system teleportation.";
    if (yearNum >= 2150) return "2150-2200: Global mind collective. Substrate-independent consciousness. Multidimensional cognition. Vacuum computing. Reality programming. Physics manipulation interfaces. Continuous regeneration immortality. Zero-point standard. FTL communication. Wormhole experiments.";
    if (yearNum >= 2100) return "2100-2150: Networked consciousness. Post-human intelligence. Planetary cognition. Femtotech manipulation. Subatomic computing. Probability engineering. Human subspeciation. Space-adapted variants. Dyson swarm construction. Generation ships launched.";
    if (yearNum >= 2080) return "2080s-2100: Human-machine symbiosis norm. Uploaded minds. Group consciousness experiments. Reality synthesis indistinguishable. Femtotech prototypes. Quantum teleportation. Full genome rewriting. Optional bodies. Multiple-form existence. Bio immortality.";
    if (yearNum >= 2060) return "2060s-2070s: The Great Merge begins. Symbiont implants standard. Mind-machine interface. Quantum neural networks. Matter compilation. Molecular assembly. Aging classified treatable. 150-year lifespans. Optional synthetic organs. 95% renewable/fusion grid.";
    if (yearNum >= 2050) return "2050s: Digital consciousness transfers. Mind backups. Machine sentience rights. Bio-synthetic computation. Neural dust. Reality indistinguishable AR. Designer children. Genetic class divide. Aging deceleration widely available. Fusion dominant.";
    if (yearNum >= 2040) return "2040s: Emotional superintelligence. Synthetic therapists. Autonomous governance. Quantum supremacy. Molecular fabrication. Smart dust ubiquitous. Post-silicon computing. Self-organizing hardware. Tactile holograms. Life+20 treatments. Cancer obsolete. Bioprinted replacement bodies. Orbital solar.";
    if (yearNum >= 2030) return "2030s: Neural interfaces. Direct brain-computer link. Emotion-reading wearables. CRISPR 2.0. Printed organs. Alzheimer's cure. Neuralink v5. Fusion breakthrough.";
    return "2020s: Current era. AI assistants. Smart devices. Electric vehicles. Renewable energy. Space tourism. Digital transformation. Remote work. Virtual reality. Genetic medicine.";
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
  };

  const handleSave = () => {
    const newSettings = { ...timelineSettings, [selectedYear]: timelineSettings[selectedYear] || getDefaultTimelineText(selectedYear) };
    setTimelineSettings(newSettings);
    onOpenChange(false);
  };

  const handleReset = () => {
    const newSettings = { ...timelineSettings };
    delete newSettings[selectedYear]; // Remove custom text for this year
    setTimelineSettings(newSettings);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-system7-window-bg border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          saveButtonRef.current?.focus();
        }}
      >
        <DialogHeader>Edit Future Timeline</DialogHeader>
        <div className="p-4 px-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-geneva-12 text-[12px]">Year:</span>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {futureYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={timelineSettings[selectedYear] || getDefaultTimelineText(selectedYear)}
              onChange={(e) => {
                const newSettings = { ...timelineSettings, [selectedYear]: e.target.value };
                setTimelineSettings(newSettings);
              }}
              placeholder={getDefaultTimelineText(selectedYear)}
              className="min-h-[200px] font-geneva-12 text-[12px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="retro" onClick={handleReset}>
                Reset
              </Button>
              <Button variant="retro" onClick={() => onOpenChange(false)} ref={saveButtonRef}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FutureSettingsDialog; 