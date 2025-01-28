import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
      <DialogContent className="bg-system7-window-bg border-2 border-black rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Set Emoji</DialogTitle>
          <DialogDescription>
            Choose an emoji for this sound slot
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-10 gap-1 my-4 max-h-[300px] overflow-y-auto">
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
      </DialogContent>
    </Dialog>
  );
}
