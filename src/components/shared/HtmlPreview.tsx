import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize, Minimize, Copy, Check, Save, Code } from "lucide-react";
import { createPortal } from "react-dom";
import * as shiki from "shiki";

// Create a singleton highlighter instance
let highlighterPromise: Promise<shiki.Highlighter> | null = null;

const getHighlighterInstance = () => {
  if (!highlighterPromise) {
    highlighterPromise = shiki.createHighlighter({
      themes: ["github-dark"],
      langs: ["html"],
    });
  }
  return highlighterPromise;
};

// Check if a string is a HTML code block
export const isHtmlCodeBlock = (
  text: string
): { isHtml: boolean; content: string } => {
  // Check for markdown code blocks with html tag
  const codeBlockRegex = /```(?:html)?\s*([\s\S]*?)```/;
  const match = text.match(codeBlockRegex);

  if (match && match[1]) {
    const content = match[1].trim();
    // Check if content appears to be HTML (starts with a tag or has HTML elements)
    if (content.startsWith("<") || /<\/?[a-z][\s\S]*>/i.test(content)) {
      return { isHtml: true, content };
    }
  }

  // Also check for HTML content outside of code blocks
  const trimmedText = text.trim();
  if (
    trimmedText.startsWith("<") &&
    (/<\/[a-z][^>]*>/i.test(trimmedText) || // Has a closing tag
      /<[a-z][^>]*\/>/i.test(trimmedText) || // Has a self-closing tag
      trimmedText.includes("<style>") ||
      trimmedText.includes("<div>") ||
      trimmedText.includes("<span>"))
  ) {
    return { isHtml: true, content: trimmedText };
  }

  return { isHtml: false, content: "" };
};

