import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WaveSurfer from "wavesurfer.js";
import { Plus, X, SmilePlus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SoundSlot {
  audioData: string | null;
  waveform?: WaveSurfer;
  emoji?: string;
  title?: string;
}

interface PlaybackState {
  isRecording: boolean;
  isPlaying: boolean;
}

interface Soundboard {
  id: string;
  name: string;
  slots: SoundSlot[];
}

function App() {
  const [boards, setBoards] = useState<Soundboard[]>(() => {
    const saved = localStorage.getItem("soundboards");
    if (saved) {
      const parsed = JSON.parse(saved) as {
        id: string;
        name: string;
        slots: { audioData: string | null; emoji?: string; title?: string }[];
      }[];
      return parsed.map((board) => ({
        ...board,
        slots: board.slots.map((slot) => ({
          audioData: slot.audioData,
          emoji: slot.emoji,
          title: slot.title,
        })),
      }));
    }
    const defaultBoard = {
      id: "default",
      name: "New Soundboard",
      slots: Array(9).fill({
        audioData: null,
        emoji: undefined,
        title: undefined,
      }),
    };
    return [defaultBoard];
  });

  const [playbackStates, setPlaybackStates] = useState<PlaybackState[]>(
    Array(9).fill({ isRecording: false, isPlaying: false })
  );

  const [activeBoardId, setActiveBoardId] = useState<string>(() => {
    return boards[0].id;
  });

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    return localStorage.getItem("selectedDeviceId") || "";
  });

  useEffect(() => {
    const getDevices = async () => {
      await navigator.mediaDevices.getUserMedia({ audio: true }); // Request permission
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(
        (device) => device.kind === "audioinput"
      );
      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    };

    getDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener("devicechange", getDevices);
    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", getDevices);
  }, [selectedDeviceId]);

  useEffect(() => {
    localStorage.setItem("selectedDeviceId", selectedDeviceId);
  }, [selectedDeviceId]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activeSlotRef = useRef<number | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>(Array(9).fill(null));
  const waveformRefs = useRef<(HTMLDivElement | null)[]>(Array(9).fill(null));

  const activeBoard = boards.find((b) => b.id === activeBoardId)!;

  const saveBoards = (newBoards: Soundboard[]) => {
    // Create a copy without waveform objects for localStorage
    const boardsForStorage = newBoards.map((board) => ({
      ...board,
      slots: board.slots.map((slot) => ({
        audioData: slot.audioData,
        emoji: slot.emoji,
        title: slot.title,
      })),
    }));
    localStorage.setItem("soundboards", JSON.stringify(boardsForStorage));

    // Preserve waveforms from current state when updating boards state
    const boardsWithWaveforms = newBoards.map((board) => {
      if (board.id === activeBoardId) {
        return {
          ...board,
          slots: board.slots.map((slot, idx) => ({
            ...slot,
            waveform: activeBoard.slots[idx]?.waveform || slot.waveform,
          })),
        };
      }
      return board;
    });
    setBoards(boardsWithWaveforms);
  };

  const addNewBoard = () => {
    const newBoard: Soundboard = {
      id: Date.now().toString(),
      name: "New Soundboard",
      slots: Array(9).fill({
        audioData: null,
        emoji: undefined,
        title: undefined,
      }),
    };
    saveBoards([...boards, newBoard]);
    setActiveBoardId(newBoard.id);
  };

  const updateBoardName = (name: string) => {
    const newBoards = boards.map((board) =>
      board.id === activeBoardId ? { ...board, name } : board
    );
    saveBoards(newBoards);
    setIsEditingTitle(false);
  };

  const updateSlotState = (index: number, isPlaying: boolean) => {
    setPlaybackStates((prev) => {
      const newStates = [...prev];
      newStates[index] = { ...newStates[index], isPlaying };
      return newStates;
    });
  };

  const handleRecordingStop = async (
    chunks: BlobPart[],
    slotIndex: number,
    stream: MediaStream
  ) => {
    const blob = new Blob(chunks, { type: "audio/webm" });
    const buffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    const newBoards = boards.map((board) => {
      if (board.id === activeBoardId) {
        const newSlots = [...board.slots];
        newSlots[slotIndex] = {
          audioData: base64,
          emoji: board.slots[slotIndex].emoji,
          title: board.slots[slotIndex].title,
        };
        return { ...board, slots: newSlots };
      }
      return board;
    });
    saveBoards(newBoards);
    stream.getTracks().forEach((track) => track.stop());

    setPlaybackStates((prev) => {
      const newStates = [...prev];
      newStates[slotIndex] = { isRecording: false, isPlaying: false };
      return newStates;
    });

    updateWaveform(slotIndex, base64);
  };

  const startRecording = async (slotIndex: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        },
      });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        chunks.push(e.data);
      };

      mediaRecorder.onstop = () =>
        handleRecordingStop(chunks, slotIndex, stream);

      mediaRecorderRef.current = mediaRecorder;
      activeSlotRef.current = slotIndex;

      setPlaybackStates((prev) => {
        const newStates = [...prev];
        newStates[slotIndex] = { isRecording: true, isPlaying: false };
        return newStates;
      });

      mediaRecorder.start(200);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      activeSlotRef.current = null;
    }
  };

  const playSound = (base64Data: string, index: number) => {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "audio/webm" });
    const audio = new Audio(URL.createObjectURL(blob));
    audioRefs.current[index] = audio;

    const slot = activeBoard.slots[index];
    updateSlotState(index, true);

    audio.play();

    if (slot.waveform) {
      slot.waveform.seekTo(0);
      slot.waveform.play();
    }

    // Update waveform progress
    const updateProgress = () => {
      if (slot.waveform && audio.duration) {
        slot.waveform.seekTo(audio.currentTime / audio.duration);
        if (audio.paused) return;
        requestAnimationFrame(updateProgress);
      }
    };
    requestAnimationFrame(updateProgress);

    audio.onended = () => {
      updateSlotState(index, false);
      if (slot.waveform) {
        slot.waveform.stop();
        slot.waveform.seekTo(0);
      }
      audioRefs.current[index] = null;
    };
  };

  const stopSound = (index: number) => {
    const audio = audioRefs.current[index];
    const slot = activeBoard.slots[index];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audioRefs.current[index] = null;
      if (slot.waveform) {
        slot.waveform.stop();
        slot.waveform.seekTo(0);
      }
      updateSlotState(index, false);
    }
  };

  const handleSlotClick = (index: number) => {
    const slot = activeBoard.slots[index];
    if (slot.audioData) {
      if (playbackStates[index].isPlaying) {
        stopSound(index);
      } else {
        playSound(slot.audioData, index);
      }
    } else if (!playbackStates[index].isRecording) {
      startRecording(index);
    } else {
      stopRecording();
    }
  };

  const deleteCurrentBoard = () => {
    if (boards.length <= 1) return; // Prevent deleting last board
    const newBoards = boards.filter((b) => b.id !== activeBoardId);
    saveBoards(newBoards);
    setActiveBoardId(newBoards[0].id);
  };

  const exportBoard = () => {
    const board = boards.find((b) => b.id === activeBoardId);
    const exportData = {
      ...board,
      slots: board?.slots.map((slot) => ({
        audioData: slot.audioData,
        emoji: slot.emoji,
        title: slot.title,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${board?.name || "soundboard"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBoard = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedBoard = JSON.parse(
          e.target?.result as string
        ) as Soundboard;
        const board = {
          ...importedBoard,
          id: Date.now().toString(),
          slots: importedBoard.slots.map((slot) => ({
            audioData: slot.audioData,
            emoji: slot.emoji,
            title: slot.title,
          })),
        };
        saveBoards([...boards, board]);
        setActiveBoardId(board.id);
      } catch (err) {
        console.error("Failed to import soundboard:", err);
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    // Cleanup old waveforms first
    activeBoard.slots.forEach((slot) => {
      slot.waveform?.destroy();
    });

    // Load waveforms for existing recordings
    activeBoard.slots.forEach((slot, index) => {
      if (slot.audioData) {
        updateWaveform(index, slot.audioData);
      }
    });

    return () => {
      activeBoard.slots.forEach((slot) => {
        slot.waveform?.destroy();
      });
    };
  }, [activeBoardId]);

  const updateWaveform = async (index: number, base64Data: string) => {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "audio/webm" });
    const container = waveformRefs.current[index];
    if (!container) return;

    // Destroy existing waveform if it exists
    const existingWaveform = activeBoard.slots[index].waveform;
    if (existingWaveform) {
      existingWaveform.destroy();
    }

    // Clear the container
    container.innerHTML = "";

    const wavesurfer = WaveSurfer.create({
      container,
      height: 60,
      progressColor: "rgba(0, 0, 0, 1)",
      cursorColor: "transparent",
      cursorWidth: 1,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      interact: false,
    });

    wavesurfer.on("play", () => {
      wavesurfer.setOptions({ cursorColor: "rgba(199, 24, 24, 0.56)" });
    });

    wavesurfer.on("pause", () => {
      wavesurfer.setOptions({ cursorColor: "transparent" });
    });

    await wavesurfer.loadBlob(blob);

    // Just update the specific slot's waveform reference
    activeBoard.slots[index].waveform = wavesurfer;
  };

  const handleDelete = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newBoards = boards.map((board) => {
      if (board.id === activeBoardId) {
        const newSlots = [...board.slots];
        newSlots[index] = {
          audioData: null,
          emoji: undefined,
          title: undefined,
        };
        return { ...board, slots: newSlots };
      }
      return board;
    });
    saveBoards(newBoards);
  };

  const handleEmojiClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const emoji = prompt("Enter an emoji:");
    if (emoji) {
      const newBoards = boards.map((board) => {
        if (board.id === activeBoardId) {
          const newSlots = [...board.slots];
          newSlots[index] = {
            ...newSlots[index],
            emoji,
          };
          return { ...board, slots: newSlots };
        }
        return board;
      });
      saveBoards(newBoards);
    }
  };

  const handleTitleClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const slot = activeBoard.slots[index];
    const title = prompt("Enter a title:", slot.title || "");
    if (title !== null) {
      const newBoards = boards.map((board) => {
        if (board.id === activeBoardId) {
          const newSlots = [...board.slots];
          newSlots[index] = {
            ...newSlots[index],
            title,
          };
          return { ...board, slots: newSlots };
        }
        return board;
      });
      saveBoards(newBoards);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle both numpad (97-105) and regular number keys (49-57)
      const index =
        e.keyCode >= 97
          ? e.keyCode - 97 // Numpad 1-9
          : e.keyCode - 49; // Regular 1-9

      if (
        (e.keyCode >= 97 && e.keyCode <= 105) ||
        (e.keyCode >= 49 && e.keyCode <= 57)
      ) {
        const slot = activeBoard.slots[index];
        if (slot.audioData) {
          if (playbackStates[index].isPlaying) {
            stopSound(index);
          } else {
            playSound(slot.audioData, index);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeBoard.slots, playbackStates]);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex bg-gray-100 border-b px-2 h-7 items-center text-sm">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="default"
              className="h-6 px-2 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white "
            >
              File
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={addNewBoard}>
              New Soundboard
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => document.getElementById("import-board")?.click()}
            >
              Import Soundboard...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportBoard}>
              Export Soundboard...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="default"
              className="h-6 px-2 py-1 focus-visible:ring-0 hover:bg-gray-200"
            >
              Edit
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
              Rename Soundboard
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={deleteCurrentBoard}
              disabled={boards.length <= 1}
              className={boards.length <= 1 ? "text-gray-400" : ""}
            >
              Delete Soundboard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="default"
              className="h-6 px-2 py-1 focus-visible:ring-0 hover:bg-gray-200"
            >
              View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Show Waveforms</DropdownMenuItem>
            <DropdownMenuItem>Show Emojis</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-1">
        <div className="w-64 bg-gray-100 p-4 border-r flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Soundboards</h2>
            <Button variant="ghost" size="icon" onClick={addNewBoard}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2 flex-1">
            {boards.map((board) => (
              <Button
                key={board.id}
                variant={board.id === activeBoardId ? "default" : "ghost"}
                className="w-full justify-start text-lg"
                onClick={() => setActiveBoardId(board.id)}
              >
                {board.name}
              </Button>
            ))}
          </div>
          <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select microphone" />
            </SelectTrigger>
            <SelectContent>
              {audioDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label ||
                    `Microphone ${device.deviceId.slice(0, 4)}...`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="file"
            id="import-board"
            className="hidden"
            accept="application/json"
            onChange={importBoard}
          />
        </div>

        <div className="flex-1 p-8">
          <div className="max-w-2xl mx-auto h-full flex flex-col">
            {isEditingTitle ? (
              <Input
                className="text-3xl font-bold mb-8 text-left"
                value={activeBoard.name}
                autoFocus
                onChange={(e) => {
                  const newBoards = boards.map((board) =>
                    board.id === activeBoardId
                      ? { ...board, name: e.target.value }
                      : board
                  );
                  setBoards(newBoards);
                }}
                onBlur={(e) => updateBoardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateBoardName(e.currentTarget.value);
                  }
                }}
              />
            ) : (
              <h1
                className="text-3xl font-bold mb-8 text-left cursor-pointer hover:opacity-80"
                onClick={() => setIsEditingTitle(true)}
              >
                {activeBoard.name}
              </h1>
            )}
            <div className="grid grid-cols-3 gap-4 flex-1">
              {activeBoard.slots.map((slot, index) => (
                <div key={index} className="flex flex-col gap-2 min-h-0">
                  <Button
                    variant={
                      playbackStates[index].isRecording
                        ? "destructive"
                        : slot.audioData
                        ? "retro"
                        : "retro"
                    }
                    className="h-full w-full flex flex-col items-stretch justify-between relative p-4 group min-h-[6rem]"
                    onClick={() => handleSlotClick(index)}
                  >
                    {slot.audioData && (
                      <>
                        <div
                          ref={(el) => (waveformRefs.current[index] = el)}
                          className="w-full h-12 flex-shrink-0"
                        />
                        <div className="absolute top-1 right-1 flex gap-1 z-10">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 hover:bg-white/50"
                            onClick={(e) => handleDelete(index, e)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div
                          className={`absolute bottom-1 left-2 flex items-center gap-2 z-10 transition-all duration-300 ease-in-out transform origin-left ${
                            playbackStates[index].isPlaying
                              ? "opacity-100 scale-100"
                              : "opacity-60 scale-80"
                          }`}
                        >
                          {slot.emoji ? (
                            <span
                              className="text-2xl cursor-pointer hover:opacity-80"
                              onClick={(e) => handleEmojiClick(index, e)}
                            >
                              {slot.emoji}
                            </span>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 hover:bg-white/50"
                              onClick={(e) => handleEmojiClick(index, e)}
                            >
                              <SmilePlus className="w-4 h-4" />
                            </Button>
                          )}
                          <span
                            className="text-lg font-medium truncate max-w-[120px] cursor-text hover:bg-white/20 px-1 rounded"
                            onClick={(e) => handleTitleClick(index, e)}
                            title={slot.title ? "Edit title" : "Add title"}
                          >
                            {slot.title || (
                              <span className="opacity-0 group-hover:opacity-60">
                                Add title...
                              </span>
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
