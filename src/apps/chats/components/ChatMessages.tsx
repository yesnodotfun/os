import { Message } from "ai";
import { Loader2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

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
      <div className="flex flex-col gap-1">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col ${
              message.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div className="text-[16px] text-gray-500 mb-0.5 font-['Geneva-9'] mb-[-2px]">
              {message.role === "user" ? "You" : "Ryo"}{" "}
              <span className="text-gray-400">
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div
              style={{
                fontFamily:
                  "Geneva-12, SerenityOS-Emoji, system-ui, -apple-system, sans-serif",
              }}
              className={`max-w-[90%] p-1.5 px-2 rounded leading-snug text-[12px] antialiased ${
                message.role === "user"
                  ? "bg-yellow-200 text-black"
                  : "bg-blue-200 text-black"
              }`}
            >
              <div className="break-words">{message.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500 font-['Geneva-9'] text-[16px] antialiased h-[12px]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Thinking...
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-red-600 font-['Geneva-9'] text-[16px] antialiased h-[12px]">
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
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
