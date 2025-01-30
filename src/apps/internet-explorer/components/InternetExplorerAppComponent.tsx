import { useState, useEffect, useRef } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { Input } from "@/components/ui/input";
import { InternetExplorerMenuBar } from "./InternetExplorerMenuBar";
import { Button } from "@/components/ui/button";
import { Favorite, loadFavorites, saveFavorites } from "@/utils/storage";
import { Plus } from "lucide-react";
import { InputDialog } from "@/components/dialogs/InputDialog";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { helpItems, appMetadata } from "..";

export function InternetExplorerAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [url, setUrl] = useState("https://ryo.lu");
  const [currentUrl, setCurrentUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isTitleDialogOpen, setIsTitleDialogOpen] = useState(false);
  const [newFavoriteTitle, setNewFavoriteTitle] = useState("");
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);

  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const handleNavigate = (targetUrl = url) => {
    setIsLoading(true);
    setError(null);
    const newUrl = targetUrl.startsWith("http")
      ? targetUrl
      : `https://${targetUrl}`;
    setUrl(targetUrl);
    setCurrentUrl(
      newUrl === currentUrl
        ? `${newUrl}${newUrl.includes("?") ? "&" : "?"}_t=${Date.now()}`
        : newUrl
    );
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
    if (window.confirm("Are you sure you want to clear all favorites?")) {
      setFavorites([]);
      saveFavorites([]);
    }
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
    setUrl("https://ryo.lu");
    setCurrentUrl("https://ryo.lu");
  };

  const handleClearHistory = () => {
    // TODO: Implement history clearing when history feature is added
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
        onClearHistory={handleClearHistory}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        isLoading={isLoading}
        favorites={favorites}
        onAddFavorite={handleAddFavorite}
        onClearFavorites={handleClearFavorites}
        onNavigateToFavorite={handleNavigate}
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
          maxWidth: undefined,
          maxHeight: undefined,
        }}
      >
        <div className="flex flex-col h-full w-full">
          <div className="flex flex-col gap-1 p-1 bg-gray-100 border-b border-black">
            <div className="flex gap-2 items-center">
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
              src={currentUrl}
              className="flex-1 w-full h-full min-h-[400px] border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              onLoad={() => setIsLoading(false)}
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
      </WindowFrame>
    </>
  );
}