// Extract HTML content even if the code block is incomplete/being streamed
export const extractHtmlContent = (
  text: string
): {
  htmlContent: string;
  textContent: string;
  hasHtml: boolean;
} => {
  // Check for complete HTML code blocks
  const completeRegex = /```(?:html)?\s*([\s\S]*?)```/g;
  let processedText = text;
  const htmlParts: string[] = [];
  let match;
  let hasHtml = false;

  // First check for complete HTML blocks
  while ((match = completeRegex.exec(text)) !== null) {
    const content = match[1].trim();
    if (
      content &&
      (content.startsWith("<") || /<\/?[a-z][\s\S]*>/i.test(content))
    ) {
      htmlParts.push(content);
      hasHtml = true;
      // Remove complete HTML blocks from text
      processedText = processedText.replace(match[0], "");
    }
  }

  // Then check for incomplete HTML blocks that are still streaming
  const incompleteRegex = /```(?:html)?\s*([\s\S]*?)$/;
  const incompleteMatch = processedText.match(incompleteRegex);

  if (
    incompleteMatch &&
    incompleteMatch[1] &&
    (incompleteMatch[1].trim().startsWith("<") ||
      /<\/?[a-z][\s\S]*>/i.test(incompleteMatch[1].trim()))
  ) {
    htmlParts.push(incompleteMatch[1].trim());
    hasHtml = true;
    // Remove incomplete HTML block from text
    processedText = processedText.replace(incompleteMatch[0], "");
  }

  // Check for standalone HTML content outside of code blocks
  const trimmedText = processedText.trim();
  if (
    !hasHtml &&
    trimmedText.startsWith("<") &&
    (/<\/[a-z][^>]*>/i.test(trimmedText) || // Has a closing tag
      /<[a-z][^>]*\/>/i.test(trimmedText) || // Has a self-closing tag
      trimmedText.includes("<style>") ||
      trimmedText.includes("<div>") ||
      trimmedText.includes("<span>"))
  ) {
    htmlParts.push(trimmedText);
    hasHtml = true;
    processedText = "";
  }

  // Join all HTML parts
  const htmlContent = htmlParts.join("\n\n");

  return {
    htmlContent,
    textContent: processedText,
    hasHtml,
  };
};

// Component to render HTML previews
interface HtmlPreviewProps {
  htmlContent: string;
  onInteractionChange?: (isInteracting: boolean) => void;
  isStreaming?: boolean;
  maxHeight?: number | string;
  minHeight?: number | string;
  initialFullScreen?: boolean;
  className?: string;
  playElevatorMusic?: () => void;
  stopElevatorMusic?: () => void;
  playDingSound?: () => void;
}

export default function HtmlPreview({
  htmlContent,
  onInteractionChange,
  isStreaming = false,
  maxHeight = "800px",
  minHeight = "200px",
  initialFullScreen = false,
  className = "",
  playElevatorMusic,
  stopElevatorMusic,
  playDingSound,
}: HtmlPreviewProps) {
  const [isFullScreen, setIsFullScreen] = useState(initialFullScreen);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);
  const iframeId = useRef(
    `iframe-${Math.random().toString(36).substring(2, 9)}`
  ).current;
  const prevStreamingRef = useRef(isStreaming);

  // Add font stack and base styling to HTML content
  const processedHtmlContent = (() => {
    // Check if content already has complete HTML structure
    if (
      htmlContent.includes("<!DOCTYPE html>") ||
      htmlContent.includes("<html")
    ) {
      // For complete HTML, no need for any injection
      return htmlContent;
    }

    // Wrap with proper HTML tags
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      font-size: 12px;
      line-height: 1.35;
      overflow-x: auto;
      width: 100%;
      height: 100%;
      max-width: 100%;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
  })();

  // Initialize syntax highlighting only when code view is active
  useEffect(() => {
    let isMounted = true;

    const highlight = async () => {
      try {
        const highlighter = await getHighlighterInstance();
        if (isMounted) {
          const highlighted = highlighter.codeToHtml(processedHtmlContent, {
            lang: "html",
            theme: "github-dark",
          });
          setHighlightedCode(highlighted);
        }
      } catch (error) {
        console.error("Failed to highlight code:", error);
      }
    };

    // Only initialize Shiki and highlight code when code view is active
    if (showCode && !highlightedCode) {
      highlight();
    }

    return () => {
      isMounted = false;
    };
  }, [processedHtmlContent, showCode, highlightedCode]);

  // Play elevator music when streaming starts, stop when streaming ends
  useEffect(() => {
    if (isStreaming && playElevatorMusic) {
      playElevatorMusic();
    } else if (prevStreamingRef.current && !isStreaming) {
      // If we were streaming but now we're not, stop music and play ding
      if (stopElevatorMusic) {
        stopElevatorMusic();
      }
      if (playDingSound) {
        playDingSound();
      }
    }

    prevStreamingRef.current = isStreaming;

    // Clean up on unmount
    return () => {
      if (stopElevatorMusic) {
        stopElevatorMusic();
      }
    };
  }, [isStreaming, playElevatorMusic, stopElevatorMusic, playDingSound]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(processedHtmlContent);
      setCopySuccess(true);

      // Reset after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleSaveToDisk = (e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([processedHtmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .substring(0, 19);
    a.href = url;
    a.download = `html-output-${timestamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Normal inline display with optional maximized height
  return (
    <>
      <motion.div
        ref={previewRef}
        className={`rounded bg-white/100 overflow-auto m-0 relative ${className}`}
        style={{
          maxHeight: isFullScreen ? "0" : maxHeight,
          pointerEvents: isStreaming ? "none" : "auto",
          opacity: isFullScreen ? 0 : 1,
          height: isFullScreen ? "0" : "auto",
          boxShadow: "inset 0 0 1px rgba(0, 0, 0, 0.3)",
        }}
        animate={{
          opacity: isStreaming ? [0.6, 0.8, 0.6] : isFullScreen ? 0 : 1,
        }}
        transition={{
          opacity: {
            duration: 2.5,
            repeat: isStreaming ? Infinity : 0,
            ease: "easeInOut",
          },
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={() => !isStreaming && onInteractionChange?.(true)}
        onMouseLeave={() => !isStreaming && onInteractionChange?.(false)}
        tabIndex={-1}
      >
        <motion.div
          className="flex justify-end p-1 absolute top-2 right-4 z-20"
          animate={{
            opacity: isStreaming ? 0 : 1,
          }}
          transition={{
            duration: 0.3,
          }}
          style={{
            pointerEvents: isStreaming ? "none" : "auto",
          }}
        >
          <button
            onClick={handleSaveToDisk}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-6 h-6 hover:bg-black/10 rounded mr-1 group"
            aria-label="Save HTML to disk"
            disabled={isStreaming}
          >
            <Save
              size={16}
              className="text-neutral-400/50 group-hover:text-neutral-300"
            />
          </button>
          <button
            onClick={handleCopy}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-6 h-6 hover:bg-black/10 rounded mr-1 group"
            aria-label="Copy HTML code"
            disabled={isStreaming}
          >
            {copySuccess ? (
              <Check
                size={16}
                className="text-neutral-400/50 group-hover:text-neutral-300"
              />
            ) : (
              <Copy
                size={16}
                className="text-neutral-400/50 group-hover:text-neutral-300"
              />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFullScreen(!isFullScreen);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-6 h-6 hover:bg-black/10 rounded group"
            aria-label={isFullScreen ? "Minimize preview" : "Maximize preview"}
            disabled={isStreaming}
          >
            {isFullScreen ? (
              <Minimize
                size={16}
                className="text-neutral-400/50 group-hover:text-neutral-300"
              />
            ) : (
              <Maximize
                size={16}
                className="text-neutral-400/50 group-hover:text-neutral-300"
              />
            )}
          </button>
        </motion.div>
        <motion.iframe
          key="preview"
          id={iframeId}
          srcDoc={processedHtmlContent}
          title="HTML Preview"
          className="w-full h-full border-0"
          sandbox="allow-scripts"
          style={{
            height:
              typeof minHeight === "string" ? minHeight : `${minHeight}px`,
            display: "block",
            pointerEvents: isStreaming ? "none" : "auto",
          }}
          animate={{
            opacity: isStreaming ? [0.6, 0.8, 0.6] : 1,
          }}
          transition={{
            opacity: {
              duration: 2.5,
              repeat: isStreaming ? Infinity : 0,
              ease: "easeInOut",
            },
          }}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </motion.div>

      {/* Fullscreen overlay */}
      {createPortal(
        <AnimatePresence mode="wait">
          {isFullScreen && (
            <motion.div
              className="fixed inset-0 bg-black/80 z-[9999] flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsFullScreen(false)}
            >
              <motion.div
                className="absolute inset-0 flex flex-col"
                initial={{
                  position: "fixed",
                  top: previewRef.current?.getBoundingClientRect().top ?? 0,
                  left: previewRef.current?.getBoundingClientRect().left ?? 0,
                  width: previewRef.current?.getBoundingClientRect().width ?? 0,
                  height:
                    previewRef.current?.getBoundingClientRect().height ?? 0,
                }}
                animate={{
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                }}
                exit={{
                  position: "fixed",
                  top: previewRef.current?.getBoundingClientRect().top ?? 0,
                  left: previewRef.current?.getBoundingClientRect().left ?? 0,
                  width: previewRef.current?.getBoundingClientRect().width ?? 0,
                  height:
                    previewRef.current?.getBoundingClientRect().height ?? 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              >
                <div className="absolute top-4 right-4 flex items-center bg-black/40 backdrop-blur-sm rounded-full px-2 py-1 z-10">
                  {showCode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSplitView(!isSplitView);
                      }}
                      className="flex items-center justify-center px-2 h-8 hover:bg-white/10 rounded-full mr-2 group text-sm font-geneva-12"
                      aria-label="Toggle split view"
                    >
                      <span className="text-white/70 group-hover:text-white">
                        {isSplitView ? "Full" : "Split"}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (showCode && !isSplitView) {
                        setIsSplitView(true);
                      } else {
                        setShowCode(!showCode);
                        setIsSplitView(false);
                      }
                    }}
                    className="flex items-center justify-center w-8 h-8 hover:bg-white/10 rounded-full mr-2 group"
                    aria-label="Toggle code view"
                  >
                    <Code
                      size={20}
                      className="text-white/70 group-hover:text-white"
                    />
                  </button>
                  <button
                    onClick={handleSaveToDisk}
                    className="flex items-center justify-center w-8 h-8 hover:bg-white/10 rounded-full mr-2 group"
                    aria-label="Save HTML to disk"
                  >
                    <Save
                      size={20}
                      className="text-white/70 group-hover:text-white"
                    />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center w-8 h-8 hover:bg-white/10 rounded-full mr-2 group"
                    aria-label="Copy HTML code"
                  >
                    {copySuccess ? (
                      <Check
                        size={20}
                        className="text-white/70 group-hover:text-white"
                      />
                    ) : (
                      <Copy
                        size={20}
                        className="text-white/70 group-hover:text-white"
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setIsFullScreen(false)}
                    className="flex items-center justify-center w-8 h-8 hover:bg-white/10 rounded-full group"
                    aria-label="Exit fullscreen"
                  >
                    <Minimize
                      size={20}
                      className="text-white/70 group-hover:text-white"
                    />
                  </button>
                </div>
                <AnimatePresence mode="wait">
                  <div
                    className={`relative w-full h-full ${
                      isSplitView ? "flex" : ""
                    }`}
                  >
                    {showCode && (
                      <motion.div
                        key="code"
                        className={`${
                          isSplitView ? "w-1/2" : "absolute inset-0"
                        } bg-[#24292e] overflow-auto p-4`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: "12px" }}
                        dangerouslySetInnerHTML={{ __html: highlightedCode }}
                      />
                    )}
                    <motion.iframe
                      key="preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      id={`fullscreen-${iframeId}`}
                      srcDoc={processedHtmlContent}
                      title="HTML Preview Fullscreen"
                      className={`border-0 bg-white ${
                        isSplitView ? "w-1/2" : "w-full h-full"
                      }`}
                      sandbox="allow-scripts"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
