import { useState } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { Input } from "@/components/ui/input";
import { InternetExplorerMenuBar } from "./InternetExplorerMenuBar";

export function InternetExplorerAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [url, setUrl] = useState("https://ryo.lu");
  const [currentUrl, setCurrentUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNavigate = () => {
    setIsLoading(true);
    setError(null);
    const newUrl = url.startsWith("http") ? url : `https://${url}`;
    setCurrentUrl(
      newUrl === currentUrl
        ? `${newUrl}${newUrl.includes("?") ? "&" : "?"}_t=${Date.now()}`
        : newUrl
    );
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

  const handleHome = () => {
    setUrl("https://ryo.lu");
    setCurrentUrl("https://ryo.lu");
  };

  const handleClearHistory = () => {
    // TODO: Implement history clearing when history feature is added
  };

  if (!isWindowOpen) return null;

  return (
    <WindowFrame
      title="Internet Explorer"
      onClose={onClose}
      isForeground={isForeground}
      appId="internet-explorer"
    >
      <div className="flex flex-col h-full w-full">
        <InternetExplorerMenuBar
          isWindowOpen={isWindowOpen}
          isForeground={isForeground}
          onRefresh={handleRefresh}
          onStop={handleStop}
          onHome={handleHome}
          onClearHistory={handleClearHistory}
          isLoading={isLoading}
        />
        <div className="flex gap-2 p-1 bg-gray-100 border-b border-black items-center">
          <Input
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
            className="flex-1 w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            onLoad={() => setIsLoading(false)}
            onError={handleIframeError}
          />
        )}
      </div>
    </WindowFrame>
  );
}
