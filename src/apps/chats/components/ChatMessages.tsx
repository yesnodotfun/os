import { Message } from "ai";
import { Loader2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  error?: Error;
  onRetry?: () => void;
}

export function ChatMessages({
  messages,
  isLoading,
  error,
  onRetry,
}: ChatMessagesProps) {
  const [scrollLockedToBottom, setScrollLockedToBottom] = useState(true);
  const viewportRef = useRef<HTMLElement | null>(null);

  const scrollToBottom = useCallback(
    (viewport: HTMLElement) => {
      if (!scrollLockedToBottom) return;
      viewport.scrollTop = viewport.scrollHeight;
    },
    [scrollLockedToBottom]
  );

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const viewport = e.currentTarget.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    if (!viewport) return;

    const isAtBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 10;
    setScrollLockedToBottom(isAtBottom);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport && scrollLockedToBottom) {
      scrollToBottom(viewport);
    }
  }, [messages, isLoading, scrollLockedToBottom, scrollToBottom]);

  return (
    <ScrollArea
      className="flex-1 bg-white border-2 border-gray-800 rounded mb-2 p-2 h-full w-full"
      onScroll={handleScroll}
      ref={(ref) => {
        const viewport = ref?.querySelector(
          "[data-radix-scroll-area-viewport]"
        ) as HTMLElement;
        viewportRef.current = viewport;
      }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          layout="position"
          className="flex flex-col gap-1"
          transition={{
            layout: {
              type: "spring",
              bounce: 0.1415,
              duration: 1,
            },
          }}
        >
          {messages.map((message) => (
            <motion.div
              key={
                message.id ||
                `${message.role}-${message.content.substring(0, 10)}`
              }
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex flex-col  z-10 ${
                message.role === "user" ? "items-end" : "items-start"
              }`}
              style={{
                transformOrigin:
                  message.role === "user" ? "bottom right" : "bottom left",
              }}
            >
              <div className="text-[16px] text-gray-500 mb-0.5 font-['Geneva-9'] mb-[-2px]">
                {message.role === "user" ? "You" : "Ryo"}{" "}
                <span className="text-gray-400">
                  {message.createdAt ? (
                    new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  ) : (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </span>
              </div>

              <motion.div
                layout="position"
                style={{
                  fontFamily:
                    "Geneva-12, SerenityOS-Emoji, system-ui, -apple-system, sans-serif",
                }}
                className={`max-w-[90%] min-h-[12px] p-1.5 px-2 rounded leading-snug text-[12px] antialiased break-words ${
                  message.role === "user"
                    ? "bg-yellow-200 text-black"
                    : "bg-blue-200 text-black"
                }`}
              >
                {message.role === "assistant" ? (
                  <motion.div layout="position">
                    {message.content.split(" ").map((word, idx) => (
                      <motion.span
                        key={idx}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.15,
                          delay: idx * 0.05,
                          ease: "easeOut",
                        }}
                      >
                        {word}{" "}
                      </motion.span>
                    ))}
                  </motion.div>
                ) : (
                  message.content
                )}
              </motion.div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 text-gray-500 font-['Geneva-9'] text-[16px] antialiased h-[12px] z-1"
              style={{ transformOrigin: "bottom left" }}
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Thinking...
            </motion.div>
          )}
          {error && (
            <motion.div
              layout
              className="flex items-center gap-2 text-red-600 font-['Geneva-9'] text-[16px] antialiased h-[12px]"
            >
              <AlertCircle className="h-3 w-3" />
              <span>{error.message}</span>
              {onRetry && (
                <Button
                  size="sm"
                  variant="link"
                  onClick={onRetry}
                  className="m-0 p-0 text-[16px] h-0"
                >
                  Reload
                </Button>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </ScrollArea>
  );
}
