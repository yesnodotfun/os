import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronUp, ChevronDown, Blend, ChevronLeft, ChevronRight } from 'lucide-react';
import HtmlPreview from '@/components/shared/HtmlPreview';
import { Button } from '@/components/ui/button';
import { useInternetExplorerStore } from '@/stores/useInternetExplorerStore';
import GalaxyBackground, { ShaderType } from '@/components/shared/GalaxyBackground';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Import useAppStore for shader selection
import { useAppStore } from '@/stores/useAppStore';
import { cn } from '@/lib/utils';

// Define type for preview content source
type PreviewSource = 'html' | 'url';

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
  const [scrollState, setScrollState] = useState({ isTop: true, isBottom: false, canScroll: false });
  
  // --- Time Machine Local Preview State ---
  const [previewYear, setPreviewYear] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewSourceType, setPreviewSourceType] = useState<PreviewSource | null>(null);
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isIframeLoaded, setIsIframeLoaded] = useState<boolean>(false); // State for iframe load status
  // --- End Local Preview State ---
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  // Get cache functions from store
  const getCachedAiPage = useInternetExplorerStore((state) => state.getCachedAiPage);
  const cacheAiPage = useInternetExplorerStore((state) => state.cacheAiPage);
  // Get main app state for comparison
  const storeUrl = useInternetExplorerStore((state) => state.url);
  const storeYear = useInternetExplorerStore((state) => state.year);
  // Get shader support status
  const shaderEffectEnabled = useAppStore((state) => state.shaderEffectEnabled);
  const setShaderEffectEnabled = useAppStore((state) => state.setShaderEffectEnabled);

  // Determine the currently focused year in the timeline
  const activeYear = cachedYears[activeYearIndex] ?? null;

  // Determine if the Go button should be disabled
  const isGoButtonDisabled = !activeYear || (storeUrl === currentUrl && storeYear === activeYear);

  // Add shader selection state from app store
  const selectedShaderType = useAppStore((state) => state.selectedShaderType);
  const setSelectedShaderType = useAppStore((state) => state.setSelectedShaderType);

  // Define shader names including Off option
  const shaderNames: Record<ShaderType | 'off', string> = {
    [ShaderType.GALAXY]: 'Galaxy',
    [ShaderType.AURORA]: 'Aurora',
    [ShaderType.NEBULA]: 'Nebula',
    'off': 'Off',
  };

  // Define type for shader menu options
  type ShaderOption = ShaderType | 'off';

  // Simplified mask function - always shows mask at both ends
  const getMaskStyle = (_isTop: boolean, _isBottom: boolean, canScroll: boolean) => {
    // Only apply mask if scrolling is possible and on desktop view
    if (!canScroll || window.innerWidth < 640) return 'none';
    // Always show gradient mask at both ends
    return `linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)`;
  };

  const handleScroll = useCallback(() => {
    const element = timelineRef.current;
    if (!element) return;

    // Check vertical scroll on desktop layout (sm+)
    if (window.innerWidth >= 640) { // Tailwind 'sm' breakpoint
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      const threshold = 5; // Small tolerance

      // Only check if scrolling is possible, not position
      const canScroll = scrollHeight > clientHeight + threshold;

      // Update scroll state with simplified values
      setScrollState(prevState => {
        if (prevState.canScroll !== canScroll) {
          return { isTop: false, isBottom: false, canScroll };
        }
        return prevState;
      });
    } else {
      // Reset on mobile (no vertical scroll/mask)
      setScrollState(prevState => {
        if (prevState.canScroll !== false) {
          return { isTop: true, isBottom: false, canScroll: false };
        }
        return prevState;
      });
    }
  }, []); // Empty dependency array, relies on timelineRef.current

  // Effect to setup scroll listeners and initial check
  useEffect(() => {
    const element = timelineRef.current;
    if (isOpen && element) {
      // Delay slightly to ensure layout is stable after opening animation/resize
      const timer = setTimeout(() => {
        handleScroll(); // Initial check
        element.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll);
      }, 100); // Increased delay slightly

      return () => {
        clearTimeout(timer);
        element.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isOpen, handleScroll, cachedYears]); // Re-run if cachedYears changes height or component opens/closes
  // --- End Scroll Mask Logic ---

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
      setPreviewContent(null);
      setPreviewSourceType(null);
      setPreviewError(null);
      setIsIframeLoaded(false); // Reset iframe state on open
    } else {
       // Reset preview state when closed
       setPreviewYear(null);
       setPreviewContent(null);
       setPreviewSourceType(null);
       setPreviewStatus('idle');
       setPreviewError(null);
       setIsIframeLoaded(false); // Reset iframe state on close
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
        // Use center alignment for more natural scrolling
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeYearIndex, isOpen]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveYearIndex((prevIndex) => Math.min(prevIndex + 1, cachedYears.length - 1));
    } else if (event.key === 'ArrowDown') {
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

  // --- Effect to Set Preview Content (HTML or URL) based on previewYear ---
  useEffect(() => {
    if (!isOpen || !previewYear || !currentUrl) {
      setPreviewContent(null);
      setPreviewSourceType(null);
      setPreviewStatus('idle');
      setPreviewError(null);
      setIsIframeLoaded(false); // Reset iframe state
      return;
    }

    console.log(`[TimeMachine] Determining content source for year: ${previewYear}`);
    setPreviewStatus('loading');
    setPreviewContent(null);
    setPreviewSourceType(null);
    setPreviewError(null);
    setIsIframeLoaded(false); // Reset iframe state on new preview

    const determineSource = async () => {
      try {
        // 1. Check local cache first (always yields HTML)
        const cachedEntry = getCachedAiPage(currentUrl, previewYear);
        if (cachedEntry) {
            console.log(`[TimeMachine] Local Cache HIT for ${currentUrl} (${previewYear})`);
            setPreviewContent(cachedEntry.html);
            setPreviewSourceType('html');
            setPreviewStatus('success');
            // No iframe involved here, so loaded state is irrelevant or true
            setIsIframeLoaded(true); 
            return; // Done if cache hit
        }

        console.log(`[TimeMachine] Local Cache MISS for ${currentUrl} (${previewYear}). Determining API source...`);

        // 2. Determine API source based on year
        if (previewYear === 'current') {
          // 2a. 'current' uses direct proxy URL
          console.log(`[TimeMachine] Source: current -> URL`);
          const proxyUrl = `/api/iframe-check?url=${encodeURIComponent(currentUrl)}`;
          setPreviewContent(proxyUrl);
          setPreviewSourceType('url');
          setPreviewStatus('success'); // Status is success, iframe handles actual load
          // isIframeLoaded remains false until iframe onLoad fires

        } else {
          const yearString = previewYear.replace(' BC', '');
          const yearInt = parseInt(yearString);
          const currentYear = new Date().getFullYear();
          const isBC = previewYear.includes(' BC');

          if (!isBC && yearInt >= 1995 && yearInt <= currentYear) {
            // 2b. Year >= 1995 uses Wayback proxy URL
            console.log(`[TimeMachine] Source: ${previewYear} >= 1995 -> URL (Wayback Proxy)`);
            const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
            const proxyUrl = `/api/iframe-check?mode=proxy&url=${encodeURIComponent(currentUrl)}&year=${yearString}&month=${currentMonth}`;
            setPreviewContent(proxyUrl);
            setPreviewSourceType('url');
            setPreviewStatus('success'); // Status is success, iframe handles actual load
            // isIframeLoaded remains false until iframe onLoad fires

          } else {
            // 2c. Year < 1995 or BC uses AI cache (fetches HTML)
            console.log(`[TimeMachine] Source: ${previewYear} < 1995 or BC -> HTML (AI Fetch)`);
            const aiResponse = await fetch(`/api/iframe-check?mode=ai&url=${encodeURIComponent(currentUrl)}&year=${previewYear}`);

            if (aiResponse.ok) {
              console.log(`[TimeMachine] AI Fetch SUCCESS for ${currentUrl} (${previewYear})`);
              const html = await aiResponse.text();
              const cleanHtml = html.replace(/^<!--\s*TITLE:.*?-->\s*\n?/, "");
              const titleMatch = html.match(/^<!--\s*TITLE:\s*(.*?)\s*-->/);
              const parsedTitle = titleMatch ? titleMatch[1].trim() : undefined;

              setPreviewContent(cleanHtml);
              setPreviewSourceType('html');
              setPreviewStatus('success');
              // No iframe involved
              setIsIframeLoaded(true); 
              // Cache the AI result locally
              cacheAiPage(currentUrl, previewYear, cleanHtml, parsedTitle);
            } else if (aiResponse.status === 404) {
              console.log(`[TimeMachine] AI Fetch MISS (404) for ${currentUrl} (${previewYear}).`);
              throw new Error(`No AI-generated version available for ${previewYear}.`);
            } else {
              // Handle non-404 errors from AI fetch
              console.error(`[TimeMachine] AI Fetch FAILED for ${currentUrl} (${previewYear}). Status: ${aiResponse.status}`);
              const errorText = await aiResponse.text();
              let errorMessage = `API Error (${aiResponse.status})`;
              try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.message) errorMessage = errorJson.message;
              } catch { /* Ignore */ }
              throw new Error(errorMessage);
            }
          }
        }
      } catch (error) {
        console.error("[TimeMachine] Error determining preview content:", error);
        setPreviewError(error instanceof Error ? error.message : "Failed to load preview.");
        setPreviewStatus('error');
        setPreviewContent(null);
        setPreviewSourceType(null);
        setIsIframeLoaded(false);
      }
    };

    determineSource();

  }, [previewYear, isOpen, currentUrl, getCachedAiPage, cacheAiPage]); // Dependencies

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
  const PREVIEW_Y_SPACING = -28; // Vertical spacing between previews

  const maskStyle = getMaskStyle(scrollState.isTop, scrollState.isBottom, scrollState.canScroll);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 z-[10000] ${shaderEffectEnabled ? 'bg-black/90' : 'bg-black/70 backdrop-blur-xl'} flex flex-col items-center justify-center font-geneva-12 overflow-hidden`}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
            {/* Galaxy Background */}
            <GalaxyBackground shaderType={selectedShaderType} />

            {/* Top Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 z-20"
                aria-label="Close Time Machine"
            >
                <X size={24} />
            </button>

            {/* Main Content Area - Default: mobile (vertical), sm: desktop (horizontal) */}
            <motion.div
              className="relative w-full h-full flex flex-col items-center justify-start perspective-[1000px] p-2 gap-2 pt-12 pb-10
                           sm:flex-row sm:items-center sm:pt-16 sm:pb-24 sm:px-4 sm:pr-0 sm:gap-4"
              initial={{ opacity: 0, y: 20 , scale: 1.04}}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 1.04 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeInOut" }}
            >

                {/* Left spacer - Only visible on desktop */}
                <div className="w-20 flex-shrink-0 hidden sm:block"></div>

                {/* Stacked Previews Area - Removed sm:w-[calc(...)] and added sm:order-none */}
                <div ref={previewContainerRef} className="relative w-full h-full flex items-center justify-center preserve-3d flex-grow order-1
                                                        sm:flex-grow sm:order-none">
                    <AnimatePresence initial={false}>
                        {cachedYears.map((year, index) => {
                            const distance = index - activeYearIndex;
                            const isInvisible = Math.abs(distance) > MAX_VISIBLE_PREVIEWS || distance < 0; // Hide previews in front or too far back
                            const zIndex = cachedYears.length - index; // Ensure correct stacking order

                            return (
                                <motion.div
                                    key={year}
                                    className="absolute w-[100%] h-[80%] rounded-[12px] border border-white/10 shadow-2xl overflow-hidden preserve-3d bg-neutral-800/50" // Added base background
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
                                        // Keep background subtle, maybe slightly lighter when active
                                        backgroundColor: distance === 0 ? 'rgba(38, 38, 38, 0.7)' : 'rgba(20, 20, 20, 0.5)'
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
                                    {/* Placeholder Content / HtmlPreview container */}
                                    <div className="w-full h-full"> { /* Removed background */}
                                       {/* Only render content for the active pane */}
                                       {distance === 0 && (
                                         <div className="w-full h-full flex items-center justify-center">
                                           <AnimatePresence mode="wait">
                                             <motion.div
                                               key={previewStatus} // Animate based on status change
                                               initial={{ opacity: 0 }}
                                               animate={{ opacity: 1 }}
                                               exit={{ opacity: 0 }}
                                               transition={{ duration: 0.2 }}
                                               className="w-full h-full"
                                             >
                                               {previewStatus === 'loading' && (
                                                 <div className="w-full h-full flex items-center justify-center">
                                                   <p className="text-neutral-400 shimmer">Loading...</p>
                                                 </div>
                                               )}
                                               {previewStatus === 'error' && (
                                                 <div className="w-full h-full flex items-center justify-center p-4">
                                                   <p className='text-red-400 text-center'>{previewError || 'Error loading preview.'}</p>
                                                 </div>
                                               )}
                                               {previewStatus === 'success' && previewContent && (
                                                 <motion.div // Outer container for content fade-in
                                                   initial={{ opacity: 0 }}
                                                   animate={{ opacity: 1 }} // This fades in the container after loading/error
                                                   transition={{ duration: 0.3, delay: 0.1 }}
                                                   className="w-full h-full overflow-hidden"
                                                 >
                                                   {previewSourceType === 'url' && (
                                                     <motion.div // Animate iframe opacity based on load state
                                                       initial={{ opacity: 0 }} // Start fully transparent
                                                       animate={{ opacity: isIframeLoaded ? 1 : 0.6 }} // Animate to 0.6, then 1 on load
                                                       transition={{ duration: 0.3 }} // Smooth transition for opacity changes
                                                       className="w-full h-full"
                                                     >
                                                       <iframe
                                                         src={previewContent}
                                                         className="w-full h-full border-none bg-white"
                                                         sandbox="allow-scripts allow-same-origin"
                                                         title={`Preview for ${previewYear}`}
                                                         onLoad={() => {
                                                           console.log(`[TimeMachine] iframe for ${previewYear} loaded.`);
                                                           setIsIframeLoaded(true);
                                                         }}
                                                       />
                                                     </motion.div>
                                                   )}
                                                   {previewSourceType === 'html' && (
                                                     <motion.div // Keep consistent structure, though opacity is handled by parent
                                                       initial={{ opacity: 0 }} // Start transparent
                                                       animate={{ opacity: 1 }} // Fade in fully
                                                       transition={{ duration: 0.3 }} // Match iframe fade duration
                                                       className="w-full h-full"
                                                     >
                                                       <HtmlPreview
                                                         htmlContent={previewContent}
                                                         isInternetExplorer={true}
                                                         maxHeight="100%"
                                                         minHeight="100%"
                                                         className="border-none rounded-none"
                                                       />
                                                     </motion.div>
                                                   )}
                                                 </motion.div>
                                               )}
                                               {/* Handle idle state or success with no content (shouldn't normally happen) */}
                                               {(previewStatus === 'idle' || (previewStatus === 'success' && !previewContent)) && (
                                                   <div className="w-full h-full flex items-center justify-center"> {/* Placeholder/Idle */} </div>
                                               )}
                                             </motion.div>
                                           </AnimatePresence>
                                         </div>
                                       )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Up/Now/Down Controls Area - Only visible on desktop */}
                <div className="hidden h-full flex-col items-center justify-center w-auto flex-shrink-0 z-10 py-8 space-y-1 sm:flex">
                     <button
                        onClick={() => setActiveYearIndex((prev) => Math.min(cachedYears.length - 1, prev + 1))}
                        className="text-neutral-200 bg-neutral-700/50 hover:bg-neutral-600/70 rounded p-1.5 mb-2 disabled:opacity-30 transition-colors"
                        disabled={activeYearIndex === cachedYears.length - 1}
                        aria-label="Next Version"
                    >
                        <ChevronUp size={18} />
                    </button>
                     <button
                        onClick={() => setActiveYearIndex((prev) => Math.max(0, prev - 1))}
                        className="text-neutral-200 bg-neutral-700/50 hover:bg-neutral-600/70 rounded p-1.5 mt-2 disabled:opacity-30 transition-colors"
                        disabled={activeYearIndex === 0}
                        aria-label="Previous Version"
                    >
                        <ChevronDown size={18} />
                    </button>
                </div>

                {/* Timeline Area - Added sm:order-none */}
                <div className="w-full h-auto max-h-[80%] flex flex-col justify-center order-2 px-2 z-10
                           sm:h-full sm:flex-col sm:items-center sm:justify-center sm:w-48 sm:flex-shrink-0 sm:order-none">
                    
                    {/* Mobile Prev/Next Buttons - Only visible on mobile */}
                    <div className="w-full flex items-center justify-center mb-2 sm:hidden">
                        <button
                            onClick={() => setActiveYearIndex((prev) => Math.min(cachedYears.length - 1, prev + 1))}
                            className="text-white bg-neutral-700/50 hover:bg-neutral-600/70 rounded-full p-1.5 mr-4 disabled:opacity-30 transition-colors"
                            disabled={activeYearIndex === cachedYears.length - 1}
                            aria-label="Previous Version"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => setActiveYearIndex((prev) => Math.max(0, prev - 1))}
                            className="text-white bg-neutral-700/50 hover:bg-neutral-600/70 rounded-full p-1.5 disabled:opacity-30 transition-colors"
                            disabled={activeYearIndex === 0}
                            aria-label="Next Version"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    
                    {/* Container for the timeline bars */}
                    <div
                        className="relative w-full flex-1 flex flex-row items-center justify-center overflow-hidden px-2
                                   sm:flex-col sm:px-4 sm:py-2 sm:h-[calc(100%-2rem)]"
                        style={{
                           maskImage: maskStyle,
                           WebkitMaskImage: maskStyle, // For Safari
                        }}
                    >
                        {/* Timeline Bars Container */}
                        <div
                           ref={timelineRef}
                           className="w-auto max-w-full overflow-x-auto flex flex-row items-center space-x-4 space-y-0 justify-start py-0 h-full
                                      sm:w-full sm:overflow-y-auto sm:flex-col-reverse sm:items-center sm:space-y-1 sm:space-x-0 sm:py-4 sm:h-auto sm:max-h-full sm:max-w-none
                                      sm:justify-start sm:min-h-full
                                      [&::-webkit-scrollbar]:hidden
                                      [&::-webkit-scrollbar]:sm:w-1
                                      [&::-webkit-scrollbar]:sm:hover:block
                                      [&::-webkit-scrollbar]:sm:translate-x-1
                                      [&::-webkit-scrollbar-thumb]:rounded-full
                                      [&::-webkit-scrollbar-thumb]:bg-white/20
                                      [&::-webkit-scrollbar-track]:bg-transparent
                                      sm:pr-2"
                        >
                            {cachedYears.map((year, index) => {
                                const isActive = activeYearIndex === index;
                                const isNow = year === 'current';

                                // Define base, size, and color classes
                                const barBaseClasses = 'rounded-sm transition-all duration-200 ease-out';
                                // Default: mobile sizes, sm: desktop sizes
                                const barSizeClasses = isActive
                                    ? 'h-1.5 w-12 sm:w-14 sm:h-1' // Active bar (mobile / desktop)
                                    : 'h-1 w-8 group-hover:w-10 sm:w-8 sm:h-0.5 group-hover:sm:w-10'; // Inactive bar (mobile / desktop)
                                const barColorClasses = isActive 
                                    ? (isNow ? 'bg-red-500' : 'bg-white') 
                                    : 'bg-white/30 group-hover:bg-white'; // Inactive color, white on hover (previously bg-neutral-600/70)

                                return (
                                    // Default: mobile layout (vertical stack), sm: desktop layout (horizontal)
                                    <div
                                        key={year}
                                        className="w-auto flex flex-col items-center justify-center h-full py-1 cursor-pointer group
                                                   sm:w-full sm:flex-row sm:items-center sm:justify-end sm:h-6 sm:py-0 sm:my-0.5"
                                        onClick={() => setActiveYearIndex(index)}
                                    >
                                        {/* Year Label - Default: mobile (always visible, dimmed inactive), sm: desktop (opacity change) */}
                                        <span
                                            className={`text-xs font-medium transition-colors duration-150 mb-1 whitespace-nowrap sm:mr-2 sm:mb-0 sm:transition-opacity ${ 
                                                          isActive 
                                                            ? (isNow ? 'text-red-400' : 'text-white')  // Active colors
                                                            : 'text-neutral-500 group-hover:text-neutral-300 sm:text-neutral-400' // Inactive colors (mobile base, hover, sm base)
                                                        } ${ 
                                                          isActive 
                                                            ? 'sm:opacity-100' // Active opacity
                                                            : (isNow ? 'sm:opacity-100' : 'sm:opacity-0 sm:group-hover:opacity-100') // Inactive opacity (Now always visible, others on hover)
                                                        }`}
                                        >
                                            {isNow ? 'Now' : year}
                                        </span>
                                        {/* Timeline Bar - Hidden on mobile, visible on desktop */}
                                        <div
                                            className={`${barBaseClasses} ${barSizeClasses} ${barColorClasses} hidden sm:block`}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Footer Bar - Use calc() for bottom padding: 0.5rem base + safe area */}
            <div className={`relative order-3 w-full mt-auto ${shaderEffectEnabled ? 'bg-neutral-900/80' : 'bg-neutral-900/60 backdrop-blur-sm'} border-t border-white/10 flex items-center justify-between px-4 z-20 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]
                           sm:absolute sm:bottom-0 sm:left-0 sm:right-0 sm:mt-0 sm:h-10 sm:pt-0 sm:pb-0`}>
              {/* Left spacer - Takes up same width as shader dropdown */}
              <div className="w-8 flex-shrink-0"></div>
              
              {/* Center URL and Travel button group */}
              <div className="flex items-center justify-center gap-3 flex-grow">
                <p className="text-sm text-neutral-300 truncate text-center">
                  {/* Show URL */}
                  {getHostname(currentUrl)}
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
              
              {/* Right shader menu - Always shown */}
              <div className="w-8 flex items-center justify-end">
                  {/* Shader selector dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full hover:bg-white/10"
                      >
                        <Blend size={16} className="text-neutral-300" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black border-[#3a3a3a] text-white">
                      {[...Object.values(ShaderType), 'off'].map((type) => {
                        const isSelected = type === 'off' ? !shaderEffectEnabled : (shaderEffectEnabled && selectedShaderType === type);
                        return (
                          <DropdownMenuItem
                            key={type}
                            className={cn(
                              "font-geneva-12 text-[12px] flex items-center justify-between",
                              isSelected && "bg-accent text-accent-foreground"
                            )}
                            onClick={() => {
                              if (type === 'off') {
                                setShaderEffectEnabled(false);
                              } else {
                                setShaderEffectEnabled(true);
                                setSelectedShaderType(type as ShaderType);
                              }
                            }}
                          >
                            {shaderNames[type as ShaderOption]}
                            {isSelected && (
                              <span className="ml-2">✓</span>
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TimeMachineView; 