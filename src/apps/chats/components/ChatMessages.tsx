import { Message as VercelMessage } from "ai";
import { Loader2, AlertCircle, MessageSquare, Copy, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { useChatSynth } from "@/hooks/useChatSynth";
import { useTerminalSounds } from "@/hooks/useTerminalSounds";
import HtmlPreview, {
  isHtmlCodeBlock,
  extractHtmlContent,
} from "@/components/shared/HtmlPreview";

// --- Color Hashing for Usernames ---
const userColors = [
  "bg-pink-100 text-black",
  "bg-purple-100 text-black",
  "bg-indigo-100 text-black",
  "bg-teal-100 text-black",
  "bg-lime-100 text-black",
  "bg-amber-100 text-black",
  "bg-cyan-100 text-black",
  "bg-rose-100 text-black",
];

const getUserColorClass = (username?: string): string => {
  if (!username) {
    return "bg-gray-100 text-black"; // Default or fallback color
  }
  // Simple hash function
  const hash = username
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return userColors[hash % userColors.length];
};
// --- End Color Hashing ---

// Helper function to parse markdown and segment text
const parseMarkdown = (text: string): { type: string; content: string }[] => {
  const tokens: { type: string; content: string }[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    // Check for bold text (**text**)
    const boldMatch = text.slice(currentIndex).match(/^\*\*(.*?)\*\*/);
    if (boldMatch) {
      tokens.push({ type: "bold", content: boldMatch[1] });
      currentIndex += boldMatch[0].length;
      continue;
    }

    // Check for italic text (*text*)
    const italicMatch = text.slice(currentIndex).match(/^\*(.*?)\*/);
    if (italicMatch) {
      tokens.push({ type: "italic", content: italicMatch[1] });
      currentIndex += italicMatch[0].length;
      continue;
    }

    // Match CJK characters, emojis, words, spaces, or other characters
    const wordMatch = text
      .slice(currentIndex)
      .match(
        /^([\p{Emoji_Presentation}\p{Extended_Pictographic}]|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[a-zA-Z0-9]+|[^\S\n]+|[^a-zA-Z0-9\s\p{Emoji_Presentation}\p{Extended_Pictographic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}*]+)/u
      );

    if (wordMatch) {
      tokens.push({ type: "text", content: wordMatch[0] });
      currentIndex += wordMatch[0].length;
      continue;
    }

    // If no match found (shouldn't happen), move forward one character
    tokens.push({ type: "text", content: text[currentIndex] });
    currentIndex++;
  }

  return tokens;
};

// Helper function to segment text properly for CJK and emojis
const segmentText = (text: string): { type: string; content: string }[] => {
  // First split by line breaks to preserve them
  return text.split(/(\n)/).flatMap((segment) => {
    if (segment === "\n") return [{ type: "text", content: "\n" }];
    // Parse markdown and maintain word boundaries in the segment
    return parseMarkdown(segment);
  });
};

// Helper function to check if text contains only emojis
const isEmojiOnly = (text: string): boolean => {
  const emojiRegex = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u;
  return emojiRegex.test(text);
};

// Define an extended message type that includes username
// Extend VercelMessage and add username and the 'human' role
interface ChatMessage extends Omit<VercelMessage, 'role'> { // Omit the original role to redefine it
  username?: string; // Add username, make it optional for safety
  role: VercelMessage['role'] | 'human'; // Allow original roles plus 'human'
  isPending?: boolean; // Add isPending flag
}

interface ChatMessagesProps {
  messages: ChatMessage[]; // Use the extended type
  isLoading: boolean;
  error?: Error;
  onRetry?: () => void;
  onClear?: () => void;
  isRoomView: boolean; // Add prop to indicate if this is a room view
}

export function ChatMessages({
  messages,
  isLoading,
  error,
  onRetry,
  onClear,
  isRoomView,
}: ChatMessagesProps) {
  const [scrollLockedToBottom, setScrollLockedToBottom] = useState(true);
  const viewportRef = useRef<HTMLElement | null>(null);
  const { playNote } = useChatSynth();
  const { playElevatorMusic, stopElevatorMusic, playDingSound } =
    useTerminalSounds();
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const previousMessagesLength = useRef(messages.length);
  const hasScrolled = useRef(false);
  const wasAtBottom = useRef(true);
  const [isInteractingWithPreview, setIsInteractingWithPreview] =
    useState(false);
  
  // Ref to track initial message IDs for animation control
  const initialMessageIdsRef = useRef<Set<string>>(new Set());
  const hasInitializedRef = useRef(false);
  const previousMessagesRef = useRef<ChatMessage[]>([]); // Ref to store previous messages for comparison

  // --- New Effect for Sound/Vibration ---
  useEffect(() => {
    // Only run if not the initial load/render and we have previous messages to compare against
    // Also check if the component is currently mounted using a ref (optional but good practice)
    if (previousMessagesRef.current.length > 0 && messages.length > previousMessagesRef.current.length) {
        // Find messages present in the current list but not the previous one
        // Ensure IDs are compared robustly, falling back if necessary
        const previousIds = new Set(previousMessagesRef.current.map(m => m.id || `${m.role}-${m.content.substring(0, 10)}`));
        const newMessages = messages.filter(
            currentMsg => !previousIds.has(currentMsg.id || `${currentMsg.role}-${currentMsg.content.substring(0, 10)}`)
        );

        // Check if any of the *new* messages are from 'human' (other users in room)
        const newHumanMessage = newMessages.find(msg => msg.role === 'human');

        if (newHumanMessage) {
            console.log("New human message detected:", newHumanMessage);
            playNote();
            if ('vibrate' in navigator) {
                navigator.vibrate(100); // Vibrate for 100ms if supported
            }
        }
    }

    // Update the ref *after* comparison for the next render
    previousMessagesRef.current = messages;

  }, [messages, playNote]);
  // --- End New Effect ---

  // Capture initial message IDs on mount (runs once per component instance/key change)
  useEffect(() => {
    // Only initialize once per component instance (keyed mount)
    if (!hasInitializedRef.current && messages.length > 0) {
      initialMessageIdsRef.current = new Set(messages.map(m => m.id || `${m.role}-${m.content.substring(0, 10)}`));
      hasInitializedRef.current = true;
      previousMessagesRef.current = messages; // Initialize previous messages on mount
    }
    // We *don't* want this effect to re-run when messages update later,
    // only when the component mounts due to a key change.
    // Using an empty dependency array achieves this, but ESLint might complain.
    // A more robust way might involve comparing props, but let's try this first.
  }, []); // Run only once on mount for this instance

  // Reset initialization state if messages become empty (e.g., chat cleared)
  // and the component is still mounted (not changing room)
  useEffect(() => {
      if (messages.length === 0) {
          hasScrolled.current = false; // Reset scroll state when messages are cleared (room switch)
          hasInitializedRef.current = false;
          initialMessageIdsRef.current = new Set();
          previousMessagesRef.current = []; // Reset previous messages when cleared
      }
  }, [messages]);

  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(
        message.id || `${message.role}-${message.content.substring(0, 10)}`
      );
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
      // Fallback to older method if clipboard API fails
      try {
        const textarea = document.createElement("textarea");
        textarea.value = message.content;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);

        setCopiedMessageId(
          message.id || `${message.role}-${message.content.substring(0, 10)}`
        );
        setTimeout(() => setCopiedMessageId(null), 2000);
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
      }
    }
  };

  const scrollToBottom = useCallback((viewport: HTMLElement) => {
    console.log('[Scroll] Scrolling to bottom');
    viewport.scrollTop = viewport.scrollHeight;
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const viewport = e.currentTarget.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    if (!viewport) return;

    hasScrolled.current = true;
    const isAtBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 10;

    // If we were at bottom and scrolled up, unlock
    if (wasAtBottom.current && !isAtBottom) {
      console.log('[Scroll] User scrolled up, unlocking auto-scroll');
      setScrollLockedToBottom(false);
    }
    // If we're at bottom, lock and remember we were at bottom
    if (isAtBottom) {
      console.log('[Scroll] User scrolled to bottom, locking auto-scroll');
      setScrollLockedToBottom(true);
      wasAtBottom.current = true;
    }
  };

  // Initial scroll to bottom and handle new messages
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // Always scroll to bottom on initial load or when messages first appear after being empty
    if (!hasScrolled.current || previousMessagesLength.current === 0) {
      console.log('[Scroll] Initial load or first messages, scrolling to bottom');
      scrollToBottom(viewport);
      return;
    }

    // Only scroll if locked to bottom AND the number of messages has increased
    if (scrollLockedToBottom && messages.length > previousMessagesLength.current) {
      console.log(`[Scroll] New messages (${messages.length} > ${previousMessagesLength.current}) and locked to bottom, scrolling down`);
      scrollToBottom(viewport);
    } else if (messages.length > previousMessagesLength.current) {
      console.log(`[Scroll] New messages (${messages.length} > ${previousMessagesLength.current}) but NOT scrolling (locked: ${scrollLockedToBottom})`);
    }

    previousMessagesLength.current = messages.length;
  }, [messages.length, scrollLockedToBottom, scrollToBottom]);

  const isUrgentMessage = (content: string) => content.startsWith("!!!!");

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
      <AnimatePresence initial={false} mode="sync">
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
          {messages.length === 0 && !isRoomView && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-gray-500 font-['Geneva-9'] text-[16px] antialiased h-[12px]"
            >
              <MessageSquare className="h-3 w-3" />
              <span>Start a new conversation?</span>
              {onClear && (
                <Button
                  size="sm"
                  variant="link"
                  onClick={onClear}
                  className="m-0 p-0 text-[16px] h-0 text-gray-500 hover:text-gray-700"
                >
                  New chat
                </Button>
              )}
            </motion.div>
          )}
          {messages.map((message) => {
            const messageKey = message.id || `${message.role}-${message.content.substring(0, 10)}`;
            const isInitialMessage = initialMessageIdsRef.current.has(messageKey);

            // Define animation variants
            const variants = {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
            };

            // Determine message style based on role
            let bgColorClass = "";
            if (message.role === "user") {
              bgColorClass = "bg-yellow-100 text-black";
            } else if (message.role === "assistant") {
              bgColorClass = "bg-blue-100 text-black";
            } else if (message.role === "human") {
              // Use hash-based color for human messages
              bgColorClass = getUserColorClass(message.username);
            }

            return (
              <motion.div
                key={messageKey}
                // Use variants, but skip the 'initial' state if it's an initial message
                variants={variants}
                initial={isInitialMessage ? "animate" : "initial"} // Start fully visible if initial
                animate="animate"
                transition={{ duration: 0.2 }} // Keep transition for layout changes
                className={`flex flex-col z-10 w-full ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
                style={{
                  transformOrigin:
                    message.role === "user" ? "bottom right" : "bottom left",
                }}
                onMouseEnter={() =>
                  !isInteractingWithPreview &&
                  setHoveredMessageId(
                    messageKey // Use consistent key
                  )
                }
                onMouseLeave={() =>
                  !isInteractingWithPreview && setHoveredMessageId(null)
                }
              >
                <div className="text-[16px] text-gray-500 mb-0.5 font-['Geneva-9'] mb-[-2px] select-text flex items-center gap-2">
                  {message.role === "user" && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity:
                          hoveredMessageId === messageKey // Use consistent key
                            ? 1
                            : 0,
                        scale: 1,
                      }}
                      className="h-3 w-3 text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => copyMessage(message)}
                    >
                      {copiedMessageId === messageKey ? ( // Use consistent key
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </motion.button>
                  )}
                  {message.username || (message.role === "user" ? "You" : "Ryo")}{" "}
                  <span className="text-gray-400 select-text">
                    {message.createdAt ? (
                      new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    ) : (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                  </span>
                  {message.role === "assistant" && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity:
                          hoveredMessageId === messageKey // Use consistent key
                            ? 1
                            : 0,
                        scale: 1,
                      }}
                      className="h-3 w-3 text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => copyMessage(message)}
                    >
                      {copiedMessageId === messageKey ? ( // Use consistent key
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </motion.button>
                  )}
                </div>

                <motion.div
                  layout="position"
                  initial={{
                    backgroundColor:
                      message.role === "user" ? "#fef9c3" : 
                      message.role === "assistant" ? "#dbeafe" :
                      // For human messages, convert bg-color-100 to hex (approximately)
                      bgColorClass.split(" ")[0].includes("pink") ? "#fce7f3" :
                      bgColorClass.split(" ")[0].includes("purple") ? "#f3e8ff" :
                      bgColorClass.split(" ")[0].includes("indigo") ? "#e0e7ff" :
                      bgColorClass.split(" ")[0].includes("teal") ? "#ccfbf1" :
                      bgColorClass.split(" ")[0].includes("lime") ? "#ecfccb" :
                      bgColorClass.split(" ")[0].includes("amber") ? "#fef3c7" :
                      bgColorClass.split(" ")[0].includes("cyan") ? "#cffafe" :
                      bgColorClass.split(" ")[0].includes("rose") ? "#ffe4e6" :
                      "#f3f4f6", // gray-100 fallback
                    color: "#000000",
                  }}
                  animate={
                    isUrgentMessage(message.content)
                      ? {
                          backgroundColor: [
                            "#fee2e2", // Start with red for urgent (lighter red-100)
                            message.role === "user" ? "#fef9c3" : 
                            message.role === "assistant" ? "#dbeafe" :
                            // For human messages, convert bg-color-100 to hex (approximately)
                            bgColorClass.split(" ")[0].includes("pink") ? "#fce7f3" :
                            bgColorClass.split(" ")[0].includes("purple") ? "#f3e8ff" :
                            bgColorClass.split(" ")[0].includes("indigo") ? "#e0e7ff" :
                            bgColorClass.split(" ")[0].includes("teal") ? "#ccfbf1" :
                            bgColorClass.split(" ")[0].includes("lime") ? "#ecfccb" :
                            bgColorClass.split(" ")[0].includes("amber") ? "#fef3c7" :
                            bgColorClass.split(" ")[0].includes("cyan") ? "#cffafe" :
                            bgColorClass.split(" ")[0].includes("rose") ? "#ffe4e6" :
                            "#f3f4f6", // gray-100 fallback
                          ],
                          color: ["#C92D2D", "#000000"],
                          transition: {
                            duration: 1,
                            repeat: 1,
                            repeatType: "reverse",
                            ease: "easeInOut",
                            delay: 0.,
                          },
                        }
                      : {}
                  }
                  className={`${
                    isHtmlCodeBlock(message.content).isHtml ||
                    (isLoading &&
                      message === messages[messages.length - 1] &&
                      message.content.includes("```"))
                      ? "w-full p-[1px] m-0 outline-0 ring-0 !bg-transparent"
                      : `w-fit max-w-[90%] p-1.5 px-2 ${
                          bgColorClass || (message.role === "user"
                            ? "bg-yellow-100 text-black"
                            : "bg-blue-100 text-black")
                        }`
                  } min-h-[12px] rounded leading-snug text-[12px] font-geneva-12 break-words select-text`}
                >
                  {message.role === "assistant" ? (
                    <motion.div
                      layout="position"
                      className="select-text whitespace-pre-wrap"
                    >
                      {(() => {
                        // Check for XML tags and their completeness
                        const hasXmlTags =
                          /<textedit:(insert|replace|delete)/i.test(
                            message.content
                          );
                        if (hasXmlTags) {
                          // Count opening and closing tags
                          const openTags = (
                            message.content.match(
                              /<textedit:(insert|replace|delete)/g
                            ) || []
                          ).length;
                          const closeTags = (
                            message.content.match(
                              /<\/textedit:(insert|replace)>|<textedit:delete[^>]*\/>/g
                            ) || []
                          ).length;

                          // If tags are incomplete, show *editing*
                          if (openTags !== closeTags) {
                            return (
                              <motion.span
                                initial={{ opacity: 1 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0 }}
                                className="select-text italic"
                              >
                                editing...
                              </motion.span>
                            );
                          }
                        }

                        // Remove "!!!!" prefix and following space from urgent messages
                        const displayContent = isUrgentMessage(message.content)
                          ? message.content.slice(4).trimStart()
                          : message.content;

                        // Check for HTML content
                        const { hasHtml, htmlContent, textContent } =
                          extractHtmlContent(displayContent);

                        return (
                          <>
                            {/* Show only non-HTML text content */}
                            {textContent &&
                              segmentText(textContent).map((segment, idx) => (
                                <motion.span
                                  key={idx}
                                  // Skip initial animation for initial messages
                                  initial={isInitialMessage ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={`select-text ${
                                    isEmojiOnly(textContent) ? "text-[24px]" : ""
                                  } ${
                                    segment.type === "bold"
                                      ? "font-bold"
                                      : segment.type === "italic"
                                      ? "italic"
                                      : ""
                                  }`}
                                  style={{ userSelect: "text" }}
                                  transition={{
                                    // Always use the standard transition
                                    duration: 0.15,
                                    delay: idx * 0.05,
                                    ease: "easeOut",
                                    onComplete: () => {
                                      // Always attempt to play sound (standard behavior)
                                      if (idx % 2 === 0) { 
                                        playNote();
                                      }
                                    },
                                  }}
                                >
                                  {segment.content}
                                </motion.span>
                              ))}

                            {/* Show HTML preview if there's HTML content */}
                            {hasHtml && htmlContent && (
                              <HtmlPreview
                                htmlContent={htmlContent}
                                onInteractionChange={setIsInteractingWithPreview}
                                isStreaming={
                                  isLoading &&
                                  message === messages[messages.length - 1]
                                }
                                playElevatorMusic={playElevatorMusic}
                                stopElevatorMusic={stopElevatorMusic}
                                playDingSound={playDingSound}
                              />
                            )}
                          </>
                        );
                      })()}
                    </motion.div>
                  ) : (
                    <>
                      <span
                        className={`select-text whitespace-pre-wrap ${
                          isEmojiOnly(message.content) ? "text-[24px]" : ""
                        }`}
                        style={{ userSelect: "text" }}
                      >
                        {segmentText(message.content).map((segment, idx) => (
                          <span
                            key={idx}
                            className={
                              segment.type === "bold"
                                ? "font-bold"
                                : segment.type === "italic"
                                ? "italic"
                                : ""
                            }
                          >
                            {segment.content}
                          </span>
                        ))}
                      </span>

                      {/* Check if user message contains HTML code and show preview */}
                      {isHtmlCodeBlock(message.content).isHtml && (
                        <HtmlPreview
                          htmlContent={isHtmlCodeBlock(message.content).content}
                          onInteractionChange={setIsInteractingWithPreview}
                          playElevatorMusic={playElevatorMusic}
                          stopElevatorMusic={stopElevatorMusic}
                          playDingSound={playDingSound}
                        />
                      )}
                    </>
                  )}
                </motion.div>
              </motion.div>
            );
          })}
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
                  className="m-0 p-0 text-[16px] h-0 text-amber-600"
                >
                  Try again
                </Button>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </ScrollArea>
  );
}
