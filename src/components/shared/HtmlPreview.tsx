import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize, Minimize, Copy, Check, Save } from "lucide-react";
import { createPortal } from "react-dom";

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
}

export default function HtmlPreview({
  htmlContent,
  onInteractionChange,
  isStreaming = false,
  maxHeight = "800px",
  minHeight = "250px",
  initialFullScreen = false,
  className = "",
}: HtmlPreviewProps) {
  const [isFullScreen, setIsFullScreen] = useState(initialFullScreen);
  const [copySuccess, setCopySuccess] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const iframeId = useRef(
    `iframe-${Math.random().toString(36).substring(2, 9)}`
  ).current;

  // Add font stack and base styling to HTML content
  const processedHtmlContent = (() => {
    // Check if content already has complete HTML structure
    if (
      htmlContent.includes("<!DOCTYPE html>") ||
      htmlContent.includes("<html")
    ) {
      // For complete HTML, inject the canvas ID script
      const hasCanvas = htmlContent.includes("<canvas");
      const scriptToInject = hasCanvas
        ? `
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          const canvasElements = document.querySelectorAll('canvas');
          const isFullscreen = window.name === 'fullscreen';
          canvasElements.forEach((canvas, index) => {
            const originalId = canvas.id || \`canvas-\${index}\`;
            canvas.id = isFullscreen ? \`fullscreen-\${originalId}\` : originalId;
          });
        });
      </script>`
        : "";

      // Insert the script before the closing </head> tag
      return htmlContent.replace("</head>", `${scriptToInject}</head>`);
    }

    // Check if the content contains canvas elements
    const hasCanvas = htmlContent.includes("<canvas");
    const canvasScript = hasCanvas
      ? `
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        const canvasElements = document.querySelectorAll('canvas');
        const isFullscreen = window.name === 'fullscreen';
        canvasElements.forEach((canvas, index) => {
          const originalId = canvas.id || \`canvas-\${index}\`;
          canvas.id = isFullscreen ? \`fullscreen-\${originalId}\` : originalId;
        });
      });
    </script>`
      : "";

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
  ${canvasScript}
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

  // Normal inline display with optional maximized height
  return (
    <>
      <motion.div
        ref={previewRef}
        className={`rounded bg-white/100 overflow-auto my-2 relative ${className}`}
        style={{
          maxHeight: isFullScreen ? "0" : maxHeight,
          pointerEvents: isStreaming ? "none" : "auto",
          opacity: isFullScreen ? 0 : 1,
          height: isFullScreen ? "0" : "auto",
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
      {isFullScreen &&
        createPortal(
          <AnimatePresence>
            <motion.div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFullScreen(false)}
            >
              <div className="absolute top-4 right-4 flex items-center bg-black/40 backdrop-blur-sm rounded-md px-2 py-1 z-10">
                <button
                  onClick={handleSaveToDisk}
                  className="flex items-center justify-center w-8 h-8 hover:bg-white/10 rounded mr-2 group"
                  aria-label="Save HTML to disk"
                >
                  <Save
                    size={20}
                    className="text-white/70 group-hover:text-white"
                  />
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center w-8 h-8 hover:bg-white/10 rounded mr-2 group"
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
                  className="flex items-center justify-center w-8 h-8 hover:bg-white/10 rounded group"
                  aria-label="Exit fullscreen"
                >
                  <Minimize
                    size={20}
                    className="text-white/70 group-hover:text-white"
                  />
                </button>
              </div>
              <motion.iframe
                id={`fullscreen-${iframeId}`}
                name="fullscreen"
                srcDoc={processedHtmlContent}
                title="HTML Preview Fullscreen"
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
