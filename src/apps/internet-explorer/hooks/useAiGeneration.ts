import { useChat, type Message } from "ai/react";
import { useState, useEffect, useRef } from "react";
import { useInternetExplorerStore, DEFAULT_TIMELINE } from "@/stores/useInternetExplorerStore";

interface UseAiGenerationProps {
  onLoadingChange?: (isLoading: boolean) => void;
  customTimeline?: { [year: string]: string };
}

interface UseAiGenerationReturn {
  generateFuturisticWebsite: (url: string, year: string, forceRegenerate?: boolean, signal?: AbortSignal, prefetchedTitle?: string | null) => Promise<void>;
  aiGeneratedHtml: string | null;
  isAiLoading: boolean;
  stopGeneration: () => void;
}

export function useAiGeneration({ onLoadingChange, customTimeline = {} }: UseAiGenerationProps = {}): UseAiGenerationReturn {
  const [aiGeneratedHtml, setAiGeneratedHtml] = useState<string | null>(null);
  const currentGenerationId = useRef<string | null>(null);
  const isGenerationComplete = useRef<boolean>(false);
  
  // Use the Zustand store for caching and updating the store
  const cacheAiPage = useInternetExplorerStore(state => state.cacheAiPage);
  const getCachedAiPage = useInternetExplorerStore(state => state.getCachedAiPage);
  const loadSuccess = useInternetExplorerStore(state => state.loadSuccess);
  const timelineSettings = useInternetExplorerStore(state => state.timelineSettings);

  // Handler for when AI stream finishes
  const handleAiFinish = (message: Message) => {
    // Ensure this finish corresponds to the current generation request
    if (!currentGenerationId.current || isGenerationComplete.current) return;

    // Extract HTML content from the final message
    const htmlContent = message.content
      .replace(/^\s*```(?:html)?\s*\n?|\n?\s*```\s*$/g, "")
      .trim();

    // Extract title using regex
    const titleMatch = htmlContent.match(/^<!--\s*TITLE:\s*(.*?)\s*-->/);
    const parsedTitle = titleMatch ? titleMatch[1].trim() : null;

    // Remove the title comment from the HTML content itself
    const cleanHtmlContent = htmlContent.replace(/^<!--\s*TITLE:.*?-->\s*\n?/,'');

    // Mark generation as complete
    isGenerationComplete.current = true;

    // Find the corresponding user message to get URL and year
    const userMessage = aiMessages.find(m => m.role === 'user'); // Assuming one user message per generation
    if (userMessage) {
      const urlMatch = userMessage.content.match(/URL: (https?:\/\/[^\n]+)/);
      const yearMatch = userMessage.content.match(/It is the year (\d+)/);
      const domainMatch = userMessage.content.match(/Domain: ([^\n]+)/);

      if (urlMatch && yearMatch) {
        const [, url] = urlMatch;
        const [, year] = yearMatch;
        const fallbackTitle = domainMatch ? domainMatch[1] : url;
        const favicon = `https://www.google.com/s2/favicons?domain=${new URL(url.startsWith("http") ? url : `https://${url}`).hostname}&sz=32`;

        // Cache the completed HTML and title
        console.log(`[IE] Caching AI page for ${url} in ${year}`);
        cacheAiPage(url, year, cleanHtmlContent, parsedTitle || fallbackTitle);

        // Update the store with the final HTML, title, and history info
        loadSuccess({ 
          aiGeneratedHtml: cleanHtmlContent, 
          title: parsedTitle || fallbackTitle, 
          targetUrl: url, 
          targetYear: year, 
          favicon: favicon, 
          addToHistory: true 
        });

        console.log(`[IE] AI generation complete (onFinish), saved to cache and store`);
      } else {
        console.error("[IE] Could not extract URL/Year from user prompt in onFinish handler.");
        // Fallback: Update store with HTML but potentially missing title context
        loadSuccess({ aiGeneratedHtml: cleanHtmlContent });
      }
    } else {
       console.error("[IE] Could not find user prompt in onFinish handler.");
       // Fallback: Update store with HTML but potentially missing title context
       loadSuccess({ aiGeneratedHtml: cleanHtmlContent });
    }

    // Clear the generation ID now that it's processed
    // currentGenerationId.current = null; // Keep ID to prevent race conditions? Revisit if needed.
  };

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
    onFinish: handleAiFinish,
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
  const generateFuturisticWebsite = async (
    url: string, 
    year: string, 
    forceRegenerate = false, 
    signal?: AbortSignal,
    prefetchedTitle?: string | null
  ) => {
    // Generate a unique ID for this generation request
    const generationId = `${url}-${year}-${Date.now()}`;
    currentGenerationId.current = generationId;
    isGenerationComplete.current = false;
    
    // Check cache first unless force regenerating
    if (!forceRegenerate) {
      const cachedEntry = getCachedAiPage(url, year);
      if (cachedEntry) {
        console.log(`[IE] Using cached AI page for ${url} in ${year}`);
        setAiGeneratedHtml(cachedEntry.html);
        // Update the store directly when using cached content, including title and history info
        const favicon = `https://www.google.com/s2/favicons?domain=${new URL(url.startsWith("http") ? url : `https://${url}`).hostname}&sz=32`;
        loadSuccess({ 
          aiGeneratedHtml: cachedEntry.html, 
          title: cachedEntry.title || url, 
          targetUrl: url, 
          targetYear: year, 
          favicon: favicon, 
          addToHistory: true 
        });
        isGenerationComplete.current = true;
        return;
      } else {
        console.log(`[IE] No cached AI page found for ${url} in ${year}, generating new content`);
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

    // Get timeline context from store
    const getTimelineContext = (year: string): string => {
      // Check for custom timeline first
      if (customTimeline[year]) {
        return customTimeline[year];
      }

      // Fall back to store timeline settings
      if (timelineSettings[year]) {
        return timelineSettings[year];
      }

      // Fall back to default timeline
      return DEFAULT_TIMELINE[year] || "2020s: Current era. AI assistants. Smart devices. Electric vehicles. Renewable energy. Space tourism. Digital transformation. Remote work. Virtual reality. Genetic medicine.";
    };

    const timelineContext = getTimelineContext(year);
    
    // Create a more inspirational prompt for AI‑generated future designs
    const prompt = `
REDESIGN INSTRUCTIONS
${parseInt(year) > new Date().getFullYear() 
  ? "Redesign this website so it feels perfectly at home in this future era. Think boldly and creatively about future outcomes, embrace the original brand, language, cultural context, aesthetics, interface paradigms, and breakthroughs that could happen by then."
  : `Redesign this website to match the historical era of ${year}. Consider:
     - How this website would have been designed if it existed in ${year}
     - What technology and design tools would have been available
     - What typography, colors, and design elements were common
     - What cultural and artistic movements influenced design`
}
If you think the entity may disappear due to changes, show a 404 or memorial page.

DELIVERABLE
Return a single, fully self‑contained HTML document in markdown codeblock for this ${parseInt(year) > new Date().getFullYear() ? "speculative" : "historical"} design. MUST use TailwindCSS classes for styling. Can use inline \`<script>\` blocks when needed, but avoid external dependencies. Use Three.js for 3D with script already loaded. 

IMPORTANT: Include the generated page title inside an HTML comment at the very beginning of the HTML document, formatted EXACTLY like this: \`<!-- TITLE: Your Generated Page Title -->\`

REQUIREMENTS
1. DO NOT respond in any text except the html markdown codeblock.
2. Keep the layout responsive. Use emojis, or simple SVG icons. DO NOT use inline data:image base64 images. Import and use Google Fonts if needed. ${parseInt(year) > new Date().getFullYear() 
  ? "Keep visuals minimal but futuristic, use simple colors, avoid over using gradients."
  : `Use period-appropriate design elements:
     - Typography that matches the era (e.g., serif fonts for early periods, sans-serif for modern)
     - Color schemes that were available or popular in ${year}
     - Design patterns and layouts that reflect the time period
     - Historical imagery and decorative elements
     - Consider how the website would have been designed with the technology available in ${year}`
}
3. Use ${parseInt(year) > new Date().getFullYear() 
  ? "imaginative, crazy" 
  : "historically accurate and period-appropriate"} content.
4. Ensure the overall experience is visually striking yet still loads in a normal browser.
5. Output ONLY the raw HTML markup as the final answer.

CONTEXT
Below are details about the current website and the task:

- Domain: ${domainName}
- URL: ${url}
${existingContent ? `- A snapshot of the existing website's readable content (truncated to 4,000 characters) is provided between the fences below:\n"""\n${existingContent}\n"""\n` : ""}
${prefetchedTitle ? `- Known Title: ${prefetchedTitle}\n` : ""}

It is the year ${year}. Here is the timeline of human civilization leading up to this point:

${Object.entries({ ...DEFAULT_TIMELINE, ...timelineSettings, ...customTimeline })
  .filter(([y]) => parseInt(y) <= parseInt(year))
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .map(([y, desc]) => `${y}: ${desc}`)
  .join('\n')}

${timelineContext}`;

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

  // Effect to watch for AI responses and update the *streaming* UI preview
  useEffect(() => {
    // Only update the preview, final state is handled by onFinish
    if (aiMessages.length > 1) {
      const lastMessage = aiMessages[aiMessages.length - 1];
      if (lastMessage.role === "assistant") {
        const htmlContent = lastMessage.content
          .replace(/^\s*```(?:html)?\s*\n?|\n?\s*```\s*$/g, "")
          .trim();
        // Remove title comment for preview
        const cleanHtmlContent = htmlContent.replace(/^<!--\s*TITLE:.*?-->\s*\n?/,'');
        // Update local state for streaming display only
        setAiGeneratedHtml(cleanHtmlContent);
      }
    }
  }, [aiMessages]); // Only depends on messages for streaming updates

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