import { useEffect, useRef, useState, useCallback } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { Input } from "@/components/ui/input";
import { InternetExplorerMenuBar } from "./InternetExplorerMenuBar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { InputDialog } from "@/components/dialogs/InputDialog";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { helpItems, appMetadata } from "..";
import HtmlPreview from "@/components/shared/HtmlPreview";
import { motion, AnimatePresence } from "framer-motion";
import { useAiGeneration } from "../hooks/useAiGeneration";
import { useInternetExplorerStore, DEFAULT_FAVORITES } from "@/stores/useInternetExplorerStore";
import FutureSettingsDialog from "@/components/dialogs/FutureSettingsDialog";

// Define type for iframe check response
interface IframeCheckResponse {
  allowed: boolean;
  reason?: string;
  title?: string;
}

export function InternetExplorerAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  // State for reset favorites dialog
  const [isResetFavoritesDialogOpen, setResetFavoritesDialogOpen] = useState(false);

  // State to hold title prefetched during iframe-check
  const [prefetchedTitle, setPrefetchedTitle] = useState<string | null>(null);

  // --- Store Selectors/Actions (Destructure them here for stability in callbacks) ---
  const { 
    setUrl, navigateStart, setFinalUrl, loadSuccess, loadError, cancel, 
    addFavorite, clearFavorites, setHistoryIndex, clearHistory, 
    updateBrowserState, setTitleDialogOpen, setNewFavoriteTitle, setHelpDialogOpen, 
    setAboutDialogOpen, setNavigatingHistory, setClearFavoritesDialogOpen, 
    setClearHistoryDialogOpen, url, year, mode, token, favorites, history, historyIndex, 
    isTitleDialogOpen, newFavoriteTitle, isHelpDialogOpen, isAboutDialogOpen, 
    isNavigatingHistory, isClearFavoritesDialogOpen, isClearHistoryDialogOpen, currentPageTitle,
    timelineSettings, status, finalUrl, aiGeneratedHtml, error,
    getCachedAiPage
  } = useInternetExplorerStore();

  // Unified AbortController for cancellations
  const abortControllerRef = useRef<AbortController | null>(null);

  // State to track scroll in the favorites bar
  const [hasMoreToScroll, setHasMoreToScroll] = useState(false);

  const urlInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const favoritesContainerRef = useRef<HTMLDivElement>(null);

  // State for future settings dialog
  const [isFutureSettingsDialogOpen, setFutureSettingsDialogOpen] = useState(false);

  // AI generation hook with custom timeline from store
  const { 
    generateFuturisticWebsite, 
    aiGeneratedHtml: generatedHtml, // Renamed to avoid conflict with store state 
    isAiLoading, 
    stopGeneration 
  } = useAiGeneration({ 
    onLoadingChange: () => {}, // No need for separate loading state here 
    customTimeline: timelineSettings 
  });

  // Create past years array (from 1996 to current year)
  const pastYears = [
    // Historical centuries
    "1000 BC", "1 CE", "500", "800", "1000", "1200", "1400", "1600", "1700", "1800", "1900",
    // Early 20th century decades
    "1910", "1920", "1930", "1940", "1950", "1960", "1970", "1980", "1990",
    // Modern years
    ...Array.from(
      { length: new Date().getFullYear() - 1991 + 1 },
      (_, i) => (1991 + i).toString()
    )
  ].reverse(); // Reverse to get newest to oldest

  // Create a richer set of future years – covering near, mid, and far future
  const futureYears = [
    // Near‑future (every decade up to 2100)
    ...Array.from({ length: 8 }, (_, i) => (2030 + i * 10).toString()), // 2030 → 2100
    // Mid & far‑future milestones
    "2150", "2200", "2250", "2300", "2400", "2500", "2750", "3000"
  ].sort((a, b) => parseInt(b) - parseInt(a)); // Newest (largest) first

  // --- Callback Handlers ---

  // Helper function to get Wayback URL (can remain outside useCallback)
  const getWaybackUrl = async (targetUrl: string, year: string) => {
    if (year === "current") return targetUrl;

    // Get current month
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    // Format URL properly
    const formattedUrl = targetUrl.startsWith("http")
      ? targetUrl
      : `https://${targetUrl}`;

    // Directly construct the Wayback URL without CDX check
    console.log(`[IE] Using Wayback Machine URL for ${formattedUrl} in ${year}`);
    return `/api/iframe-check?url=${encodeURIComponent(formattedUrl)}&year=${year}&month=${month}`;
  };
  
  // Handler for iframe load (keep outside useCallback for now, depends on refs)
  const handleIframeLoad = () => {
    // Only update if the iframe has a data-token attribute matching the current navigation token
    if (iframeRef.current && iframeRef.current.dataset.navToken === token.toString()) {
      // Introduce a tiny delay to ensure the loading state renders reliably
      setTimeout(() => {
        // Check token again inside timeout in case another navigation started very quickly
        if (iframeRef.current && iframeRef.current.dataset.navToken === token.toString()) {
          
          let loadedTitle: string | null = null;
          // Use the potentially updated URL from state
          const fallbackTitle = url ? new URL(url.startsWith("http") ? url : `https://${url}`).hostname : "Internet Explorer";

          // 1. Prioritize the prefetched title if it exists
          if (prefetchedTitle) {
              loadedTitle = prefetchedTitle;
          } else {
            // 2. If no prefetched title, try reading from iframe document (might fail)
            try {
              loadedTitle = iframeRef.current?.contentDocument?.title || null;
              // Decode potential entities in title
              if (loadedTitle) {
                const txt = document.createElement("textarea");
                txt.innerHTML = loadedTitle;
                loadedTitle = txt.value.trim();
              }
            } catch (e) {
              console.warn("[IE] Failed to read iframe document title directly:", e);
            }

            // 3. If still no title and proxied, try reading the injected meta tag
            if (!loadedTitle && finalUrl?.startsWith('/api/iframe-check')) {
              try {
                const metaTitle = iframeRef.current?.contentDocument?.querySelector('meta[name="page-title"]')?.getAttribute('content');
                if (metaTitle) {
                  loadedTitle = decodeURIComponent(metaTitle); // Decode the title from meta tag
                }
              } catch (e) {
                console.warn("[IE] Failed to read page-title meta tag:", e);
              }
            }
          }
          
          // Call loadSuccess, updating the title if found, otherwise use fallback
          // Also pass history data using current URL and year state
          const favicon = `https://www.google.com/s2/favicons?domain=${new URL(url.startsWith("http") ? url : `https://${url}`).hostname}&sz=32`;
          loadSuccess({ 
            title: loadedTitle || fallbackTitle, 
            targetUrl: url, 
            targetYear: year, 
            favicon: favicon, 
            addToHistory: !isNavigatingHistory // Don't add history if we are navigating back/forward
          });

          // Reset prefetched title after using it (or attempting to)
          setPrefetchedTitle(null);
        }
      }, 50); // 50ms should be imperceptible but enough for rendering
    }
  };

  // Handler for iframe error (keep outside useCallback for now, depends on refs)
  const handleIframeError = () => {
    // Only update if the iframe has a data-token attribute matching the current navigation token
    if (iframeRef.current && iframeRef.current.dataset.navToken === token.toString()) {
      // Introduce a tiny delay
      setTimeout(() => {
        // Check token again inside timeout
        if (iframeRef.current && iframeRef.current.dataset.navToken === token.toString()) {
          // Use potentially updated finalUrl and url from state
          loadError(`Cannot access ${finalUrl || url}. The website might be blocking access or requires authentication.`);
        }
      }, 50); // 50ms delay
    }
  };

  // Main navigation handler (wrapped in useCallback)
  const handleNavigate = useCallback(async (
    targetUrl: string = url,
    targetYear: string = year,
    forceRegenerate = false
  ) => {
    // Cancel any ongoing navigation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller for this navigation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Stop any AI generation in progress
    if (isAiLoading) {
      stopGeneration();
    }
    
    // Reset iframe if needed to stop any loading
    if (iframeRef.current && status === 'loading') {
      iframeRef.current.src = 'about:blank';
    }

    // Determine navigation mode based on year
    const newMode = targetYear === "current" 
      ? "now" 
      : parseInt(targetYear) > new Date().getFullYear() 
        ? "future" 
        : "past";
    
    // Generate a new navigation token
    const newToken = Date.now();
    
    // Update navigation state to start loading
    navigateStart(targetUrl, targetYear, newMode, newToken);
    // Reset prefetched title for the new navigation
    setPrefetchedTitle(null);

    // Format URL properly
    const normalizedTargetUrl = targetUrl.startsWith("http")
      ? targetUrl
      : `https://${targetUrl}`;

    try {
      // Handle navigation based on mode
      if (newMode === "future" || (newMode === "past" && parseInt(targetYear) <= 1995)) {
        // For future years or years 1995 and older, generate AI content
        await generateFuturisticWebsite(
          normalizedTargetUrl, 
          targetYear, 
          forceRegenerate, 
          abortController.signal,
          prefetchedTitle
        );
        if (abortController.signal.aborted) return;
      } else {
        // For past years after 1995 or current, check AI cache first
        const cachedEntry = getCachedAiPage(normalizedTargetUrl, targetYear);
        if (cachedEntry) {
          console.log(`[IE] Using cached AI page for ${normalizedTargetUrl} in ${targetYear}`);
          const favicon = `https://www.google.com/s2/favicons?domain=${new URL(normalizedTargetUrl).hostname}&sz=32`;
          loadSuccess({ 
            aiGeneratedHtml: cachedEntry.html, 
            title: cachedEntry.title || normalizedTargetUrl, 
            targetUrl: normalizedTargetUrl, 
            targetYear: targetYear, 
            favicon: favicon, 
            addToHistory: true 
          });
          return;
        }

        // If no AI cache, try Wayback Machine
        let urlToLoad = normalizedTargetUrl;

        if (newMode === "past") {
          // Get Wayback URL for past years
          try {
            const waybackUrl = await getWaybackUrl(normalizedTargetUrl, targetYear);
            if (abortController.signal.aborted) return;

            if (waybackUrl) {
              urlToLoad = waybackUrl;
              console.log(`[IE] Using proxy for Wayback URL: ${urlToLoad}`);
              
              // Set a longer timeout for Wayback Machine requests
              setTimeout(() => {
                if (status === 'loading' && !abortController.signal.aborted) {
                  console.warn(`[IE] Wayback Machine load timeout for ${normalizedTargetUrl} in ${targetYear}`);
                  loadError(`The Wayback Machine is taking too long to respond. Try a different year or website.`);
                }
              }, 20000); // 20-second timeout for Wayback Machine
            } else {
              // If no Wayback URL is returned, fall back to AI generation
              console.info(`[IE] No Wayback URL available for ${normalizedTargetUrl} in ${targetYear}, generating AI content`);
              await generateFuturisticWebsite(
                normalizedTargetUrl,
                targetYear,
                forceRegenerate,
                abortController.signal,
                prefetchedTitle
              );
              if (abortController.signal.aborted) return;
              return; // Exit early as AI generation handles its own state updates
            }
          } catch (waybackError) {
            if (abortController.signal.aborted) return;
            
            console.warn(`[IE] Wayback Machine error for ${normalizedTargetUrl}:`, waybackError);
            // Fall back to AI generation on Wayback error
            await generateFuturisticWebsite(
              normalizedTargetUrl,
              targetYear,
              forceRegenerate,
              abortController.signal,
              prefetchedTitle
            );
            if (abortController.signal.aborted) return;
            return; // Exit early as AI generation handles its own state updates
          }
        } else if (newMode === "now") {
          // Check if the site allows embedding before deciding whether to proxy
          try {
            const checkRes = await fetch(
              `/api/iframe-check?mode=check&url=${encodeURIComponent(normalizedTargetUrl)}`,
              { signal: abortController.signal }
            );

            if (checkRes.ok) {
              const checkData = (await checkRes.json()) as IframeCheckResponse;

              if (checkData.allowed) {
                // Site allows direct embedding, proceed without proxy
                console.info(`[IE] Loading ${normalizedTargetUrl} directly (embedding allowed).`);
                urlToLoad = normalizedTargetUrl; // Use original URL
                // Store the prefetched title if available
                if (checkData.title) {
                    setPrefetchedTitle(checkData.title);
                }
              } else {
                // Fallback: proxy the content through the endpoint
                console.info(
                  `[IE] Using proxy for ${normalizedTargetUrl} because direct embedding is blocked${checkData.reason ? ` (${checkData.reason})` : ""}.`
                );
                urlToLoad = `/api/iframe-check?url=${encodeURIComponent(normalizedTargetUrl)}`;
                // Title for proxy will be set in handleIframeLoad from meta tag
              }
            } else {
              // If check response itself is not ok, try direct load
              console.warn(`[IE] iframe-check request failed (status ${checkRes.status}), attempting direct load for ${normalizedTargetUrl}`);
              urlToLoad = normalizedTargetUrl;
              // Title will be set in handleIframeLoad
            }
          } catch (error) {
             if (error instanceof Error && error.name === 'AbortError') {
              console.log("[IE] iframe-check fetch aborted");
              return; // Don't proceed if aborted
            }
            // If the check fetch itself fails, try direct load
            console.warn(`[IE] iframe-check fetch failed, attempting direct load for ${normalizedTargetUrl}:`, error);
            urlToLoad = normalizedTargetUrl;
            // Title will be set in handleIframeLoad
          }
        }
        
        // Add cache buster if URL is the same to force reload
        if (urlToLoad === finalUrl) {
          urlToLoad = `${urlToLoad}${urlToLoad.includes("?") ? "&" : "?"}_t=${Date.now()}`;
        }
        
        // Update final URL state
        setFinalUrl(urlToLoad);
        // Title will be set by handleIframeLoad for all iframe cases now
        
        // Set iframe src with the token for tracking
        // The iframe handlers (onLoad/onError) will dispatch LOAD_SUCCESS/LOAD_ERROR
        if (iframeRef.current) {
          iframeRef.current.dataset.navToken = newToken.toString();
          iframeRef.current.src = urlToLoad;
        }
      }
    } catch (error) {
      // Only update error state if this navigation is still active
      if (!abortController.signal.aborted) {
        console.error(`[IE] Navigation error:`, error);
        loadError(`Failed to navigate: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }, [url, year, finalUrl, status, token, isAiLoading, isNavigatingHistory, currentPageTitle, 
      navigateStart, setFinalUrl, loadError, generateFuturisticWebsite, stopGeneration]);

  const handleNavigateWithHistory = useCallback(async (
    targetUrl: string,
    targetYear?: string
  ) => {
    setNavigatingHistory(false);
    // When navigating from history, we want to use cache if available
    handleNavigate(targetUrl, targetYear || year, false);
  }, [handleNavigate, setNavigatingHistory, year]); 

  const handleGoBack = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setNavigatingHistory(true);
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const entry = history[nextIndex];
      // When going back, we want to use cache if available
      handleNavigate(entry.url, entry.year || "current", false);
      setNavigatingHistory(false);
    }
  }, [history, historyIndex, setHistoryIndex, handleNavigate, setNavigatingHistory]); 

  const handleGoForward = useCallback(() => {
    if (historyIndex > 0) {
      setNavigatingHistory(true);
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      const entry = history[nextIndex];
      // When going forward, we want to use cache if available
      handleNavigate(entry.url, entry.year || "current", false);
      setNavigatingHistory(false);
    }
  }, [history, historyIndex, setHistoryIndex, handleNavigate, setNavigatingHistory]); 

  const handleAddFavorite = useCallback(() => {
    // Use the potentially updated currentPageTitle, finalUrl, url from state
    setNewFavoriteTitle(
      currentPageTitle || new URL(finalUrl || url).hostname // Use current title or fallback
    );
    setTitleDialogOpen(true);
  }, [currentPageTitle, finalUrl, url, setNewFavoriteTitle, setTitleDialogOpen]);

  const handleTitleSubmit = useCallback(() => {
    if (!newFavoriteTitle) return;
    // Use potentially updated finalUrl, url from state
    addFavorite({
      title: newFavoriteTitle,
      url: url,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(finalUrl || url).hostname}&sz=32`,
      year: year !== "current" ? year : undefined,
    });
    setTitleDialogOpen(false);
  }, [newFavoriteTitle, addFavorite, finalUrl, url, year, setTitleDialogOpen]);

  const handleResetFavorites = useCallback(() => {
    // Reset favorites to DEFAULT_FAVORITES
    useInternetExplorerStore.setState((state) => ({
      ...state,
      favorites: DEFAULT_FAVORITES
    }));
    setResetFavoritesDialogOpen(false);
  }, [setResetFavoritesDialogOpen]);

  const handleClearFavorites = useCallback(() => {
    // Clear favorites
    clearFavorites();
    // Close the dialog
    setClearFavoritesDialogOpen(false);
  }, [clearFavorites, setClearFavoritesDialogOpen]);

  const handleRefresh = useCallback(() => {
    // Use potentially updated url, year from state
    handleNavigate(url, year, true);
  }, [handleNavigate, url, year]); 

  const handleStop = useCallback(() => {
    // Cancel any ongoing navigation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Reset navigation state
    cancel();
    
    // Stop AI generation if in progress
    // Use potentially updated isAiLoading from state
    if (isAiLoading) {
      stopGeneration();
    }
    
    // Reset iframe if it exists
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
    }
  }, [cancel, isAiLoading, stopGeneration]);

  const handleGoToUrl = useCallback(() => {
    urlInputRef.current?.focus();
    urlInputRef.current?.select();
  }, []);

  const handleHome = useCallback(() => {
    handleNavigate("apple.com", "2002");
  }, [handleNavigate]); 

  // --- Effects ---

  // Effect to handle initial navigation
  useEffect(() => {
    // Use the callback version of handleNavigate
    handleNavigate(url, year, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Effect to handle messages from the iframe (for intercepted link clicks)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Basic security check: ensure the message has the expected structure
      // In production, you might want to verify event.origin as well
      if (
        event.data &&
        event.data.type === "iframeNavigation" &&
        typeof event.data.url === "string"
      ) {
        console.log(`[IE] Received navigation request from iframe: ${event.data.url}`);
        // Trigger navigation using the current year setting
        // Use the callback version of handleNavigate
        handleNavigate(event.data.url, year);
      } else if (event.data && event.data.type === "goBack") {
        // Handle back button click from error page
        console.log(`[IE] Received back button request from iframe`);
        handleGoBack(); // Use the callback version
      }
    };

    window.addEventListener("message", handleMessage);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener("message", handleMessage);
    };
    // Add stable handleNavigate and handleGoBack callbacks as dependencies
  }, [year, handleNavigate, handleGoBack]); 

  // Effect to persist navigation state
  useEffect(() => {
    // Use potentially updated status, url, year from state
    if (status === 'success' && url && year) {
      // Update global browser state for system state tracking
      updateBrowserState();
    }
  }, [status, url, year, updateBrowserState]);

  // Effect to check for scrollable favorites
  useEffect(() => {
    const checkScroll = () => {
      const container = favoritesContainerRef.current;
      if (container) {
        const hasMore =
          container.scrollWidth > container.clientWidth &&
          container.scrollLeft < container.scrollWidth - container.clientWidth;
        setHasMoreToScroll(hasMore);
      }
    };

    const container = favoritesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScroll);
      // Also check on resize
      window.addEventListener("resize", checkScroll);
      // Initial check
      checkScroll();
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      }
    };
    // Use potentially updated favorites from state
  }, [favorites]); // Re-run when favorites change

  if (!isWindowOpen) return null;

  // Extract current year for display purposes
  const isFutureYear = mode === "future";
  const isLoading = status === "loading" || isAiLoading;

  // Animation variants for the loading bar
  const loadingBarVariants = {
    hidden: { 
      height: 0,
      opacity: 0,
      transition: { duration: 0.3 }
    },
    visible: { 
      height: "0.25rem", // equivalent to h-1
      opacity: 1,
      transition: { duration: 0.3 }
    },
  };

  return (
    <>
      <InternetExplorerMenuBar
        isWindowOpen={isWindowOpen}
        isForeground={isForeground}
        onRefresh={handleRefresh}
        onStop={handleStop}
        onFocusUrlInput={handleGoToUrl}
        onHome={handleHome}
        onShowHelp={() => setHelpDialogOpen(true)}
        onShowAbout={() => setAboutDialogOpen(true)}
        isLoading={isLoading}
        favorites={favorites}
        history={history}
        onAddFavorite={handleAddFavorite}
        onClearFavorites={() => setClearFavoritesDialogOpen(true)}
        onResetFavorites={() => setResetFavoritesDialogOpen(true)}
        onNavigateToFavorite={(url, year) =>
          handleNavigateWithHistory(url, year)
        }
        onNavigateToHistory={handleNavigateWithHistory}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        canGoBack={historyIndex < history.length - 1}
        canGoForward={historyIndex > 0}
        onClearHistory={() => setClearHistoryDialogOpen(true)}
        onClose={onClose}
        onEditFuture={() => setFutureSettingsDialogOpen(true)}
      />
      <WindowFrame
        title={currentPageTitle || "Internet Explorer"}
        onClose={onClose}
        isForeground={isForeground}
        appId="internet-explorer"
      >
        <div className="flex flex-col h-full w-full">
          <div className="flex flex-col gap-1 p-1 bg-gray-100 border-b border-black">
            <div className="flex gap-2 items-center">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleGoBack}
                  disabled={historyIndex >= history.length - 1}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleGoForward}
                  disabled={historyIndex <= 0}
                  className="h-8 w-8"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <Input
                ref={urlInputRef}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleNavigate();
                  }
                }}
                className="flex-1"
                placeholder="Enter URL"
              />
              <div className="flex items-center gap-2">
                <Select
                  value={year}
                  onValueChange={(year) => handleNavigate(url, year)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Future years first, in reverse chronological order (newest to oldest) */}
                    {futureYears.map((year) => (
                      <SelectItem key={year} value={year} className="text-blue-600 font-semibold">
                        {year}
                      </SelectItem>
                    ))}
                    {/* Now option */}
                    <SelectItem value="current">Now</SelectItem>
                    {/* Past years in reverse chronological order (newest to oldest) */}
                    {pastYears.map((year) => (
                      <SelectItem 
                        key={year} 
                        value={year}
                        className={parseInt(year) <= 1995 ? "text-blue-600 font-semibold" : ""}
                      >
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="relative">
              <div
                ref={favoritesContainerRef}
                className="overflow-x-auto scrollbar-none relative"
              >
                <div className="flex items-center min-w-full ">
                  {favorites.map((favorite, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="whitespace-nowrap hover:bg-gray-200 font-geneva-12 text-[10px] gap-1 px-1 mr-1 w-content min-w-[60px] max-w-[120px] flex-shrink-0"
                      onClick={() =>
                        handleNavigateWithHistory(favorite.url, favorite.year)
                      }
                    >
                      <img
                        src={favorite.favicon || "/icons/ie-site.png"}
                        alt="Site"
                        className="w-4 h-4 mr-1"
                        onError={(e) => {
                          e.currentTarget.src = "/icons/ie-site.png";
                        }}
                      />
                      <span className="truncate">{favorite.title}</span>
                    </Button>
                  ))}
                </div>
              </div>
              {favorites.length > 0 && hasMoreToScroll && (
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-100 to-transparent pointer-events-none" />
              )}
            </div>
          </div>
          <div className="flex-1 relative">
            {/* Content first */} 
            {error ? (
              <div className="p-4 text-red-500">{error}</div>
            ) : isFutureYear || (mode === "past" && (isAiLoading || aiGeneratedHtml)) ? ( // Render HtmlPreview for future years or past years with AI content
              <div className="w-full h-full overflow-hidden absolute inset-0">
                <HtmlPreview
                  htmlContent={isAiLoading ? generatedHtml || "" : aiGeneratedHtml || ""}
                  onInteractionChange={() => {}}
                  className="border-none"
                  maxHeight="none"
                  minHeight="100%"
                  initialFullScreen={false}
                  isInternetExplorer={true}
                  isStreaming={isAiLoading}
                />
              </div>
            ) : (
              // Render iframe for current/past years with Wayback snapshots
              <iframe
                ref={iframeRef}
                src={finalUrl || ""}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            )}

            {/* Loading Bar last (to ensure it's on top with z-50) */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  className="absolute top-0 left-0 right-0 bg-white/75 backdrop-blur-sm overflow-hidden z-50"
                  variants={loadingBarVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <div className="h-full bg-blue-500 animate-progress-indeterminate" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <InputDialog
          isOpen={isTitleDialogOpen}
          onOpenChange={setTitleDialogOpen}
          onSubmit={handleTitleSubmit}
          title="Add Favorite"
          description="Enter a title for this favorite"
          value={newFavoriteTitle}
          onChange={setNewFavoriteTitle}
        />
        <HelpDialog
          isOpen={isHelpDialogOpen}
          onOpenChange={setHelpDialogOpen}
          helpItems={helpItems}
          appName="Internet Explorer"
        />
        <AboutDialog
          isOpen={isAboutDialogOpen}
          onOpenChange={setAboutDialogOpen}
          metadata={appMetadata}
        />
        <ConfirmDialog
          isOpen={isClearFavoritesDialogOpen}
          onOpenChange={setClearFavoritesDialogOpen}
          onConfirm={handleClearFavorites}
          title="Clear Favorites"
          description="Are you sure you want to clear all favorites?"
        />
        <ConfirmDialog
          isOpen={isClearHistoryDialogOpen}
          onOpenChange={setClearHistoryDialogOpen}
          onConfirm={clearHistory}
          title="Clear History"
          description="Are you sure you want to clear all history?"
        />
        <ConfirmDialog
          isOpen={isResetFavoritesDialogOpen}
          onOpenChange={setResetFavoritesDialogOpen}
          onConfirm={handleResetFavorites}
          title="Reset Favorites"
          description="Are you sure you want to reset favorites to default?"
        />
        <FutureSettingsDialog
          isOpen={isFutureSettingsDialogOpen}
          onOpenChange={setFutureSettingsDialogOpen}
        />
      </WindowFrame>
    </>
  );
}
