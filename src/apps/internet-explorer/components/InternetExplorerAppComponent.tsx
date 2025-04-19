import { useState, useEffect, useRef } from "react";
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
import {
  Favorite,
  loadFavorites,
  saveFavorites,
  loadLastUrl,
  saveLastUrl,
  DEFAULT_URL,
  DEFAULT_YEAR,
  HistoryEntry,
  loadHistory,
  addToHistory,
  APP_STORAGE_KEYS,
  loadWaybackYear,
  saveWaybackYear,
  updateBrowserState,
} from "@/utils/storage";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { InputDialog } from "@/components/dialogs/InputDialog";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { helpItems, appMetadata } from "..";
import { useChat } from "ai/react";
import HtmlPreview from "@/components/shared/HtmlPreview";
import { motion, AnimatePresence } from "framer-motion";
import { useAiGeneration } from "../hooks/useAiGeneration";

interface NavigationState {
  url: string;
  year: string;
  currentUrl: string | null;
  aiGeneratedHtml?: string | null;
}

export function InternetExplorerAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const initialUrl = loadLastUrl();
  const initialYear = loadWaybackYear();

  const [navigation, setNavigation] = useState<NavigationState>({
    url: initialUrl,
    year: initialYear,
    currentUrl: null,
    aiGeneratedHtml: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isTitleDialogOpen, setIsTitleDialogOpen] = useState(false);
  const [newFavoriteTitle, setNewFavoriteTitle] = useState("");
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isNavigatingHistory, setIsNavigatingHistory] = useState(false);
  const [isClearFavoritesDialogOpen, setClearFavoritesDialogOpen] =
    useState(false);
  const [isClearHistoryDialogOpen, setClearHistoryDialogOpen] = useState(false);
  const [hasMoreToScroll, setHasMoreToScroll] = useState(false);

  const urlInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const favoritesContainerRef = useRef<HTMLDivElement>(null);

  // Add a ref to track navigation in progress
  const navigationInProgressRef = useRef(false);

  // Add useAiGeneration hook
  const {
    generateFuturisticWebsite,
    aiGeneratedHtml,
    isAiLoading,
    stopGeneration,
  } = useAiGeneration({
    onLoadingChange: (loading) => {
      // Only update loading state if this corresponds to an active navigation
      if (navigationInProgressRef.current) {
        setIsLoading(loading);
      }
    },
  });

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

  // We'll handle the display in the select component, no need to combine them here

  // Effect to load initial state and start initial navigation
  useEffect(() => {
    // Store initial year locally for use in finally block
    let initialYearValue = loadWaybackYear(); 

    const initializeState = async () => {
      // Prevent concurrent initializations
      if (navigationInProgressRef.current) return;

      // Set navigation lock
      navigationInProgressRef.current = true;
      setIsLoading(true); // Keep loading state during initial navigation

      try {
        setFavorites(loadFavorites());
        const loadedHistory = loadHistory();
        setHistory(loadedHistory);
        if (loadedHistory.length > 0) {
          setHistoryIndex(0);
        }

        // Start initial navigation with the loaded URL and year
        const initialUrl = loadLastUrl();
        // Use the locally stored initialYearValue
        initialYearValue = loadWaybackYear();

        // First set the navigation state without triggering navigation
        setNavigation({
          url: initialUrl,
          year: initialYearValue,
          currentUrl: null,
          aiGeneratedHtml: null,
        });

        try {
          // Then explicitly trigger navigation after state is set
          if (initialYearValue !== "current") {
            // Check if it's a future year
            const currentSystemYear = new Date().getFullYear();
            const yearNum = parseInt(initialYearValue);

            if (yearNum > currentSystemYear) {
              // Handle future year navigation
              await generateFuturisticWebsite(initialUrl, initialYearValue);
              // AI useEffect handles isLoading for this case
              // Inner finally block handles ref lock
            } else {
              // Handle past year (Wayback Machine)
              const waybackUrl = await getWaybackUrl(initialUrl, initialYearValue);
              if (waybackUrl) {
                setNavigation((_prev) => ({
                  ..._prev,
                  currentUrl: waybackUrl,
                }));
                // Let iframe load handler clear loading state & ref lock
              } else {
                // If wayback URL fails, error will be handled by outer finally
                // Inner finally block handles ref lock
              }
            }
          } else {
            // For current year, just use the URL directly
            setNavigation((_prev) => ({
              ..._prev,
              currentUrl: initialUrl.startsWith("http")
                ? initialUrl
                : `https://${initialUrl}`,
            }));
            // Let iframe load handler manage loading state & ref lock
          }
        } catch (error) {
          console.error("Error during initial navigation setup:", error);
          // Error handling is deferred to outer finally/catch
        } finally {
            // This finally block now ONLY handles the ref lock for specific cases
            const isFuture = initialYearValue !== "current" && parseInt(initialYearValue) > new Date().getFullYear();
            // If AI was called, or if Wayback/Current failed *before* setting currentUrl
            if (isFuture || (!isFuture && navigation.currentUrl === null)) { 
                 if (navigationInProgressRef.current) { 
                     navigationInProgressRef.current = false;
                 }
            }
            // If successful Wayback/Current, iframe handlers clear the lock.
        }
      } catch (error) {
          console.error("Error during state initialization:", error);
          // Outer catch ensures lock is released on any setup error
          if (navigationInProgressRef.current) {
            navigationInProgressRef.current = false;
          }
          // Let outer finally handle isLoading
      } finally {
        // Outer finally: Guaranteed cleanup for isLoading and potentially ref lock
        const isFutureNav = initialYearValue !== "current" && parseInt(initialYearValue) > new Date().getFullYear();
        
        // If the initial navigation wasn't AI-based, ensure loading is turned off.
        // (AI useEffect handles isLoading for future navs)
        if (!isFutureNav) {
          setIsLoading(false);
        }

        // Fallback check for navigation lock, although it should be handled
        // by inner finally or iframe handlers or outer catch.
        if (navigationInProgressRef.current) {
           console.warn("Initial navigation lock still held in outer finally block.");
           // navigationInProgressRef.current = false; // Optionally force release
        } 
      }
    };

    initializeState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Effect to persist navigation state - but don't trigger navigation
  useEffect(() => {
    if (navigation.url && navigation.year) {
      saveLastUrl(navigation.url);
      saveWaybackYear(navigation.year);
      
      // Update global browser state for system state tracking
      updateBrowserState(navigation.url, navigation.year);
    }
  }, [navigation.url, navigation.year]);

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

  // Update iframe load handler
  const handleIframeLoad = () => {
    // Only update state if this load corresponds to an active navigation attempt
    if (navigationInProgressRef.current) {
        setIsLoading(false);
        navigationInProgressRef.current = false;
    }
  };

  const handleNavigate = async (
    targetUrl: string = navigation.url,
    addToHistoryStack = true,
    year: string = navigation.year,
    forceRegenerate = false
  ) => {
    // --- Interrupt ongoing AI generation --- 
    if (isAiLoading) {
      console.log("Interrupting ongoing AI generation...");
      stopGeneration();
    }

    // Prevent concurrent navigations (unless it was AI generation we just stopped)
    if (navigationInProgressRef.current) {
        console.log("Navigation already in progress, ignoring new request.");
        return;
    }

    // Set navigation lock
    navigationInProgressRef.current = true;
    setIsLoading(true);
    setError(null);

    // Add a timeout to clear loading state after 10 seconds for regular navigation
    const loadingTimeout = setTimeout(() => {
      // Only clear loading if still in progress (ref hasn't been cleared by success/error)
      if (navigationInProgressRef.current) {
        setIsLoading(false);
        navigationInProgressRef.current = false; // Clear lock on timeout too
      }
    }, 10000);

    let newUrl = targetUrl.startsWith("http")
      ? targetUrl
      : `https://${targetUrl}`;

    // Store original URL info before potentially converting to wayback URL
    const originalUrlInfo = new URL(newUrl);
    const originalHostname = originalUrlInfo.hostname;
    const originalFavicon = `https://www.google.com/s2/favicons?domain=${originalHostname}&sz=32`;

    try {
      // Reset any previous AI-generated content
      setNavigation((_prev) => ({
        ..._prev,
        aiGeneratedHtml: null,
      }));

      // Check if this is a future year
      const currentYear = new Date().getFullYear();
      const yearNum = parseInt(year);
      
      if (year !== "current" && yearNum > currentYear) {
        // For future years, generate AI content
        clearTimeout(loadingTimeout); // AI generation handles its own loading
        
        // First, update the navigation state with the new URL and year
        setNavigation((_prev) => ({
          url: targetUrl,
          year: year,
          currentUrl: null,
          aiGeneratedHtml: null,
        }));
        
        if (addToHistoryStack && !isNavigatingHistory) {
          const newEntry = {
            url: targetUrl,
            title: originalHostname,
            favicon: originalFavicon,
            timestamp: Date.now(),
            year: year,
          };

          setHistory((prev) => [newEntry, ...prev]);
          setHistoryIndex(0);
          addToHistory(newEntry);
        }
        
        // Then generate the AI content using the new hook with caching
        try {
          await generateFuturisticWebsite(targetUrl, year, forceRegenerate);
          // Update navigation state with the generated HTML
          setNavigation((_prev) => ({
            ..._prev,
            aiGeneratedHtml: aiGeneratedHtml,
          }));
        } catch (error) {
          setError("Failed to generate futuristic website preview");
          if (navigationInProgressRef.current) {
            navigationInProgressRef.current = false;
          }
        }
      } else if (year !== "current") {
        // For past years, use Wayback Machine
        const waybackUrl = await getWaybackUrl(newUrl, year);
        if (!waybackUrl) {
          clearTimeout(loadingTimeout);
          setIsLoading(false);
          // navigationInProgressRef.current = false; // Moved to finally block
          return; // Return early, finally block will execute
        }
        newUrl = waybackUrl;
        
        // Update navigation state atomically
        setNavigation((_prev) => ({
          url: targetUrl,
          year: year,
          currentUrl:
            newUrl === _prev.currentUrl
              ? `${newUrl}${newUrl.includes("?") ? "&" : "?"}_t=${Date.now()}`
              : newUrl,
          aiGeneratedHtml: null,
        }));

        if (addToHistoryStack && !isNavigatingHistory) {
          const newEntry = {
            url: targetUrl,
            title: originalHostname,
            favicon: originalFavicon,
            timestamp: Date.now(),
            year: year !== "current" ? year : undefined,
          };

          setHistory((prev) => [newEntry, ...prev]);
          setHistoryIndex(0);
          addToHistory(newEntry);
        }
      } else {
        // For current year, just use the URL directly
        setNavigation((_prev) => ({
          url: targetUrl,
          year: year,
          currentUrl:
            newUrl === _prev.currentUrl
              ? `${newUrl}${newUrl.includes("?") ? "&" : "?"}_t=${Date.now()}`
              : newUrl,
          aiGeneratedHtml: null,
        }));

        if (addToHistoryStack && !isNavigatingHistory) {
          const newEntry = {
            url: targetUrl,
            title: originalHostname,
            favicon: originalFavicon,
            timestamp: Date.now(),
            year: year !== "current" ? year : undefined,
          };

          setHistory((prev) => [newEntry, ...prev]);
          setHistoryIndex(0);
          addToHistory(newEntry);
        }
      }
    } catch (error) {
      clearTimeout(loadingTimeout);
      setError(`Failed to navigate: ${error}`);
      setIsLoading(false);
      // navigationInProgressRef.current = false; // Moved to finally block
    } finally {
        // Clear the loading timeout if it hasn't fired yet
        clearTimeout(loadingTimeout);
        // Ensure the navigation lock is released unless handled by iframe load/error
        // If it's AI generation or Wayback failed, release the lock.
        // If it's a normal iframe load, handleIframeLoad/Error will release it.
        // Need to differentiate: was this an AI call or iframe navigation attempt?
        const isFuture = year !== "current" && parseInt(year) > new Date().getFullYear();

        // Release lock if it was AI, or if it was Wayback/Current and didn't result in an iframe load (e.g., Wayback URL failed)
        // Iframe load/error handlers will set the ref to false if they are triggered.
        // If AI generation finished, its useEffect sets isLoading, but we need to clear the lock here.
        if (isFuture || (!isFuture && navigation.currentUrl === null)) {
             // If AI was called, or if Wayback/Current failed before setting currentUrl for iframe
             if (navigationInProgressRef.current) { // Check again in case iframe handler ran quickly
                 navigationInProgressRef.current = false;
             }
        }
        // If it was a successful Wayback/Current navigation, handleIframeLoad/Error will set the ref.
    }
  };

  const handleNavigateWithHistory = async (
    targetUrl: string,
    year?: string
  ) => {
    setIsNavigatingHistory(false);
    handleNavigate(targetUrl, true, year || navigation.year);
  };

  const handleGoBack = () => {
    if (historyIndex < history.length - 1) {
      setIsNavigatingHistory(true);
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const entry = history[nextIndex];
      handleNavigate(entry.url, false, entry.year || "current");
      setIsNavigatingHistory(false);
    }
  };

  const handleGoForward = () => {
    if (historyIndex > 0) {
      setIsNavigatingHistory(true);
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      const entry = history[nextIndex];
      handleNavigate(entry.url, false, entry.year || "current");
      setIsNavigatingHistory(false);
    }
  };

  const handleAddFavorite = () => {
    setNewFavoriteTitle(
      new URL(navigation.currentUrl || navigation.url).hostname
    );
    setIsTitleDialogOpen(true);
  };

  const handleTitleSubmit = () => {
    if (!newFavoriteTitle) return;
    const newFavorites = [
      ...favorites,
      {
        title: newFavoriteTitle,
        url: navigation.url,
        favicon: `https://www.google.com/s2/favicons?domain=${
          new URL(navigation.currentUrl || navigation.url).hostname
        }&sz=32`,
        year: navigation.year !== "current" ? navigation.year : undefined,
      },
    ];
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
    setIsTitleDialogOpen(false);
  };

  const handleClearFavorites = () => {
    setClearFavoritesDialogOpen(true);
  };

  const confirmClearFavorites = () => {
    setFavorites([]);
    saveFavorites([]);
    setClearFavoritesDialogOpen(false);
  };

  const handleIframeError = () => {
    // Only update state if this error corresponds to an active navigation attempt
    if (navigationInProgressRef.current) {
        setIsLoading(false);
        navigationInProgressRef.current = false;
        setError(
          `Cannot access ${
            navigation.currentUrl || navigation.url
          }. The website might be blocking access or requires authentication.`
        );
    }
  };

  const handleRefresh = () => {
    handleNavigate(navigation.url, false, navigation.year, true);
  };

  const handleStop = () => {
    // Clear loading state and release the lock if navigation was in progress
    if (navigationInProgressRef.current) {
        setIsLoading(false);
        navigationInProgressRef.current = false;
    }
    // Also stop the iframe loading
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank"; // Stop loading
    }
    // Consider stopping AI generation if possible (e.g., if useChat provides an abort controller)
  };

  const handleGoToUrl = () => {
    urlInputRef.current?.focus();
    urlInputRef.current?.select();
  };

  const handleHome = () => {
    handleNavigate(DEFAULT_URL, true, DEFAULT_YEAR);
  };

  const handleClearHistory = () => {
    setClearHistoryDialogOpen(true);
  };

  const confirmClearHistory = () => {
    setHistory([]);
    setHistoryIndex(-1);
    localStorage.removeItem(APP_STORAGE_KEYS["internet-explorer"].HISTORY);
    setClearHistoryDialogOpen(false);
  };

  if (!isWindowOpen) return null;

  // Extract current year for display purposes
  const currentYear = new Date().getFullYear();
  const selectedYearNum = parseInt(navigation.year);
  const isFutureYear = navigation.year !== "current" && selectedYearNum > currentYear;

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
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        isLoading={isLoading}
        favorites={favorites}
        history={history}
        onAddFavorite={handleAddFavorite}
        onClearFavorites={handleClearFavorites}
        onNavigateToFavorite={(url, year) =>
          handleNavigateWithHistory(url, year)
        }
        onNavigateToHistory={handleNavigateWithHistory}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        canGoBack={historyIndex < history.length - 1}
        canGoForward={historyIndex > 0}
        onClearHistory={handleClearHistory}
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
                value={navigation.url}
                onChange={(e) =>
                  setNavigation((_prev) => ({ ..._prev, url: e.target.value }))
                }
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
                  value={navigation.year}
                  onValueChange={(year) =>
                    handleNavigate(navigation.url, true, year)
                  }
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
                  htmlContent={aiGeneratedHtml || ""}
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
                src={navigation.currentUrl || ""}
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
          onOpenChange={setIsTitleDialogOpen}
          onSubmit={handleTitleSubmit}
          title="Add Favorite"
          description="Enter a title for this favorite"
          value={newFavoriteTitle}
          onChange={setNewFavoriteTitle}
        />
        <HelpDialog
          isOpen={isHelpDialogOpen}
          onOpenChange={setIsHelpDialogOpen}
          helpItems={helpItems}
          appName="Internet Explorer"
        />
        <AboutDialog
          isOpen={isAboutDialogOpen}
          onOpenChange={setIsAboutDialogOpen}
          metadata={appMetadata}
        />
        <ConfirmDialog
          isOpen={isClearFavoritesDialogOpen}
          onOpenChange={setClearFavoritesDialogOpen}
          onConfirm={confirmClearFavorites}
          title="Clear Favorites"
          description="Are you sure you want to clear all favorites?"
        />
        <ConfirmDialog
          isOpen={isClearHistoryDialogOpen}
          onOpenChange={setClearHistoryDialogOpen}
          onConfirm={confirmClearHistory}
          title="Clear History"
          description="Are you sure you want to clear all history?"
        />
      </WindowFrame>
    </>
  );
}
