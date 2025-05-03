import { Message as VercelMessage } from "ai";
import { Loader2, AlertCircle, MessageSquare, Copy, Check, ChevronDown, Trash } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { useChatSynth } from "@/hooks/useChatSynth";
import { useTerminalSounds } from "@/hooks/useTerminalSounds";
import HtmlPreview, {
  isHtmlCodeBlock,
  extractHtmlContent,
} from "@/components/shared/HtmlPreview";
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';

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
const parseMarkdown = (text: string): { type: string; content: string, url?: string }[] => {
  const tokens: { type: string; content: string, url?: string }[] = [];
  let currentIndex = 0;
  // Regex to match URLs, Markdown links, bold, italic, CJK, emojis, words, spaces, or other characters
  const regex = /(\[([^\]]+?)\]\((https?:\/\/[^\s]+?)\))|(\*\*(.*?)\*\*)|(\*(.*?)\*)|(https?:\/\/[^\s]+)|([\p{Emoji_Presentation}\p{Extended_Pictographic}]|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[a-zA-Z0-9]+|[^\S\n]+|[^a-zA-Z0-9\s\p{Emoji_Presentation}\p{Extended_Pictographic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}*]+)/gu;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) { // Markdown link: [text](url)
      tokens.push({ type: "link", content: match[2], url: match[3] });
    } else if (match[4]) { // Bold: **text**
      tokens.push({ type: "bold", content: match[5] });
    } else if (match[6]) { // Italic: *text*
      tokens.push({ type: "italic", content: match[7] });
    } else if (match[8]) { // Plain URL
      tokens.push({ type: "link", content: match[8], url: match[8] });
    } else if (match[9]) { // Other text (CJK, emoji, word, space, etc.)
      tokens.push({ type: "text", content: match[9] });
    }
    currentIndex = regex.lastIndex;
  }

  // Capture any remaining text (shouldn't happen with the current regex, but good practice)
  if (currentIndex < text.length) {
    tokens.push({ type: "text", content: text.slice(currentIndex) });
  }

  return tokens;
};

