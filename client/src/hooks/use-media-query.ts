import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design
 * Track when a media query condition is met
 * @param query The media query to evaluate (e.g. '(min-width: 768px)')
 * @returns Boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    // Set initial value
    setMatches(mediaQuery.matches);

    // Handle change
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Safari < 14 doesn't support addEventListener on mediaQuery
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // @ts-ignore - For Safari < 14
      mediaQuery.addListener(handler);
    }

    return () => {
      // Clean up
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        // @ts-ignore - For Safari < 14
        mediaQuery.removeListener(handler);
      }
    };
  }, [query]);

  return matches;
}

export default useMediaQuery;