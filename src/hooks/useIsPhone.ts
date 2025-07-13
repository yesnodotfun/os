import { useState, useEffect } from "react";

export function useIsPhone(breakpoint = 640) {
  const [isPhone, setIsPhone] = useState(() => {
    if (typeof window === "undefined") return false;
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasSmallScreen = window.innerWidth < breakpoint;
    // Only consider it a phone if it has both touch screen and small screen
    return hasTouchScreen && hasSmallScreen;
  });

  useEffect(() => {
    const handleResize = () => {
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const hasSmallScreen = window.innerWidth < breakpoint;
      // Only consider it a phone if it has both touch screen and small screen
      setIsPhone(hasTouchScreen && hasSmallScreen);
    };

    // Set initial value
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [breakpoint]);

  return isPhone;
}