// Helper function to segment text properly for CJK and emojis
const segmentText = (text: string): { type: string; content: string; url?: string }[] => {
  // First split by line breaks to preserve them
  return text.split(/(\n)/).flatMap((segment) => {
    if (segment === "\n") return [{ type: "text", content: "\n" }];
    // Parse markdown (including links) and maintain word boundaries in the segment
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
  isRoomView: boolean; // Indicates if this is a room view (vs Ryo chat)
  roomId?: string; // Needed for message deletion calls
  isAdmin?: boolean; // Whether the current user has admin privileges (e.g. username === "ryo")
  username?: string; // Current client username (needed for delete request)
  onMessageDeleted?: (messageId: string) => void; // Callback when a message is deleted locally
}

// Component to render the scroll-to-bottom button using the library's context
function ScrollToBottomButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  return (
    <AnimatePresence>
      {!isAtBottom && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ type: "spring", duration: 0.2 }}
          className="absolute bottom-3 right-3 bg-black/70 hover:bg-black text-white p-1.5 rounded-full shadow-md z-20"
          onClick={() => scrollToBottom()} // Use the library's function
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function ChatMessages({
  messages,
  isLoading,
  error,
  onRetry,
  onClear,
  isRoomView,
  roomId,
  isAdmin = false,
  username,
  onMessageDeleted,
}: ChatMessagesProps) {
  const { playNote } = useChatSynth();
  const { playElevatorMusic, stopElevatorMusic, playDingSound } =
    useTerminalSounds();
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [isInteractingWithPreview, setIsInteractingWithPreview] = useState(false);
  
  // Refs needed for message processing/animation, but not scrolling
  const previousMessagesRef = useRef<ChatMessage[]>([]);
  const initialMessageIdsRef = useRef<Set<string>>(new Set());
  const hasInitializedRef = useRef(false);

  // --- New Effect for Sound/Vibration ---
  useEffect(() => {
    if (previousMessagesRef.current.length > 0 && messages.length > previousMessagesRef.current.length) {
      const previousIds = new Set(previousMessagesRef.current.map(m => m.id || `${m.role}-${m.content.substring(0, 10)}`));
      const newMessages = messages.filter(
        currentMsg => !previousIds.has(currentMsg.id || `${currentMsg.role}-${currentMsg.content.substring(0, 10)}`)
      );
      const newHumanMessage = newMessages.find(msg => msg.role === 'human');
      if (newHumanMessage) {
        playNote();
        if ('vibrate' in navigator) {
          navigator.vibrate(100);
        }
      }
    }
    previousMessagesRef.current = messages;
  }, [messages, playNote]);
  // --- End New Effect ---

  // Effect to capture initial message IDs (runs once per component instance/key change)
  useEffect(() => {
    // Only initialize once per component instance (keyed mount)
    if (!hasInitializedRef.current && messages.length > 0) {
      hasInitializedRef.current = true;
      previousMessagesRef.current = messages; // Initialize previous messages
      initialMessageIdsRef.current = new Set(messages.map(m => m.id || `${m.role}-${m.content.substring(0, 10)}`));
    } else if (messages.length === 0) { // Also reset if starting empty
      hasInitializedRef.current = false; // Allow re-initialization if messages appear later
    }
  }, [messages]); // Re-run if messages array itself changes (e.g., clearing chat)

  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(
        message.id || `${message.role}-${message.content.substring(0, 10)}`
      );
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
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

  const deleteMessage = async (message: ChatMessage) => {
    if (!roomId || !message.id) return;
    try {
      const res = await fetch(`/api/chat-rooms?action=deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, messageId: message.id, username }),
      });
      if (!res.ok) {
        console.error("Failed to delete message", await res.text());
      } else {
        onMessageDeleted?.(message.id);
      }
    } catch (err) {
      console.error("Error deleting message", err);
    }
  };

  const isUrgentMessage = (content: string) => content.startsWith("!!!!");

  return (
    // Use StickToBottom component as the main container
    <StickToBottom
      className="flex-1 relative flex flex-col overflow-hidden bg-white border-2 border-gray-800 rounded mb-2 w-full h-full"
      // Optional props for smooth scrolling behavior
      resize="smooth"
      initial="smooth"
    >
      {/* StickToBottom.Content wraps the actual scrollable content */}
      <StickToBottom.Content className="flex flex-col gap-1 p-2">
        <AnimatePresence initial={false} mode="sync">
          {/* Keep the motion.div for layout animations if needed, but it's inside StickToBottom.Content now */}
          {/* The className might need adjustment as StickToBottom.Content handles flex/gap */}
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

            const variants = { initial: { opacity: 0 }, animate: { opacity: 1 } };
            let bgColorClass = "";
            if (message.role === "user") bgColorClass = "bg-yellow-100 text-black";
            else if (message.role === "assistant") bgColorClass = "bg-blue-100 text-black";
            else if (message.role === "human") bgColorClass = getUserColorClass(message.username);

            return (
              <motion.div
                layout="position"
                key={messageKey}
                variants={variants}
                initial={isInitialMessage ? "animate" : "initial"}
                animate="animate"
                transition={{ type: "spring", duration: 0.4 }}
                className={`flex flex-col z-10 w-full ${message.role === "user" ? "items-end" : "items-start"}`}
                style={{ transformOrigin: message.role === "user" ? "bottom right" : "bottom left" }}
                onMouseEnter={() => !isInteractingWithPreview && setHoveredMessageId(messageKey)}
                onMouseLeave={() => !isInteractingWithPreview && setHoveredMessageId(null)}
              >
                <motion.div layout="position" className="text-[16px] text-gray-500 mb-0.5 font-['Geneva-9'] mb-[-2px] select-text flex items-center gap-2">
                  {message.role === "user" && (
                    <>
                      {/* Trash button moved here for user messages */}
                      {isAdmin && isRoomView && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{
                            opacity: hoveredMessageId === messageKey ? 1 : 0,
                            scale: 1,
                          }}
                          className="h-3 w-3 text-gray-400 hover:text-red-600 transition-colors"
                          onClick={() => deleteMessage(message)}
                          aria-label="Delete message"
                        >
                          <Trash className="h-3 w-3" />
                        </motion.button>
                      )}
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                          opacity: hoveredMessageId === messageKey ? 1 : 0,
                          scale: 1,
                        }}
                        className="h-3 w-3 text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={() => copyMessage(message)}
                        aria-label="Copy message"
                      >
                        {copiedMessageId === messageKey ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </motion.button>
                    </>
                  )}
                  {message.username || (message.role === "user" ? "You" : "Ryo")}{" "}
                  <span className="text-gray-400 select-text">
                    {message.createdAt ? (
                      (() => {
                        const messageDate = new Date(message.createdAt);
                        const today = new Date();
                        const isBeforeToday = 
                          messageDate.getDate() !== today.getDate() ||
                          messageDate.getMonth() !== today.getMonth() ||
                          messageDate.getFullYear() !== today.getFullYear();
                        
                        return isBeforeToday 
                          ? messageDate.toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })
                          : messageDate.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            });
                      })()
                    ) : (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                  </span>
                  {message.role === "assistant" && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: hoveredMessageId === messageKey ? 1 : 0,
                        scale: 1,
                      }}
                      className="h-3 w-3 text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => copyMessage(message)}
                    >
                      {copiedMessageId === messageKey ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </motion.button>
                  )}
                  {/* Trash button removed from here for non-user messages, only show if NOT user message */}
                  {isAdmin && isRoomView && message.role !== 'user' && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: hoveredMessageId === messageKey ? 1 : 0,
                        scale: 1,
                      }}
                      className="h-3 w-3 text-gray-400 hover:text-red-600 transition-colors"
                      onClick={() => deleteMessage(message)}
                      aria-label="Delete message"
                    >
                      <Trash className="h-3 w-3" />
                    </motion.button>
                  )}
                </motion.div>

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
                    `w-fit max-w-[90%] p-1.5 px-2 ${bgColorClass || (message.role === "user" ? "bg-yellow-100 text-black" : "bg-blue-100 text-black")}`
                  } min-h-[12px] rounded leading-snug text-[12px] font-geneva-12 break-words select-text`}
                >
                  {message.role === "assistant" ? (
                    <motion.div className="select-text flex flex-col gap-1">
                      {message.parts?.map((part, partIndex) => {
                        const partKey = `${messageKey}-part-${partIndex}`;
                        switch (part.type) {
                          case "text": {
                            // Check for XML tags and their completeness (only relevant if text might contain them)
                            const hasXmlTags = /<textedit:(insert|replace|delete)/i.test(part.text);
                            if (hasXmlTags) {
                              const openTags = (part.text.match(/<textedit:(insert|replace|delete)/g) || []).length;
                              const closeTags = (part.text.match(/<\/textedit:(insert|replace)>|<textedit:delete[^>]*\/>/g) || []).length;
                              if (openTags !== closeTags) {
                                return (
                                  <motion.span key={partKey} initial={{ opacity: 1 }} animate={{ opacity: 1 }} transition={{ duration: 0 }} className="select-text italic">
                                    editing...
                                  </motion.span>
                                );
                              }
                            }

                            // Remove "!!!!" prefix and following space from urgent messages
                            const displayContent = isUrgentMessage(part.text) ? part.text.slice(4).trimStart() : part.text;

                            // Check for HTML content
                            const { hasHtml, htmlContent, textContent } = extractHtmlContent(displayContent);

                            return (
                              <div key={partKey} className="w-full"> {/* Wrap text content */}
                                {/* Show only non-HTML text content */}
                                {/* Trim textContent before segmenting */}
                                <div className="whitespace-pre-wrap">
                                {textContent && segmentText(textContent.trim()).map((segment, idx) => (
                                  <motion.span
                                    key={`${partKey}-segment-${idx}`} // More unique key
                                    initial={isInitialMessage ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`select-text ${isEmojiOnly(textContent) ? "text-[24px]" : ""} ${segment.type === "bold" ? "font-bold" : segment.type === "italic" ? "italic" : ""}`}
                                    style={{ userSelect: "text" }}
                                    transition={{
                                      duration: 0.15,
                                      delay: idx * 0.05,
                                      ease: "easeOut",
                                      onComplete: () => { if (idx % 2 === 0) { playNote(); } },
                                    }}
                                  >
                                    {segment.type === "link" && segment.url ? (
                                      <a href={segment.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                                        {segment.content}
                                      </a>
                                    ) : (
                                      segment.content
                                    )}
                                  </motion.span>
                                ))}
                                </div>
                                {/* Show HTML preview if there's HTML content */}
                                {hasHtml && htmlContent && (
                                  <HtmlPreview
                                    htmlContent={htmlContent}
                                    onInteractionChange={setIsInteractingWithPreview}
                                    isStreaming={isLoading && message === messages[messages.length - 1]}
                                    playElevatorMusic={playElevatorMusic}
                                    stopElevatorMusic={stopElevatorMusic}
                                    playDingSound={playDingSound}
                                    className="my-1"
                                  />
                                )}
                              </div>
                            );
                          }
                          case "tool-invocation": {
                            const { toolName, state } = part.toolInvocation;
                            // Access args safely
                            const args = state === 'result' || state === 'call' ? part.toolInvocation.args : undefined;
                            // Access result safely only when state is 'result'
                            const result = state === 'result' ? part.toolInvocation.result : undefined;

                            // --- Custom message for launchApp/closeApp --- 
                            let displayMessage = null;
                            if (state === 'result') {
                              if (toolName === 'launchApp' && args?.id === 'internet-explorer') {
                                const urlPart = args.url ? ` to ${args.url}` : '';
                                const yearPart = args.year && args.year !== 'current' ? ` in ${args.year}` : '';
                                displayMessage = `Launched Internet Explorer${urlPart}${yearPart}`;
                              } else if (toolName === 'launchApp') {
                                displayMessage = `Launched ${args?.id || 'app'}`;
                              } else if (toolName === 'closeApp') {
                                displayMessage = `Closed ${args?.id || 'app'}`;
                              }
                            }
                            // --- End custom message --- 

                            return (
                              <div key={partKey} className="my-1 p-1.5 bg-white/50 rounded text-xs italic">
                                {state === 'call' && (
                                  <div className="flex items-center gap-1 text-gray-700">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Calling <strong>{toolName}</strong>...</span>
                                    {/* Optionally display args: <pre className="text-xs overflow-auto">{JSON.stringify(args, null, 2)}</pre> */}
                                  </div>
                                )}
                                {state === 'result' && (
                                  <div className="flex items-start gap-1 text-gray-700">
                                    <Check className="h-3 w-3 text-blue-600" />
                                    {/* Use custom message if available, otherwise generic */} 
                                    {displayMessage ? (
                                      <span>{displayMessage}</span>
                                    ) : (
                                      <>
                                        <span>Tool <strong>{toolName}</strong> executed.</span>
                                        {/* Display simple result, adjust formatting as needed */}
                                        {typeof result === 'string' && result.length > 0 && result.length < 100 && (
                                          <span className="ml-1 text-gray-500 italic">Result: "{result}"</span>
                                        )}
                                      </>
                                    )}
                                    {/* Add more detailed result display if necessary */}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          // Add case for 'step-start' if you want visual separators between steps
                          // case 'step-start':
                          //   return partIndex > 0 ? <hr key={partKey} className="my-1 border-gray-200" /> : null;
                          default:
                            return null; // Or some fallback rendering
                        }
                      })}
                    </motion.div>
                  ) : (
                    <>
                      <span
                        className={`select-text whitespace-pre-wrap ${isEmojiOnly(message.content) ? "text-[24px]" : ""}`}
                        style={{ userSelect: "text" }}
                      >
                        {segmentText(message.content).map((segment, idx) => (
                          <span
                            key={`${messageKey}-segment-${idx}`} // More unique key
                            className={`
                              ${segment.type === "bold"
                                ? "font-bold"
                                : segment.type === "italic"
                                ? "italic"
                                : ""}
                            `}
                          >
                            {segment.type === "link" && segment.url ? (
                              <a
                                href={segment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                                onClick={(e) => e.stopPropagation()} // Prevent hover effects on parent
                              >
                                {segment.content}
                              </a>
                            ) : (
                              segment.content
                            )}
                          </span>
                        ))}
                      </span>
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
          {error && (
            <motion.div
              layout="position"
              key="error-indicator"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-red-600 font-['Geneva-9'] text-[16px] antialiased h-[12px] pl-1"
            >
              <AlertCircle className="h-3 w-3" />
              <span>{error.message}</span>
              {onRetry && (
                <Button size="sm" variant="link" onClick={onRetry} className="m-0 p-0 text-[16px] h-0 text-amber-600">
                  Try again
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </StickToBottom.Content>

      {/* Render the scroll-to-bottom button */}
      <ScrollToBottomButton />
    </StickToBottom>
  );
}
