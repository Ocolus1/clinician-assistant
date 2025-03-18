import { useState } from "react";
import { Sparkles, Wand2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MagicLampChat } from "./MagicLampChat";
import { Dialog } from "@/components/ui/dialog";

interface AIAssistantIconProps {
  expanded: boolean;
}

/**
 * AI Assistant Icon component for the dock
 * Provides access to the Magic Lamp Chat through a floating button in the dock
 */
export function AIAssistantIcon({ expanded }: AIAssistantIconProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  return (
    <div className="relative">
      {/* Blue glow effect behind the button */}
      <motion.div 
        className="absolute inset-0 rounded-full bg-blue-500/30 blur-md"
        animate={{ 
          scale: [0.8, 1.2, 0.8], 
          opacity: [0.3, 0.6, 0.3] 
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDialogOpen(true)}
          className={cn(
            "relative z-10 rounded-full transition-all duration-300 bg-blue-600 hover:bg-blue-500 text-white hover:text-white",
            expanded ? "h-14 w-14 mx-2" : "h-12 w-12 mx-1"
          )}
        >
          <div className="flex flex-col items-center">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <Wand2 className={expanded ? "h-6 w-6" : "h-5 w-5"} />
            </motion.div>
            {expanded && (
              <span className="text-xs mt-1 font-medium">Assistant</span>
            )}
          </div>
          
          {/* Sparkle effects */}
          <motion.div 
            className="absolute top-0 right-0 text-yellow-300/70"
            animate={{ 
              scale: [0.8, 1.2, 0.8], 
              opacity: [0.5, 1, 0.5],
              rotate: [0, 20, 0] 
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            <Sparkles className="h-3 w-3" />
          </motion.div>
        </Button>
        
        {/* The dialog will be handled by the MagicLampChat component */}
        <div className="hidden">
          <MagicLampChat />
        </div>
      </Dialog>
    </div>
  );
}