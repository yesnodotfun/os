import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, Music, Video, ExternalLink } from "lucide-react";
import { useLaunchApp } from "@/hooks/useLaunchApp";

interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
}

interface LinkPreviewProps {
  url: string;
  className?: string;
}

export function LinkPreview({ url, className = "" }: LinkPreviewProps) {
  // Helper function to check if URL is YouTube
  const isYouTubeUrl = (url: string): boolean => {
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/.test(url);
  };

  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullWidthThumbnail, setIsFullWidthThumbnail] = useState(() => {
    // YouTube links should always start as full width
    return isYouTubeUrl(url);
  });
  const launchApp = useLaunchApp();

  // Helper function to extract YouTube video ID
  const extractYouTubeVideoId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  // Helper function to get favicon URL
  const getFaviconUrl = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    } catch {
      return `https://www.google.com/s2/favicons?domain=example.com&sz=16`;
    }
  };

  // Handle adding to iPod
  const handleAddToIpod = (e: React.MouseEvent) => {
    e.stopPropagation();
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      launchApp("ipod", { initialData: { videoId } });
    }
  };

  // Handle adding to Videos
  const handleAddToVideos = (e: React.MouseEvent) => {
    e.stopPropagation();
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      launchApp("videos", { initialData: { videoId } });
    }
  };

  // Handle opening in Internet Explorer
  const handleOpenInIE = (e: React.MouseEvent) => {
    e.stopPropagation();
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    const path = urlObj.pathname + urlObj.search;
    const cleanUrl = domain + path;
    
    launchApp("internet-explorer", { 
      initialData: { url: cleanUrl, year: "current" }
    });
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create a simple metadata extraction API endpoint
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setMetadata({
          title: data.title,
          description: data.description,
          image: data.image,
          siteName: data.siteName,
          url: url
        });
      } catch (err) {
        console.error("Error fetching link metadata:", err);
        setError("Failed to load preview");
        // Set basic metadata with just the URL
        setMetadata({
          title: url,
          url: url
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-2 p-3 bg-gray-50 border text-sm font-geneva-12 ${className}`}
        style={{ borderRadius: '3px' }}
      >
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        <span className="text-gray-600">Loading preview...</span>
      </motion.div>
    );
  }

  if (error && !metadata) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-sm font-geneva-12 ${className}`}
        style={{ borderRadius: '3px' }}
      >
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-red-600">{error}</span>
      </motion.div>
    );
  }

  if (!metadata) {
    return null;
  }

  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer font-geneva-12 ${className}`}
      style={{ borderRadius: '3px' }}
      onClick={handleClick}
    >
      {isFullWidthThumbnail && metadata.image ? (
        // Full width thumbnail layout with overlay
        <>
          <div className="relative aspect-video bg-gray-100 overflow-hidden">
            <img
              src={metadata.image}
              alt={metadata.title || "Link preview"}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide image if it fails to load
                e.currentTarget.style.display = "none";
              }}
            />
            
            {/* Overlay with favicon and title */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <div className="flex items-center gap-2">
                <img 
                  src={getFaviconUrl(url)} 
                  alt="Site favicon" 
                  className="h-4 w-4 flex-shrink-0"
                  onError={(e) => {
                    // Fallback to a simple circle if favicon fails to load
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                  }}
                />
                <div className="h-4 w-4 bg-gray-300 rounded-full flex-shrink-0 hidden"></div>
                {metadata.title && (
                  <h3 className="font-semibold text-white text-[10px] truncate">
                    {metadata.title}
                  </h3>
                )}
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="px-2 pb-2">
            {isYouTubeUrl(url) ? (
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={handleAddToIpod}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex-1"
                  title="Add to iPod"
                >
                  <Music className="h-3 w-3" />
                  <span>Add to iPod</span>
                </button>
                <button
                  onClick={handleAddToVideos}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex-1"
                  title="Add to Videos"
                >
                  <Video className="h-3 w-3" />
                  <span>Add to Videos</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={handleOpenInIE}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] bg-gray-100 hover:bg-gray-200 rounded-md transition-colors w-full"
                  title="Open in Internet Explorer"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Open in IE</span>
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        // Side-by-side layout for normal/square thumbnails
        <>
          <div className="flex">
            {metadata.image && (
              <div className="w-20 h-12 bg-gray-100 relative overflow-hidden flex-shrink-0">
                <img
                  src={metadata.image}
                  alt={metadata.title || "Link preview"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Hide image if it fails to load
                    e.currentTarget.style.display = "none";
                  }}
                  onLoad={(e) => {
                    // Determine if this should be full width
                    const img = e.currentTarget;
                    const container = img.parentElement;
                    const aspectRatio = img.naturalWidth / img.naturalHeight;
                    const shouldBeFullWidth = isYouTubeUrl(url) || aspectRatio > 1.5;
                    
                    if (shouldBeFullWidth) {
                      setIsFullWidthThumbnail(true);
                    } else {
                      // Adjust container for side-by-side layout
                      if (container) {
                        if (aspectRatio > 1.5) {
                          // Wide image (16:9 or similar) - use 80x45 (16:9)
                          container.className = "w-20 h-11 bg-gray-100 relative overflow-hidden flex-shrink-0";
                        } else {
                          // Square or tall image - use 48x48 (square)
                          container.className = "w-12 h-12 bg-gray-100 relative overflow-hidden flex-shrink-0";
                        }
                      }
                    }
                  }}
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0 p-3">
              {metadata.title && (
                <h3 className="font-semibold text-gray-900 text-[10px] mb-1" style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}>
                  {metadata.title}
                </h3>
              )}
              
              {metadata.description && (
                <p className="text-[10px] text-gray-600 mb-2" style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}>
                  {metadata.description}
                </p>
              )}
              
              <div className="flex items-center gap-2">
                <img 
                  src={getFaviconUrl(url)} 
                  alt="Site favicon" 
                  className="h-4 w-4 flex-shrink-0"
                  onError={(e) => {
                    // Fallback to a simple circle if favicon fails to load
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                  }}
                />
                <div className="h-4 w-4 bg-gray-300 rounded-full flex-shrink-0 hidden"></div>
                <p className="text-[10px] text-gray-500 truncate">
                  {metadata.siteName || new URL(url).hostname}
                </p>
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="px-2 pb-2">
            {isYouTubeUrl(url) ? (
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={handleAddToIpod}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex-1"
                  title="Add to iPod"
                >
                  <Music className="h-3 w-3" />
                  <span>Add to iPod</span>
                </button>
                <button
                  onClick={handleAddToVideos}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex-1"
                  title="Add to Videos"
                >
                  <Video className="h-3 w-3" />
                  <span>Add to Videos</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={handleOpenInIE}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] bg-gray-100 hover:bg-gray-200 rounded-md transition-colors w-full"
                  title="Open in Internet Explorer"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Open in IE</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

export default LinkPreview;