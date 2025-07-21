import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface EmojiDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEmojiSelect: (emoji: string) => void;
}

const EMOJIS = [
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
];

export function EmojiDialog({
  isOpen,
  onOpenChange,
  onEmojiSelect,
}: EmojiDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-os-window-bg border-[length:var(--os-metrics-border-width)] border-os-window rounded-os shadow-os-window">
        <DialogHeader>
          <DialogTitle className="font-normal text-[16px]">Set Emoji</DialogTitle>
          <DialogDescription className="sr-only">Choose an emoji for this sound slot</DialogDescription>
        </DialogHeader>
        <div className="p-4 pt-0">
          <p id="dialog-description" className="text-gray-500 mb-2 text-[12px] font-geneva-12">
            Choose an emoji for this sound slot
          </p>
          <div className="grid grid-cols-10 gap-1 max-h-[300px] overflow-y-auto">
            {EMOJIS.map((emoji, i) => (
              <button
                key={i}
                className="p-1 text-2xl hover:bg-white/20 rounded cursor-pointer font-['SerenityOS-Emoji']"
                onClick={() => {
                  onEmojiSelect(emoji);
                  onOpenChange(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
