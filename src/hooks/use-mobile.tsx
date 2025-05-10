import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile(): boolean | undefined {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // Ensure window is defined (it will be in useEffect, but good practice)
    if (typeof window === 'undefined') {
        return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    // Set initial value after component mounts on client
    setIsMobile(mql.matches);

    // Add listener for changes
    // Using try-catch for addEventListener/addListener for broader browser compatibility, though modern browsers support addEventListener.
    try {
        mql.addEventListener('change', handleChange);
    } catch (e1) {
        try {
            // Fallback for older browsers
            mql.addListener(handleChange);
        } catch (e2) {
            console.error("Error adding media query listener", e2);
        }
    }

    // Cleanup listener on unmount
    return () => {
      try {
        mql.removeEventListener('change', handleChange);
      } catch (e1) {
        try {
            // Fallback for older browsers
            mql.removeListener(handleChange);
        } catch (e2) {
            console.error("Error removing media query listener", e2);
        }
      }
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount and cleans up on unmount

  return isMobile; // Return the state directly (will be undefined on server and initial client render)
}
