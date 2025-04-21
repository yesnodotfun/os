import { useChat } from "ai/react";
import { useState, useEffect, useRef } from "react";
import { useInternetExplorerStore } from "@/stores/useInternetExplorerStore";

interface UseAiGenerationProps {
  onLoadingChange?: (isLoading: boolean) => void;
}

interface UseAiGenerationReturn {
  generateFuturisticWebsite: (url: string, year: string, forceRegenerate?: boolean, signal?: AbortSignal) => Promise<void>;
  aiGeneratedHtml: string | null;
  isAiLoading: boolean;
  stopGeneration: () => void;
}

export function useAiGeneration({ onLoadingChange }: UseAiGenerationProps = {}): UseAiGenerationReturn {
  const [aiGeneratedHtml, setAiGeneratedHtml] = useState<string | null>(null);
  const currentGenerationId = useRef<string | null>(null);
  const isGenerationComplete = useRef<boolean>(false);
  
  // Use the Zustand store for caching and updating the store
  const cacheAiPage = useInternetExplorerStore(state => state.cacheAiPage);
  const getCachedAiPage = useInternetExplorerStore(state => state.getCachedAiPage);
  const loadSuccess = useInternetExplorerStore(state => state.loadSuccess);

  const {
    messages: aiMessages,
    append: appendAiMessage,
    isLoading: isAiLoading,
    setMessages: resetAiMessages,
    stop,
  } = useChat({
    initialMessages: [
      {
        id: "system",
        role: "system",
        content: "You are a web designer specialized in futuristic UI/UX designs.",
      },
    ],
  });

  // Helper to fetch existing website content (readability text via jina.ai)
  const fetchExistingWebsiteContent = async (targetUrl: string, signal?: AbortSignal): Promise<string | null> => {
    try {
      // Ensure we always have a protocol for encoding
      const normalized = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;
      // jina.ai provides readable text extraction with permissive CORS
      // Format: https://r.jina.ai/http://example.com/path
      const jinaEndpoint = `https://r.jina.ai/http://${normalized.replace(/^https?:\/\//, "")}`;

      const res = await fetch(jinaEndpoint, { signal });
      if (!res.ok) return null;
      const text = await res.text();
      // Return a trimmed version to avoid blowing up the prompt size (max 4k chars)
      return text.slice(0, 4000);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Fetch operation was aborted');
        return null;
      }
      console.warn("Failed to fetch existing website content:", err);
      return null;
    }
  };

  // Function to generate futuristic website content using AI
  const generateFuturisticWebsite = async (url: string, year: string, forceRegenerate = false, signal?: AbortSignal) => {
    // Generate a unique ID for this generation request
    const generationId = `${url}-${year}-${Date.now()}`;
    currentGenerationId.current = generationId;
    isGenerationComplete.current = false;
    
    // Check cache first unless force regenerating
    if (!forceRegenerate) {
      const cachedHtml = getCachedAiPage(url, year);
      if (cachedHtml) {
        setAiGeneratedHtml(cachedHtml);
        // Update the store directly when using cached content
        loadSuccess(undefined, cachedHtml);
        isGenerationComplete.current = true;
        return;
      }
    }

    // Clear any existing AI-generated content
    setAiGeneratedHtml(null);
    
    // Reset previous AI messages to start a fresh conversation
    resetAiMessages([
      {
        id: "system",
        role: "system",
        content: "You are a web designer specialized in turning present websites into futuristic versions in story and design.",
      },
    ]);
    
    // Check if the operation was aborted before proceeding
    if (signal?.aborted) {
      return;
    }
    
    // Extract domain name for better prompt
    const domainName = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    
    // Attempt to fetch existing website content (best-effort)
    const existingContent = await fetchExistingWebsiteContent(url, signal);
    
    // Check if the operation was aborted after fetching content
    if (signal?.aborted || currentGenerationId.current !== generationId) {
      return;
    }
    
    // Create a more inspirational prompt for AI‑generated future designs
    const prompt = `
Below are details about the current website and the task:

- Domain: ${domainName}
- URL: ${url}
${existingContent ? `- A snapshot of the existing website's readable content (truncated to 4,000 characters) is provided between the fences below:\n"""\n${existingContent}\n"""\n` : ""}

It is the year ${year}. Redesign this website so it feels perfectly at home in this era. Think boldly and creatively about future outcomes (don't always reference neural quantum etc, be more surprising), embrace the original brand, language, cultural context, aesthetics, interface paradigms, and breakthroughs that could happen by then.
If you think the entity may disappear due to changes, show a 404 or memorial page.

DELIVERABLE
Return a single, fully self‑contained HTML document in markdown codeblock for this speculative design. Use TailwindCSS classes for styling and add inline \`<style>\` or \`<script>\` blocks when needed, but avoid external dependencies.

REQUIREMENTS
1. DO NOT respond in any text except the html markdown codeblock.
2. Keep the layout responsive and accessible (screen‑reader friendly, respect reduced‑motion preferences, etc.).
3. Use imaginative, crazy content. Keep visuals minimal but futuristic, use simple colors, avoid crazy gradients. Use emojis, or simple SVG icons.
4. Ensure the overall experience is visually striking yet still loads in a normal browser.
5. Output ONLY the raw HTML markup as the final answer.`;

    try {
      // Final check if operation was aborted before sending to AI
      if (signal?.aborted || currentGenerationId.current !== generationId) {
        return;
      }
      
      // Send message to AI - the response will be handled by the useEffect
      await appendAiMessage({ role: "user", content: prompt });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('AI generation was aborted');
        return;
      }
      console.error("Failed to generate futuristic website:", error);
      throw new Error("Failed to generate futuristic website preview");
    }
  };

  // Effect to watch for AI responses and update the UI accordingly
  useEffect(() => {
    // Always check the latest message for updates
    if (aiMessages.length > 1) {
      const lastMessage = aiMessages[aiMessages.length - 1];
      if (lastMessage.role === "assistant") {
        // Extract HTML content from the response (remove markdown code blocks if present)
        const htmlContent = lastMessage.content
          // Use a more robust regex to remove fences and optional language tag, including surrounding whitespace/newlines
          .replace(/^\s*```(?:html)?\s*\n?|\n?\s*```\s*$/g, "")
          .trim();

        // Update local state for streaming display
        setAiGeneratedHtml(htmlContent);

        // Only save to cache and update store when generation is complete
        if (!isAiLoading && !isGenerationComplete.current) {
          isGenerationComplete.current = true;
          
          // Get the user message to extract URL and year
          if (aiMessages.length >= 2) {
            const userMessage = aiMessages[aiMessages.length - 2];
            if (userMessage.role === "user") {
              // Extract URL and year from the prompt
              const urlMatch = userMessage.content.match(/URL: (https?:\/\/[^\n]+)/);
              const yearMatch = userMessage.content.match(/It is the year (\d+)/);
              
              if (urlMatch && yearMatch) {
                const [, url] = urlMatch;
                const [, year] = yearMatch;
                
                // Cache the completed HTML
                cacheAiPage(url, year, htmlContent);
                
                // Update the store with the final HTML
                loadSuccess(undefined, htmlContent);
                
                console.log("[IE] AI generation complete, saved to cache and store");
              }
            }
          }
        }
      }
    }
  }, [aiMessages, isAiLoading, cacheAiPage, loadSuccess]);

  // Effect to notify parent of loading state changes
  useEffect(() => {
    onLoadingChange?.(isAiLoading);
  }, [isAiLoading, onLoadingChange]);

  return {
    generateFuturisticWebsite,
    aiGeneratedHtml,
    isAiLoading,
    stopGeneration: () => {
      stop();
      // Reset current generation ID to prevent further processing
      currentGenerationId.current = null;
    },
  };
} 