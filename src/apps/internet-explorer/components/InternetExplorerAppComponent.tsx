import { useEffect, useRef, useState } from "react";
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

export function InternetExplorerAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  // Use the Zustand store instead of local state
  const {
    url, setUrl,
    year,
    mode,
    status,
    finalUrl,
    aiGeneratedHtml,
    error,
    token,
    favorites,
    history,
    historyIndex,
    isTitleDialogOpen, setTitleDialogOpen,
    newFavoriteTitle, setNewFavoriteTitle,
    isHelpDialogOpen, setHelpDialogOpen,
    isAboutDialogOpen, setAboutDialogOpen,
    isNavigatingHistory, setNavigatingHistory,
    isClearFavoritesDialogOpen, setClearFavoritesDialogOpen,
    isClearHistoryDialogOpen, setClearHistoryDialogOpen,
    navigateStart,
    setFinalUrl,
    loadSuccess,
    loadError,
    cancel,
    addFavorite,
    clearFavorites,
    addHistoryEntry,
    setHistoryIndex,
    clearHistory,
    updateBrowserState
  } = useInternetExplorerStore();

  // State for reset favorites dialog
  const [isResetFavoritesDialogOpen, setResetFavoritesDialogOpen] = useState(false);

  // Unified AbortController for cancellations
  const abortControllerRef = useRef<AbortController | null>(null);

  // State to track scroll in the favorites bar
  const [hasMoreToScroll, setHasMoreToScroll] = useState(false);

  const urlInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const favoritesContainerRef = useRef<HTMLDivElement>(null);

  // AI generation hook
  const {
    generateFuturisticWebsite,
    aiGeneratedHtml: generatedHtml,
    isAiLoading,
    stopGeneration,
  } = useAiGeneration();

  // Create past years array (from 1996 to current year)
  const pastYears = Array.from(
    { length: new Date().getFullYear() - 1996 + 1 },
    (_, i) => (1996 + i).toString()
  ).reverse(); // Reverse to get newest to oldest

  // Create a richer set of future years – covering near, mid, and far future
  const futureYears = [
    // Near‑future (every decade up to 2100)
    ...Array.from({ length: 8 }, (_, i) => (2030 + i * 10).toString()), // 2030 → 2100
    // Mid & far‑future milestones
    "2150", "2200", "2250", "2300", "2400", "2500", "2750", "3000"
  ].sort((a, b) => parseInt(b) - parseInt(a)); // Newest (largest) first

  // Effect to handle initial navigation
  useEffect(() => {
    handleNavigate(url, true, year, false);
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
        handleNavigate(event.data.url, true, year);
      } else if (event.data && event.data.type === "goBack") {
        // Handle back button click from error page
        console.log(`[IE] Received back button request from iframe`);
        handleGoBack();
      }
    };

    window.addEventListener("message", handleMessage);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [year]); 

  // Effect to persist navigation state
  useEffect(() => {
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
  }, [favorites]); // Re-run when favorites change

  // Helper function to get Wayback URL
  const getWaybackUrl = async (targetUrl: string, year: string) => {
    if (year === "current") return targetUrl;

    // Get current date for month and day
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    // Directly construct the wayback URL without checking availability
    const formattedUrl = targetUrl.startsWith("http")
      ? targetUrl
      : `https://${targetUrl}`;

    return `https://web.archive.org/web/${year}${month}${day}/${formattedUrl}`;
  };

  // Handler for iframe load
  const handleIframeLoad = () => {
    // Only update if the iframe has a data-token attribute matching the current navigation token
    if (iframeRef.current && iframeRef.current.dataset.navToken === token.toString()) {
      // Introduce a tiny delay to ensure the loading state renders reliably
      setTimeout(() => {
        // Check token again inside timeout in case another navigation started very quickly
        if (iframeRef.current && iframeRef.current.dataset.navToken === token.toString()) {
          loadSuccess();
        }
      }, 50); // 50ms should be imperceptible but enough for rendering
    }
  };

  // Handler for iframe error
  const handleIframeError = () => {
    // Only update if the iframe has a data-token attribute matching the current navigation token
    if (iframeRef.current && iframeRef.current.dataset.navToken === token.toString()) {
      // Introduce a tiny delay
      setTimeout(() => {
        // Check token again inside timeout
        if (iframeRef.current && iframeRef.current.dataset.navToken === token.toString()) {
          loadError(`Cannot access ${finalUrl || url}. The website might be blocking access or requires authentication.`);
        }
      }, 50); // 50ms delay
    }
  };

  // Main navigation handler
  const handleNavigate = async (
    targetUrl: string = url,
    addToHistoryStack = true,
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

    // Format URL properly
    let newUrl = targetUrl.startsWith("http")
      ? targetUrl
      : `https://${targetUrl}`;

    // Store original URL info for history/favorites
    const originalUrlInfo = new URL(newUrl);
    const originalHostname = originalUrlInfo.hostname;
    const originalFavicon = `https://www.google.com/s2/favicons?domain=${originalHostname}&sz=32`;

    try {
      // Handle navigation based on mode
      if (newMode === "future") {
        // For future years, generate AI content
        await generateFuturisticWebsite(targetUrl, targetYear, forceRegenerate, abortController.signal);
        // Check if aborted during generation
        if (abortController.signal.aborted) return;
      } else {
        // For past or current, use direct URL or Wayback
        if (newMode === "past") {
          // Get Wayback URL for past years
          const waybackUrl = await getWaybackUrl(newUrl, targetYear);
          // Check if aborted while getting wayback URL
          if (abortController.signal.aborted) return;
          if (waybackUrl) {
            newUrl = waybackUrl;
          }
        } else if (newMode === "now") {
          // Check if the site allows embedding before deciding whether to proxy
          try {
            const checkRes = await fetch(
              `/api/iframe-check?mode=check&url=${encodeURIComponent(targetUrl)}`,
              { signal: abortController.signal }
            );

            // Check MUST be ok (200) to proceed
            if (checkRes.ok) {
              const { allowed, reason } = (await checkRes.json()) as {
                allowed: boolean;
                reason?: string;
              };

              if (allowed) {
                // Site allows direct embedding, proceed without proxy
                console.info(`[IE] Loading ${targetUrl} directly (embedding allowed).`);
                // newUrl is already correct (direct URL)
              } else {
                // Fallback: proxy the content through the endpoint
                console.info(
                  `[IE] Using proxy for ${targetUrl} because direct embedding is blocked${
                    reason ? ` (${reason})` : ""
                  }.`
                );
                // IMPORTANT: Proxy the *original* targetUrl, not the potentially modified newUrl
                newUrl = `/api/iframe-check?url=${encodeURIComponent(targetUrl)}`;
              }
            } else {
              // If check response itself is not ok (e.g., 500 error in the API route), try direct load
              console.warn(`[IE] iframe-check request failed (status ${checkRes.status}), attempting direct load for ${targetUrl}`);
              // Proceed with direct load (newUrl is unchanged)
            }
          } catch (error) {
            // If the check fetch itself fails (network error etc.), try direct load
            console.warn(`[IE] iframe-check fetch failed, attempting direct load for ${targetUrl}:`, error);
            // Proceed with direct load (newUrl is unchanged)
          }
        }
        
        // Add cache buster if URL is the same to force reload
        if (newUrl === finalUrl) {
          newUrl = `${newUrl}${newUrl.includes("?") ? "&" : "?"}_t=${Date.now()}`;
        }
        
        // Update final URL in state
        setFinalUrl(newUrl);
        
        // Set iframe src with the token for tracking
        // The iframe handlers (onLoad/onError) will dispatch LOAD_SUCCESS/LOAD_ERROR
        if (iframeRef.current) {
          iframeRef.current.dataset.navToken = newToken.toString();
          iframeRef.current.src = newUrl;
        }
      }

      // Add to history if needed
      if (addToHistoryStack && !isNavigatingHistory) {
        const newEntry = {
          url: targetUrl,
          title: originalHostname,
          favicon: originalFavicon,
          year: targetYear !== "current" ? targetYear : undefined,
        };

        addHistoryEntry(newEntry);
      }
    } catch (error) {
      // Only update error state if this navigation is still active
      if (!abortController.signal.aborted) {
        loadError(`Failed to navigate: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  const handleNavigateWithHistory = async (
    targetUrl: string,
    targetYear?: string
  ) => {
    setNavigatingHistory(false);
    // When navigating from history, we want to use cache if available
    handleNavigate(targetUrl, true, targetYear || year, false);
  };

  const handleGoBack = () => {
    if (historyIndex < history.length - 1) {
      setNavigatingHistory(true);
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const entry = history[nextIndex];
      // When going back, we want to use cache if available
      handleNavigate(entry.url, false, entry.year || "current", false);
      setNavigatingHistory(false);
    }
  };

  const handleGoForward = () => {
    if (historyIndex > 0) {
      setNavigatingHistory(true);
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      const entry = history[nextIndex];
      // When going forward, we want to use cache if available
      handleNavigate(entry.url, false, entry.year || "current", false);
      setNavigatingHistory(false);
    }
  };

  const handleAddFavorite = () => {
    setNewFavoriteTitle(
      new URL(finalUrl || url).hostname
    );
    setTitleDialogOpen(true);
  };

  const handleTitleSubmit = () => {
    if (!newFavoriteTitle) return;
    addFavorite({
      title: newFavoriteTitle,
      url: url,
      favicon: `https://www.google.com/s2/favicons?domain=${
        new URL(finalUrl || url).hostname
      }&sz=32`,
      year: year !== "current" ? year : undefined,
    });
    setTitleDialogOpen(false);
  };

  const handleResetFavorites = () => {
    // Reset favorites to DEFAULT_FAVORITES
    useInternetExplorerStore.setState((state) => ({
      ...state,
      favorites: DEFAULT_FAVORITES
    }));
    setResetFavoritesDialogOpen(false);
  };

  const handleClearFavorites = () => {
    // Clear favorites
    clearFavorites();
    // Close the dialog
    setClearFavoritesDialogOpen(false);
  };

  const handleRefresh = () => {
    handleNavigate(url, false, year, true);
  };

  const handleStop = () => {
    // Cancel any ongoing navigation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Reset navigation state
    cancel();
    
    // Stop AI generation if in progress
    if (isAiLoading) {
      stopGeneration();
    }
    
    // Reset iframe if it exists
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
    }
  };

  const handleGoToUrl = () => {
    urlInputRef.current?.focus();
    urlInputRef.current?.select();
  };

  const handleHome = () => {
    handleNavigate("apple.com", true, "2002");
  };

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
      />
      <WindowFrame
        title="Internet Explorer"
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
                  onValueChange={(year) => handleNavigate(url, true, year)}
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
                      <SelectItem key={year} value={year}>
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
            ) : isFutureYear ? ( // Render HtmlPreview if it's a future year
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
              // Render iframe for current/past years
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
      </WindowFrame>
    </>
  );
}
