import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import HtmlPreview from '@/components/shared/HtmlPreview';
import { Button } from '@/components/ui/button';
import { useInternetExplorerStore } from '@/stores/useInternetExplorerStore';
// Import ErrorResponse
import type { ErrorResponse } from '@/stores/useInternetExplorerStore';

interface TimeMachineViewProps {
  isOpen: boolean;
  onClose: () => void;
  cachedYears: string[]; // Years should be sorted, newest first
  currentUrl: string;
  onSelectYear: (year: string) => void;
  currentSelectedYear: string; // Add prop for the initially selected year
}

const TimeMachineView: React.FC<TimeMachineViewProps> = ({
  isOpen,
  onClose,
  cachedYears,
  currentUrl,
  onSelectYear,
  currentSelectedYear, // Destructure the new prop
}) => {
  // Index of the year currently in focus (0 is the newest/frontmost)
  const [activeYearIndex, setActiveYearIndex] = useState<number>(0);
  
  // --- Time Machine Local Preview State ---
  const [previewYear, setPreviewYear] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [previewError, setPreviewError] = useState<string | null>(null);
  // --- End Local Preview State ---
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  // Get cache functions from store
  const getCachedAiPage = useInternetExplorerStore((state) => state.getCachedAiPage);
  const cacheAiPage = useInternetExplorerStore((state) => state.cacheAiPage);
  // Get main app state for comparison
  const storeUrl = useInternetExplorerStore((state) => state.url);
  const storeYear = useInternetExplorerStore((state) => state.year);

  // Determine the currently focused year in the timeline
  const activeYear = cachedYears[activeYearIndex] ?? null;

  // Determine if the Go button should be disabled
  const isGoButtonDisabled = !activeYear || (storeUrl === currentUrl && storeYear === activeYear);

  // Initialize index and preview year when opening
  useEffect(() => {
    if (isOpen) {
      const initialIndex = cachedYears.findIndex(y => y === currentSelectedYear);
      const validIndex = initialIndex !== -1 ? initialIndex : 0;
      setActiveYearIndex(validIndex);
      // Initialize previewYear based on the starting index
      if (cachedYears[validIndex]) {
        setPreviewYear(cachedYears[validIndex]);
      } else {
        setPreviewYear(null);
      }
      setPreviewStatus('idle'); // Reset status on open
      setPreviewHtml(null);
      setPreviewError(null);
    } else {
       // Reset preview state when closed
       setPreviewYear(null);
       setPreviewHtml(null);
       setPreviewStatus('idle');
       setPreviewError(null);
    }
  }, [cachedYears, isOpen, currentSelectedYear]);

  // Update previewYear when activeYearIndex changes (due to user interaction)
  useEffect(() => {
    // Ensure this runs only after initial setup and when index actually changes while open
    if (isOpen && previewStatus !== 'idle') { 
      const newYear = cachedYears[activeYearIndex];
      if (newYear && newYear !== previewYear) {
          setPreviewYear(newYear);
      }
    }
    // We only want this effect to react to index changes triggered by user interaction,
    // not the initial setting from the isOpen effect.
  }, [activeYearIndex, isOpen, cachedYears]);

  // Scroll timeline to active item
  useEffect(() => {
    if (isOpen && timelineRef.current) {
      const activeElement = timelineRef.current.children[activeYearIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [activeYearIndex, isOpen]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveYearIndex((prevIndex) => Math.min(prevIndex + 1, cachedYears.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveYearIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (cachedYears[activeYearIndex]) {
        onSelectYear(cachedYears[activeYearIndex]);
        // Keep view open after selection
        // onClose();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }, [isOpen, cachedYears, activeYearIndex, onSelectYear, onClose]);

  useEffect(() => {
    if (isOpen) {
        window.addEventListener('keydown', handleKeyDown);
    } else {
        window.removeEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // --- Effect to Fetch Preview Content based on previewYear ---
  useEffect(() => {
    if (!isOpen || !previewYear || !currentUrl) {
      setPreviewHtml(null);
      setPreviewStatus('idle');
      setPreviewError(null);
      return;
    }

    const fetchPreview = async () => {
      console.log(`[TimeMachine] Fetch triggered for year: ${previewYear}`);
      setPreviewStatus('loading');
      setPreviewHtml(null); 
      setPreviewError(null);

      try {
        if (previewYear === 'current') {
          // Fetch current content
          const response = await fetch(`/api/iframe-check?url=${encodeURIComponent(currentUrl)}`);
          if (!response.ok) {
            const errorText = await response.text();
            try {
              const errorJson = JSON.parse(errorText) as ErrorResponse;
              if (errorJson.error && errorJson.message) throw new Error(`API Error (${response.status}): ${errorJson.message}`);
            } catch { /* Ignore parse error */ }
            throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
          }
          const html = await response.text();
          setPreviewHtml(html);
          setPreviewStatus('success');
        } else {
          // Handle specific past/future years
          const cachedEntry = getCachedAiPage(currentUrl, previewYear);
          if (cachedEntry) {
            console.log(`[TimeMachine] Cache HIT for ${currentUrl} (${previewYear})`);
            setPreviewHtml(cachedEntry.html);
            setPreviewStatus('success');
          } else {
            console.log(`[TimeMachine] Cache MISS for ${currentUrl} (${previewYear}). Fetching...`);
            const response = await fetch(`/api/iframe-check?mode=ai&url=${encodeURIComponent(currentUrl)}&year=${previewYear}`);
            if (!response.ok) {
              if (response.status === 404) {
                 console.warn(`[TimeMachine] No remote cache found for ${currentUrl} (${previewYear}).`);
                 throw new Error(`No cached version available for ${previewYear}.`); // Throw error instead of setting state directly
              } else {
                const errorText = await response.text();
                throw new Error(`API Error (${response.status}): ${errorText}`);
              }
            }
            const html = await response.text();
            const titleMatch = html.match(/^<!--\s*TITLE:\s*(.*?)\s*-->/);
            const parsedTitle = titleMatch ? titleMatch[1].trim() : null;
            const cleanHtml = html.replace(/^<!--\s*TITLE:.*?-->\s*\n?/, "");
            setPreviewHtml(cleanHtml);
            setPreviewStatus('success');
            // Cache the fetched result locally
            cacheAiPage(currentUrl, previewYear, cleanHtml, parsedTitle || undefined);
          }
        }
      } catch (error) {
        console.error("[TimeMachine] Error fetching preview content:", error);
        setPreviewError(error instanceof Error ? error.message : "Failed to load preview.");
        setPreviewStatus('error');
      }
      // No finally block needed, status is set in try/catch
    };

    fetchPreview();
    // Cleanup function or AbortController could be added here if needed

  }, [previewYear, isOpen, currentUrl, getCachedAiPage, cacheAiPage]); // Dependencies for fetching

  const getHostname = (targetUrl: string): string => {
    try {
      return new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`).hostname;
    } catch {
      return targetUrl;
    }
  };

  const MAX_VISIBLE_PREVIEWS = 4; // How many previews to show behind the active one
  const PREVIEW_Z_SPACING = -80; // Spacing between previews on Z-axis
  const PREVIEW_SCALE_FACTOR = 0.05; // How much smaller each preview gets
  const PREVIEW_Y_SPACING = -20; // Vertical spacing between previews

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-xl flex flex-col items-center justify-center font-geneva-12 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            // Placeholder for Three.js galaxy background later
            // For now, a simple gradient or image can suffice
            // background: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)',
          }}
        >
            {/* Top Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 z-20"
                aria-label="Close Time Machine"
            >
                <X size={24} />
            </button>

            {/* Main Content Area - Using Flexbox */}
            <div className="relative w-full h-full flex items-center justify-between perspective-[1000px] pt-16 pb-24 px-4 pr-0 gap-4"> {/* Use flex, add gap */}

                <div className="w-20 flex-shrink-0"></div> 

                {/* Stacked Previews Area - Adjusted width */}
                <div ref={previewContainerRef} className="relative w-[calc(100%-12rem-2rem)] h-full flex items-center justify-center preserve-3d flex-grow"> {/* Calculate width, allow grow */}
                    <AnimatePresence initial={false}>
                        {cachedYears.map((year, index) => {
                            const distance = index - activeYearIndex;
                            const isInvisible = Math.abs(distance) > MAX_VISIBLE_PREVIEWS || distance < 0; // Hide previews in front or too far back
                            const zIndex = cachedYears.length - index; // Ensure correct stacking order

                            return (
                                <motion.div
                                    key={year}
                                    className="absolute w-[100%] h-[80%] rounded-[12px] border border-white/10 shadow-2xl overflow-hidden bg-neutral-900/50 preserve-3d"
                                    initial={{
                                        z: distance * PREVIEW_Z_SPACING,
                                        scale: 1 - Math.abs(distance) * PREVIEW_SCALE_FACTOR,
                                        opacity: 0
                                    }}
                                    animate={{
                                        z: distance * PREVIEW_Z_SPACING,
                                        y: distance * PREVIEW_Y_SPACING,
                                        scale: 1 - Math.abs(distance) * PREVIEW_SCALE_FACTOR,
                                        opacity: isInvisible ? 0 : 1 / (Math.abs(distance) + 1), // More transparent further back
                                        pointerEvents: distance === 0 ? 'auto' : 'none',
                                    }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    transition={{ type: 'spring', stiffness: 150, damping: 20 }}
                                    style={{
                                        zIndex: zIndex,
                                        transformOrigin: 'center center',
                                        // Add a slight tilt for perspective
                                        // rotateX: distance !== 0 ? (distance > 0 ? -5 : 5) : 0,
                                    }}
                                >
                                    {/* Placeholder Content - Replace with HtmlPreview later */}
                                    <div className="flex items-center justify-center h-full text-white/50 bg-black/30">
                                        {distance === 0 ? (
                                            <>
                                                {/* Remove loading text */}
                                                {/* {previewStatus === 'loading' && <p className='text-sm animate-pulse w-full text-center'>Loading {previewYear}...</p>} */}
                                                {previewStatus === 'error' && <p className='text-red-400 p-4 text-center'>{previewError || 'Error loading preview.'}</p>}
                                                <div 
                                                  className="w-full h-full overflow-hidden bg-neutral-900" 
                                                  style={{ contentVisibility: 'auto' }}
                                                > 
                                                    <AnimatePresence>
                                                         {/* Render previewHtml when status is success */} 
                                                         {previewHtml && previewStatus === 'success' && (
                                                              <motion.div
                                                                  key={`${currentUrl}-${previewYear}`}
                                                                  initial={{ opacity: 0 }}
                                                                  animate={{ opacity: 1 }}
                                                                  exit={{ opacity: 0 }}
                                                                  transition={{ duration: 0.5, delay: 0.2 }}
                                                                  className="w-full h-full"
                                                              >
                                                                  <HtmlPreview
                                                                      htmlContent={previewHtml}
                                                                      isInternetExplorer={true}
                                                                      maxHeight="100%"
                                                                      minHeight="100%"
                                                                      className="border-none rounded-none"
                                                                  />
                                                              </motion.div>
                                                         )}
                                                    </AnimatePresence>
                                                </div>
                                            </>
                                        ) : (
                                            null // Render nothing for inactive panes
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Up/Now/Down Controls Area */}
                <div className="h-full flex flex-col items-center justify-center w-auto flex-shrink-0 z-10 py-8 space-y-1">
                    <button 
                        onClick={() => setActiveYearIndex((prev) => Math.max(0, prev - 1))} 
                        className="text-neutral-200 bg-neutral-700/50 hover:bg-neutral-600/70 rounded p-1.5 mb-2 disabled:opacity-30 transition-colors"
                        disabled={activeYearIndex === 0} 
                        aria-label="Previous Version"
                    >
                        <ChevronUp size={18} />
                    </button>
                     <button 
                        onClick={() => setActiveYearIndex((prev) => Math.min(cachedYears.length - 1, prev + 1))} 
                        className="text-neutral-200 bg-neutral-700/50 hover:bg-neutral-600/70 rounded p-1.5 mt-2 disabled:opacity-30 transition-colors"
                        disabled={activeYearIndex === cachedYears.length - 1} 
                        aria-label="Next Version"
                    >
                        <ChevronDown size={18} />
                    </button>
                </div>

                {/* Timeline Area - Adjusted Padding and Styles */}
                <div className="h-full flex flex-col items-center justify-center w-48 flex-shrink-0 z-10"> {/* Removed py-16 */}
                    {/* Vertical container for the timeline bars and controls */}
                    <div className="relative w-full flex-1 flex flex-col items-center justify-center overflow-hidden px-6 py-4"> {/* Added py-4 for internal spacing */}
                        {/* Timeline Bars Container */}
                        <div ref={timelineRef} className="w-full overflow-y-auto scrollbar-none flex flex-col items-center space-y-0.5 py-2">
                            {cachedYears.map((year, index) => {
                                const isActive = activeYearIndex === index;
                                const isNow = year === 'current'; // Assuming 'current' is the string for now
                                
                                // Define base, size, and color classes for the bar
                                const barBaseClasses = 'rounded-sm transition-all duration-200 ease-out';
                                const barSizeClasses = isActive ? 'w-14 h-1' : 'w-8 h-0.5 group-hover:w-10'; // Active: wider & taller. Hover: wider non-active.
                                const barColorClasses = isActive ? (isNow ? 'bg-red-500' : 'bg-white') : 'bg-neutral-600/70';

                                return (
                                    <div 
                                        key={year} 
                                        className="w-full flex items-center justify-end cursor-pointer group"
                                        onClick={() => setActiveYearIndex(index)}
                                    >
                                        {/* Year Label: Visible when active or hovered */}
                                        <span
                                            className={`mr-2 text-xs font-medium transition-opacity duration-150 ${
                                                isActive
                                                ? (isNow ? 'text-red-400 opacity-100' : 'text-white opacity-100') // Active: Visible, specific colors
                                                : 'text-neutral-400 opacity-0 group-hover:opacity-100' // Inactive: Hidden, but visible on hover
                                            }`}
                                        >
                                            {isNow ? 'Now' : year} {/* Always render correct text, visibility controlled by opacity */}
                                        </span>
                                        {/* Timeline Bar */}
                                        <div
                                            className={`${barBaseClasses} ${barSizeClasses} ${barColorClasses}`}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Bar - Display URL, Year, and Go Button */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-neutral-900/60 backdrop-blur-sm border-t border-white/10 flex items-center justify-center gap-4 px-4 z-20">
              <p className="text-sm text-neutral-300 truncate">
                {/* Show URL and the *active* year from the timeline */}
                {getHostname(currentUrl)} in {activeYear || '...'}
              </p>
              <Button 
                size="sm" 
                variant="secondary"
                className="rounded-full px-2 py-0.5 h-6"
                disabled={isGoButtonDisabled}
                onClick={() => {
                  if (activeYear) {
                    onSelectYear(activeYear);
                    onClose();
                  }
                }}
              >
                Travel
              </Button>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TimeMachineView; 