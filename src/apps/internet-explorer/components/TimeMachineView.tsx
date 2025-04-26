import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface TimeMachineViewProps {
  isOpen: boolean;
  onClose: () => void;
  cachedYears: string[];
  currentUrl: string;
  onSelectYear: (year: string) => void;
}

const TimeMachineView: React.FC<TimeMachineViewProps> = ({
  isOpen,
  onClose,
  cachedYears,
  currentUrl,
  onSelectYear,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Reset index when years change or view opens/closes
  useEffect(() => {
    setSelectedIndex(0);
  }, [cachedYears, isOpen]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prevIndex) => Math.min(prevIndex + 1, cachedYears.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (cachedYears[selectedIndex]) {
        onSelectYear(cachedYears[selectedIndex]);
        onClose();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }, [isOpen, cachedYears, selectedIndex, onSelectYear, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  const getHostname = (targetUrl: string): string => {
    try {
      return new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`).hostname;
    } catch {
      return targetUrl;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-8 font-geneva-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose} // Close on backdrop click
        >
          <motion.div
            className="bg-neutral-800/50 border border-neutral-600 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-700">
              <h2 className="text-lg text-neutral-200">
                Time Machine: <span className="font-bold text-white">{getHostname(currentUrl)}</span>
              </h2>
              <button 
                onClick={onClose}
                className="text-neutral-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                aria-label="Close Time Machine"
              >
                <X size={20} />
              </button>
            </div>

            {/* Year List */}
            <div className="flex-1 overflow-y-auto p-4">
              {cachedYears.length === 0 ? (
                <p className="text-neutral-400 text-center py-8">No cached versions found for this URL.</p>
              ) : (
                <ul className="space-y-1">
                  {cachedYears.map((year, index) => (
                    <li key={year}>
                      <button
                        className={`w-full text-left px-3 py-2 rounded ${
                          selectedIndex === index
                            ? 'bg-blue-600 text-white'
                            : 'text-neutral-300 hover:bg-neutral-700/60'
                        } transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-800`}
                        onClick={() => {
                          onSelectYear(year);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        Year: <span className="font-semibold">{year}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TimeMachineView; 