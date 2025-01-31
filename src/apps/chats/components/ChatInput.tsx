import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
}

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  onStop,
}: ChatInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <form onSubmit={onSubmit} className="flex gap-1">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div layout className="flex-1" transition={{ duration: 0.15 }}>
          <Input
            value={input}
            onChange={onInputChange}
            placeholder="Type a message..."
            className={`w-full border-1 border-gray-800 text-xs font-['Geneva-12'] antialiased h-8 ${
              isFocused ? "input--focused" : ""
            }`}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onTouchStart={(e) => {
              e.preventDefault();
            }}
          />
        </motion.div>
        {isLoading ? (
          <motion.div
            key="stop"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            layout
          >
            <Button
              type="button"
              onClick={onStop}
              className="bg-black hover:bg-black/80 text-white text-xs border-2 border-gray-800 w-8 h-8 p-0 flex items-center justify-center"
            >
              <Square className="h-4 w-4" fill="currentColor" />
            </Button>
          </motion.div>
        ) : input.trim() !== "" ? (
          <motion.div
            key="send"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            layout
          >
            <Button
              type="submit"
              className="bg-black hover:bg-black/80 text-white text-xs border-2 border-gray-800 w-8 h-8 p-0 flex items-center justify-center"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </form>
  );
}
