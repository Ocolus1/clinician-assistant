import * as React from "react";

/**
 * Custom hook for responsive design
 * Returns true if the media query matches, false otherwise
 * 
 * @param query The media query to check (e.g., "(min-width: 768px)")
 * @returns Boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    
    // Set initial value
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Create listener function
    const listener = () => {
      setMatches(media.matches);
    };

    // Listen for changes
    media.addEventListener("change", listener);
    
    // Clean up
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}

/**
 * Predefined breakpoints for common screen sizes
 */
export const breakpoints = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
  landscape: "(orientation: landscape)",
  portrait: "(orientation: portrait)",
};