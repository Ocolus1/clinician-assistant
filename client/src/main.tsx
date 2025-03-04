import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import App from "./App";
import "./index.css";

// Create a wrapper component to handle global effects
function AppWithGlobalEffects() {
  // Effect to hide any rogue calendars that might appear
  useEffect(() => {
    // Function to hide unwanted calendars
    const hideUnwantedCalendars = () => {
      // Hide any calendar not properly contained
      const unwantedCalendars = document.querySelectorAll('.rdp:not([data-calendar-container="true"] .rdp, [data-state="open"] .rdp)');
      unwantedCalendars.forEach(calendar => {
        if (calendar && calendar.parentElement) {
          calendar.parentElement.classList.add('uncontained-calendar');
        }
      });
    };

    // Execute immediately
    hideUnwantedCalendars();
    
    // Set up a regular interval to check for and hide any calendars that appear
    const hideCalendarsInterval = setInterval(hideUnwantedCalendars, 200);
    
    // Clean up on unmount
    return () => {
      clearInterval(hideCalendarsInterval);
    };
  }, []);

  return <App />;
}

createRoot(document.getElementById("root")!).render(<AppWithGlobalEffects />);
