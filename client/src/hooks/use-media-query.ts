import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design
 * 
 * @param query CSS media query string (e.g., '(max-width: 768px)')
 * @returns Boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with the current match state (false on SSR)
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Create the media query list
    const mediaQuery = window.matchMedia(query);
    
    // Set the initial value
    setMatches(mediaQuery.matches);

    // Define a callback function to handle changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add event listener for the media query
    mediaQuery.addEventListener('change', handleChange);

    // Clean up the event listener on component unmount
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]); // Re-run effect if query changes

  return matches;
}

// Predefined media queries for common breakpoints (Tailwind CSS defaults)
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
  
  // Inverse breakpoints (max-width)
  smDown: '(max-width: 639px)',
  mdDown: '(max-width: 767px)',
  lgDown: '(max-width: 1023px)',
  xlDown: '(max-width: 1279px)',
  '2xlDown': '(max-width: 1535px)',
};

// Convenience hooks for common breakpoints
export function useIsMobile(): boolean {
  return useMediaQuery(breakpoints.smDown);
}

export function useIsTablet(): boolean {
  return useMediaQuery(`(min-width: 640px) and (max-width: 1023px)`);
}

export function useIsDesktop(): boolean {
  return useMediaQuery(breakpoints.lg);
}

export default useMediaQuery;