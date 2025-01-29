import { useState } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function InternetExplorerAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [url, setUrl] = useState("https://ryo.lu");
  const [currentUrl, setCurrentUrl] = useState(url);

  const handleNavigate = () => {
    setCurrentUrl(url.startsWith("http") ? url : `https://${url}`);
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
        <div className="flex gap-2 p-2 bg-gray-100">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNavigate()}
            placeholder="Enter URL..."
            className="flex-1"
          />
          <Button onClick={handleNavigate}>Go</Button>
        </div>
        <iframe
          src={currentUrl}
          className="flex-1 w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </WindowFrame>
  );
}
