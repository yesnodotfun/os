import { useState, useEffect, useRef } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { Input } from "@/components/ui/input";
import { InternetExplorerMenuBar } from "./InternetExplorerMenuBar";
import { Button } from "@/components/ui/button";
import {
  Favorite,
  loadFavorites,
  saveFavorites,
  loadLastUrl,
  saveLastUrl,
  DEFAULT_URL,
  HistoryEntry,
  loadHistory,
  addToHistory,
  APP_STORAGE_KEYS,
} from "@/utils/storage";
import { Plus, ArrowLeft, ArrowRight } from "lucide-react";
import { InputDialog } from "@/components/dialogs/InputDialog";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { helpItems, appMetadata } from "..";

export function InternetExplorerAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [url, setUrl] = useState(() => loadLastUrl());
  const [currentUrl, setCurrentUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(false);
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

  const urlInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setFavorites(loadFavorites());
    const loadedHistory = loadHistory();
    setHistory(loadedHistory);
    // Set initial history index to most recent entry if exists
    if (loadedHistory.length > 0) {
      setHistoryIndex(0);
    }
  }, []);

  const handleNavigate = (targetUrl = url, addToHistoryStack = true) => {
    setIsLoading(true);
    setError(null);
    const newUrl = targetUrl.startsWith("http")
      ? targetUrl
      : `https://${targetUrl}`;
    setUrl(targetUrl);
    saveLastUrl(targetUrl);

    const finalUrl =
      newUrl === currentUrl
        ? `${newUrl}${newUrl.includes("?") ? "&" : "?"}_t=${Date.now()}`
        : newUrl;
    setCurrentUrl(finalUrl);

    if (addToHistoryStack && !isNavigatingHistory) {
      const newEntry = {
        url: newUrl,
        title: new URL(newUrl).hostname,
        favicon: `https://www.google.com/s2/favicons?domain=${
          new URL(newUrl).hostname
        }&sz=32`,
        timestamp: Date.now(),
      };

      // Add new entry to the beginning of history
      setHistory((prev) => [newEntry, ...prev]);
      setHistoryIndex(0);
      addToHistory(newEntry);
    }
  };

  const handleNavigateWithHistory = (targetUrl: string) => {
    setIsNavigatingHistory(false);
    handleNavigate(targetUrl, true);
  };

  const handleGoBack = () => {
    if (historyIndex < history.length - 1) {
      setIsNavigatingHistory(true);
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      handleNavigate(history[nextIndex].url, false);
      setIsNavigatingHistory(false);
    }
  };

  const handleGoForward = () => {
    if (historyIndex > 0) {
      setIsNavigatingHistory(true);
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      handleNavigate(history[nextIndex].url, false);
      setIsNavigatingHistory(false);
    }
  };

  const handleAddFavorite = () => {
    setNewFavoriteTitle(new URL(currentUrl).hostname);
    setIsTitleDialogOpen(true);
  };

  const handleTitleSubmit = () => {
    if (!newFavoriteTitle) return;
    const newFavorites = [
      ...favorites,
      {
        title: newFavoriteTitle,
        url: currentUrl,
        favicon: `https://www.google.com/s2/favicons?domain=${
          new URL(currentUrl).hostname
        }&sz=32`,
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
    setIsLoading(false);
    setError(
      `Cannot access ${currentUrl}. The website might be blocking access or requires authentication.`
    );
  };

  const handleRefresh = () => {
    handleNavigate();
  };

  const handleStop = () => {
    setIsLoading(false);
  };

  const handleGoToUrl = () => {
    urlInputRef.current?.focus();
    urlInputRef.current?.select();
  };

  const handleHome = () => {
    setUrl(DEFAULT_URL);
    saveLastUrl(DEFAULT_URL);
    setCurrentUrl(DEFAULT_URL);
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
        onNavigateToFavorite={handleNavigateWithHistory}
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
        windowConstraints={{
          minWidth: 260,
          minHeight: 400,
          maxWidth: "100vw",
        }}
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
                onKeyDown={(e) => e.key === "Enter" && handleNavigate()}
                placeholder="Enter URL..."
                className="flex-1 shadow-none border-black"
              />
              <img
                src={
                  isLoading
                    ? "/icons/ie-loader-animated.png"
                    : "/icons/ie-loader.png"
                }
                alt="Internet Explorer"
                className="w-10 h-10"
              />
            </div>
            <div className="flex gap-0 items-center group">
              {favorites.map((favorite, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="whitespace-nowrap hover:bg-gray-200 font-['Geneva-12'] antialiased text-[10px] gap-1 px-1 mr-1 w-content min-w-[60px] max-w-[120px]"
                  onClick={() => handleNavigate(favorite.url)}
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
              <Button
                variant="ghost"
                size="icon"
                onClick={handleAddFavorite}
                className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {error ? (
            <div className="flex flex-col items-center justify-center h-full p-4 bg-white text-center">
              <img
                src="/icons/error.png"
                alt="Error"
                className="w-16 h-16 mb-4"
              />
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={currentUrl}
              className="flex-1 w-full h-full min-h-[400px] border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              onLoad={() => {
                setIsLoading(false);
                if (iframeRef.current?.contentDocument?.title) {
                  const title = iframeRef.current.contentDocument.title;
                  if (!isNavigatingHistory) {
                    const updatedHistory = [...history];
                    if (updatedHistory[historyIndex]) {
                      updatedHistory[historyIndex].title = title;
                      setHistory(updatedHistory);
                    }
                  }
                }
              }}
              onError={handleIframeError}
            />
          )}
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
