import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MenuBar } from "@/components/layout/MenuBar";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { BoardList } from "@/components/soundboard/BoardList";
import { SoundGrid } from "@/components/soundboard/SoundGrid";
import { useSoundboard } from "@/hooks/useSoundboard";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { DialogState } from "@/types/types";
import { loadSelectedDeviceId, saveSelectedDeviceId } from "@/utils/storage";

interface ImportedSlot {
  audioData: string | null;
  emoji?: string;
  title?: string;
}

interface ImportedBoard {
  id?: string;
  name: string;
  slots: ImportedSlot[];
}

function App() {
  const {
    boards,
    activeBoard,
    activeBoardId,
    playbackStates,
    waveformRefs,
    setActiveBoardId,
    addNewBoard,
    updateBoardName,
    deleteCurrentBoard,
    updateSlot,
    deleteSlot,
    playSound,
    stopSound,
    setBoards,
  } = useSoundboard();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({
    type: null,
    isOpen: false,
    slotIndex: -1,
    value: "",
  });

  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] =
    useState(loadSelectedDeviceId);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleRecordingComplete = (base64Data: string) => {
    const activeSlot = activeSlotRef.current;
    if (activeSlot !== null) {
      updateSlot(activeSlot, { audioData: base64Data });
    }
  };

  const activeSlotRef = useRef<number | null>(null);

  const {
    micPermissionGranted,
    startRecording: startRec,
    stopRecording,
  } = useAudioRecorder({
    onRecordingComplete: handleRecordingComplete,
    selectedDeviceId,
  });

  const startRecording = (index: number) => {
    activeSlotRef.current = index;
    startRec();
  };

  useEffect(() => {
    if (micPermissionGranted) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const audioInputs = devices.filter(
          (device) => device.kind === "audioinput"
        );
        setAudioDevices(audioInputs);
        if (audioInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      });
    }
  }, [micPermissionGranted, selectedDeviceId]);

  useEffect(() => {
    saveSelectedDeviceId(selectedDeviceId);
  }, [selectedDeviceId]);

  const handleSlotClick = (index: number) => {
    const slot = activeBoard.slots[index];
    if (slot.audioData) {
      if (playbackStates[index].isPlaying) {
        stopSound(index);
      } else {
        playSound(index);
      }
    } else if (!playbackStates[index].isRecording) {
      startRecording(index);
    } else {
      stopRecording();
    }
  };

  const handleDialogSubmit = () => {
    if (!dialogState.type) return;
    updateSlot(dialogState.slotIndex, {
      [dialogState.type]: dialogState.value,
    });
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleImportBoard = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        const importedBoards = importedData.boards || [importedData];
        const newBoards = importedBoards.map((board: ImportedBoard) => ({
          ...board,
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          slots: board.slots.map((slot: ImportedSlot) => ({
            audioData: slot.audioData,
            emoji: slot.emoji,
            title: slot.title,
          })),
        }));
        setBoards([...boards, ...newBoards]);
        setActiveBoardId(newBoards[0].id);
      } catch (err) {
        console.error("Failed to import soundboards:", err);
      }
    };
    reader.readAsText(file);
  };

  const exportBoard = () => {
    const exportData = {
      boards: boards.map((board) => ({
        ...board,
        slots: board.slots.map((slot) => ({
          audioData: slot.audioData,
          emoji: slot.emoji,
          title: slot.title,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "soundboards.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reloadFromJson = async () => {
    try {
      const res = await fetch("/soundboards.json");
      const data = await res.json();
      const importedBoards = data.boards || [data];
      const newBoards = importedBoards.map((board: ImportedBoard) => ({
        ...board,
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        slots: board.slots.map((slot: ImportedSlot) => ({
          audioData: slot.audioData,
          emoji: slot.emoji,
          title: slot.title,
        })),
      }));
      setBoards(newBoards);
      setActiveBoardId(newBoards[0].id);
    } catch (err) {
      console.error("Failed to reload soundboards.json:", err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const index = e.keyCode >= 97 ? e.keyCode - 97 : e.keyCode - 49;
      if (
        (e.keyCode >= 97 && e.keyCode <= 105) ||
        (e.keyCode >= 49 && e.keyCode <= 57)
      ) {
        const slot = activeBoard.slots[index];
        if (slot.audioData) {
          if (playbackStates[index].isPlaying) {
            stopSound(index);
          } else {
            playSound(index);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeBoard.slots, playbackStates, playSound, stopSound]);

  return (
    <div className="min-h-screen bg-[#666699]">
      <MenuBar
        onNewBoard={addNewBoard}
        onImportBoard={() => importInputRef.current?.click()}
        onExportBoard={exportBoard}
        onReloadBoard={reloadFromJson}
        onRenameBoard={() => setIsEditingTitle(true)}
        onDeleteBoard={deleteCurrentBoard}
        canDeleteBoard={boards.length > 1}
        onShowHelp={() => setHelpDialogOpen(true)}
        onShowAbout={() => setAboutDialogOpen(true)}
      />

      <input
        type="file"
        ref={importInputRef}
        className="hidden"
        accept="application/json"
        onChange={handleImportBoard}
      />

      <WindowFrame title="Soundboard.app">
        <BoardList
          boards={boards}
          activeBoardId={activeBoardId}
          onBoardSelect={setActiveBoardId}
          onNewBoard={addNewBoard}
          selectedDeviceId={selectedDeviceId}
          onDeviceSelect={setSelectedDeviceId}
          audioDevices={audioDevices}
          micPermissionGranted={micPermissionGranted}
        />

        <SoundGrid
          board={activeBoard}
          playbackStates={playbackStates}
          waveformRefs={waveformRefs.current}
          isEditingTitle={isEditingTitle}
          onTitleChange={(name) => updateBoardName(name)}
          onTitleBlur={(name) => {
            updateBoardName(name);
            setIsEditingTitle(false);
          }}
          onTitleKeyDown={(e) => {
            if (e.key === "Enter") {
              updateBoardName(e.currentTarget.value);
              setIsEditingTitle(false);
            }
          }}
          onSlotClick={handleSlotClick}
          onSlotDelete={deleteSlot}
          onSlotEmojiClick={(index) =>
            setDialogState({
              type: "emoji",
              isOpen: true,
              slotIndex: index,
              value: activeBoard.slots[index].emoji || "",
            })
          }
          onSlotTitleClick={(index) =>
            setDialogState({
              type: "title",
              isOpen: true,
              slotIndex: index,
              value: activeBoard.slots[index].title || "",
            })
          }
        />
      </WindowFrame>

      <Dialog
        open={dialogState.isOpen}
        onOpenChange={(open) =>
          setDialogState((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="bg-system7-window-bg border-2 border-black rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {dialogState.type === "emoji" ? "Set Emoji" : "Set Title"}
            </DialogTitle>
            <DialogDescription>
              {dialogState.type === "emoji"
                ? "Enter an emoji for this sound slot"
                : "Enter a title for this sound slot"}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={dialogState.value}
            onChange={(e) =>
              setDialogState((prev) => ({ ...prev, value: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleDialogSubmit();
              }
            }}
            className="my-4"
          />
          <DialogFooter>
            <Button variant="retro" onClick={handleDialogSubmit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="bg-system7-window-bg border-2 border-black rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Getting Started
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Welcome to Soundboard.app! Here's how to use it:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Click any empty slot to start recording a sound</li>
              <li>Click again to stop recording</li>
              <li>Click a recorded slot to play the sound</li>
              <li>Press number keys 1-9 to quickly play sounds</li>
              <li>
                Add emojis and titles to your sounds by clicking the respective
                icons
              </li>
              <li>
                Create multiple soundboards using the + button in the sidebar
              </li>
              <li>Import and export your soundboards using the File menu</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="bg-system7-window-bg border-2 border-black rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              About Soundboard.app
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Version 0.10</p>
            <p>
              Created by{" "}
              <a
                href="https://ryo.lu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Ryo Lu
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
