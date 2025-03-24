import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Maximize, Minimize, Copy, Check, Save } from "lucide-react";

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
  containerRef?: React.RefObject<HTMLElement>;
  maxHeight?: number | string;
  minHeight?: number | string;
  initialFullScreen?: boolean;
  className?: string;
  windowSize?: { width: number; height: number };
}

export default function HtmlPreview({
  htmlContent,
  onInteractionChange,
  isStreaming = false,
  containerRef,
  maxHeight = "800px",
  minHeight = "250px",
  initialFullScreen = false,
  className = "",
  windowSize,
}: HtmlPreviewProps) {
  const [isFullScreen, setIsFullScreen] = useState(initialFullScreen);
  const [copySuccess, setCopySuccess] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Add font stack and base styling to HTML content
  const processedHtmlContent = (() => {
    // Check if content already has complete HTML structure
    if (
      htmlContent.includes("<!DOCTYPE html>") ||
      htmlContent.includes("<html")
    ) {
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

  // Calculate content height for fullscreen mode
  const contentHeight = windowSize ? windowSize.height - 30 : 800; // Default to 800 if no windowSize prop

  // Function to scroll to the preview's top edge
  const scrollToPreview = () => {
    if (previewRef.current && containerRef?.current) {
      const previewRect = previewRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const scrollOffset =
        previewRect.top -
        containerRect.top +
        containerRef.current.scrollTop -
        8; // 8px for padding
      containerRef.current.scrollTo({
        top: scrollOffset,
        behavior: "smooth",
      });
    }
  };

  // Add interactivity handlers
  useEffect(() => {
    if (isFullScreen && containerRef?.current) {
      // Scroll to preview when maximizing
      setTimeout(scrollToPreview, 50);
    }
  }, [isFullScreen]);

  // Normal inline display with optional maximized height
  return (
    <motion.div
      ref={previewRef}
      className={`border rounded bg-white/100 overflow-auto my-2 relative ${className}`}
      style={{
        maxHeight: isFullScreen
          ? typeof contentHeight === "number"
            ? `${contentHeight}px`
            : contentHeight
          : maxHeight,
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
            // Scroll to preview when maximizing
            if (!isFullScreen && containerRef) {
              setTimeout(scrollToPreview, 50);
            }
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
        srcDoc={processedHtmlContent}
        title="HTML Preview"
        className="w-full h-full border-0"
        sandbox="allow-scripts"
        style={{
          height: isFullScreen
            ? `${
                (typeof contentHeight === "number" ? contentHeight : 800) - 40
              }px`
            : typeof minHeight === "string"
            ? minHeight
            : `${minHeight}px`,
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
  );
}
