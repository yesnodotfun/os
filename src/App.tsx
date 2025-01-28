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
    setPlaybackStates,
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
    setRecordingState: (isRecording) => {
      if (activeSlotRef.current !== null) {
        const newPlaybackStates = [...playbackStates];
        newPlaybackStates[activeSlotRef.current] = {
          ...newPlaybackStates[activeSlotRef.current],
          isRecording,
        };
        setPlaybackStates(newPlaybackStates);
      }
    },
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

        const defaultDevice = audioInputs.find(
          (d) => d.deviceId === "default" || d.deviceId === selectedDeviceId
        );
        if (defaultDevice) {
          setSelectedDeviceId(defaultDevice.deviceId);
        }
      });
    }
  }, [micPermissionGranted, selectedDeviceId]);

  useEffect(() => {
    saveSelectedDeviceId(selectedDeviceId);
  }, [selectedDeviceId]);

  const handleSlotClick = (index: number) => {
    const slot = activeBoard.slots[index];

    if (playbackStates[index].isRecording) {
      stopRecording();
    } else if (slot.audioData) {
      if (playbackStates[index].isPlaying) {
        stopSound(index);
      } else {
        playSound(index);
      }
    } else {
      startRecording(index);
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
          setIsEditingTitle={setIsEditingTitle}
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
                ? "Choose an emoji for this sound slot"
                : "Enter a title for this sound slot"}
            </DialogDescription>
          </DialogHeader>
          {dialogState.type === "emoji" ? (
            <div className="grid grid-cols-10 gap-1 my-4 max-h-[300px] overflow-y-auto">
              {[
                // Popular & Audio Related
                "🎵",
                "🎶",
                "🎤",
                "🎧",
                "🎼",
                "🔊",
                "🔉",
                "🔈",
                "🎙",
                "📢",
                "🎸",
                "🎹",
                "🎺",
                "🎷",
                "🥁",
                "🎚",
                "🎛",
                "🔔",
                "📣",
                "🔕",

                // Common Symbols & Actions
                "✅",
                "❌",
                "⭐",
                "💫",
                "✨",
                "🔥",
                "💥",
                "💢",
                "💡",
                "💭",
                "❤️",
                "💀",
                "☠️",
                "⚡",
                "💪",
                "👍",
                "👎",
                "👏",
                "🙌",
                "👋",
                "💩",
                "🎉",
                "🎊",
                "🌸",
                "🌺",
                "🌷",

                // Arrows & Movement
                "⬆️",
                "⬇️",
                "⬅️",
                "➡️",
                "↗️",
                "↘️",
                "↙️",
                "↖️",
                "↕️",
                "↔️",
                "🏃",
                "🏃‍♀️",
                "💃",
                "🕺",
                "🚶",
                "🚶‍♀️",

                // Common Faces
                "😀",
                "😄",
                "😅",
                "😂",
                "🤣",
                "😊",
                "😇",
                "🙂",
                "🙃",
                "😉",
                "😌",
                "😍",
                "🥰",
                "😘",
                "😎",
                "🤩",
                "🥳",
                "😏",
                "😮",
                "😱",
                "😭",
                "🥺",
                "😤",
                "😠",
                "😡",
                "🤬",
                "🤯",
                "🥴",
                "😴",
                "😵",

                // Animals
                "🐶",
                "🐱",
                "🐭",
                "🐹",
                "🐰",
                "🦊",
                "🐻",
                "🐼",
                "🐨",
                "🐯",

                // Objects & Tools
                "⚙️",
                "🔧",
                "🔨",
                "💻",
                "⌨️",
                "🖥️",
                "📱",
                "🔋",
                "🔌",
                "💾",
                "💿",
                "📀",
                "🎮",
                "🕹️",
                "🎲",
                "🎯",
                "🎨",
                "✂️",
                "📎",
                "📌",

                // Weather & Nature
                "☀️",
                "🌙",
                "⭐",
                "☁️",
                "🌈",
                "🌧️",
                "⛈️",
                "❄️",
                "🌪️",
                "🔥",

                // Additional Faces & Gestures
                "🤔",
                "🤨",
                "🧐",
                "🤓",
                "😤",
                "😫",
                "😩",
                "🥺",
                "😢",
                "😭",
                "✌️",
                "🤘",
                "🤙",
                "👆",
                "👇",
                "👈",
                "👉",
                "👊",
                "🤛",
                "🤜",

                // Misc Symbols
                "♠️",
                "♣️",
                "♥️",
                "♦️",
                "🔄",
                "⏩",
                "⏪",
                "⏫",
                "⏬",
                "🔼",
                "🔽",
                "⏯️",
                "⏹️",
                "⏺️",
                "⏏️",
                "🎦",
                "🔅",
                "🔆",
                "📶",
                "📳",
                "📴",
                "♾️",
                "♻️",
                "⚜️",
                "🔱",
                "📛",
                "🔰",
                "⭕",
                "✅",
                "☑️",
                "✔️",
                "❌",
                "❎",
                "〽️",
                "✳️",
                "✴️",
                "❇️",
                "©️",
                "®️",
                "™️",
              ].map((emoji, i) => (
                <button
                  key={i}
                  className="p-1 text-2xl hover:bg-white/20 rounded cursor-pointer font-['SerenityOS-Emoji']"
                  onClick={() => {
                    updateSlot(dialogState.slotIndex, { emoji });
                    setDialogState((prev) => ({ ...prev, isOpen: false }));
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
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
          )}
          {dialogState.type !== "emoji" && (
            <DialogFooter>
              <Button variant="retro" onClick={handleDialogSubmit}>
                Save
              </Button>
            </DialogFooter>
          )}
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
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span>🎬</span>
                <span>Click any empty slot to start recording a sound</span>
              </li>
              <li className="flex items-center gap-2">
                <span>✂️</span>
                <span>Click again to stop recording</span>
              </li>
              <li className="flex items-center gap-2">
                <span>🚀</span>
                <span>Click a recorded slot to play the sound</span>
              </li>
              <li className="flex items-center gap-2">
                <span>⚡️</span>
                <span>Press number keys 1-9 to quickly play sounds</span>
              </li>
              <li className="flex items-center gap-2">
                <span>✨</span>
                <span>
                  Add emojis and titles to your sounds by clicking the
                  respective icons
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span>🎯</span>
                <span>
                  Create multiple soundboards using the + button in the sidebar
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span>🔄</span>
                <span>
                  Import and export your soundboards using the File menu
                </span>
              </li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="bg-system7-window-bg border-2 border-black rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] max-w-[400px]">
          <DialogHeader className="text-center"></DialogHeader>
          <div className="space-y-6 text-center py-4">
            <div>
              <span className="text-8xl font-sans">💿</span>
            </div>
            <div className="space-y-0">
              <div className="text-lg font-medium">Soundboard.app</div>
              <p className="text-gray-500">Version 0.10</p>
              <p>
                Made by{" "}
                <a
                  href="https://ryo.lu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Ryo Lu
                </a>
              </p>
              <p>
                <a
                  href="https://github.com/ryokun6/soundboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Open in GitHub
                </a>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
