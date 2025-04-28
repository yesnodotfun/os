import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ShareLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  year: string;
}

export function ShareLinkDialog({
  isOpen,
  onClose,
  url,
  year,
}: ShareLinkDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate the share link when the dialog opens
  useEffect(() => {
    if (isOpen && url) {
      generateShareLink();
    }
    return () => {
      // Reset state when dialog closes
      if (!isOpen) {
        setShareUrl("");
      }
    };
  }, [isOpen, url, year]);

  // Focus the input when the share URL is available
  useEffect(() => {
    if (shareUrl && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      inputRef.current.scrollLeft = 0;
    }
  }, [shareUrl]);

  const generateShareLink = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/share-link?action=encode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, year }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate share link");
      }

      const data = await response.json();
      // Format URL with /internet-explorer/ path
      let rawUrl = data.shareUrl;
      if (rawUrl && !rawUrl.startsWith('http')) {
        rawUrl = `https://${rawUrl}`;
      }
      
      let formattedUrl = rawUrl;
      try {
        const urlObj = new URL(rawUrl);
        // Replace /share/ with /internet-explorer/ in the pathname
        urlObj.pathname = urlObj.pathname.replace(/^\/share\//, '/internet-explorer/');
        formattedUrl = urlObj.toString();
      } catch (e) {
        console.error("[ShareLinkDialog] Error formatting URL:", e);
        // Fallback if URL parsing fails, though unlikely with the https check
        formattedUrl = rawUrl.replace('/share/', '/internet-explorer/'); 
      }
      
      setShareUrl(formattedUrl);
      toast.success("Share link created", {
        id: "share-link-loading",
        description: "Now you can copy and share it with others"
      });
    } catch (error) {
      console.error("Error generating share link:", error);
      toast.error("Failed to generate share link", {
        id: "share-link-loading",
        description: "Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (inputRef.current && shareUrl) {
      inputRef.current.select();
      document.execCommand("copy");
      toast.success("Link copied", {
        description: "Share link copied to clipboard"
      });
      onClose(); // Dismiss the dialog after copying
    }
  };

  const getQRCodeUrl = () => {
    if (!shareUrl) return "";
    const encodedUrl = encodeURIComponent(shareUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodedUrl}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-system7-window-bg border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] max-w-sm"
        onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
      >
        <DialogHeader>Share Page</DialogHeader>
        <div className="p-3">
          <div className="flex flex-col items-center space-y-3">
            {/* QR Code */}
            {isLoading ? (
              <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded">
                <p className="text-gray-500 text-sm">Generating...</p>
              </div>
            ) : shareUrl ? (
              <div className="bg-white p-1.5 w-32 h-32 flex items-center justify-center">
                <img 
                  src={getQRCodeUrl()} 
                  alt={`QR Code for ${shareUrl}`} 
                  className="w-28 h-28"
                  title={`Scan to open: ${shareUrl}`}
                />
              </div>
            ) : (
              <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded">
                <p className="text-gray-500 text-sm">QR code will appear here</p>
              </div>
            )}
            
            {/* URL Input */}
            <Input
              ref={inputRef}
              value={shareUrl}
              readOnly
              className="shadow-none h-8 text-sm w-full"
              placeholder={isLoading ? "Generating..." : "Share link"}
            />
          </div>
          
          <DialogFooter className="mt-4 flex justify-end gap-1">
            <Button 
              onClick={onClose} 
              variant="retro"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCopyToClipboard} 
              disabled={!shareUrl || isLoading}
              variant="retro"
            >
              Copy Link
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}