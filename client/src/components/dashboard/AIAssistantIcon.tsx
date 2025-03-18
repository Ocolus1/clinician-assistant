import { useState, useRef } from "react";
import { Sparkles, Wand2, Zap, Lamp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MagicLampChat } from "./MagicLampChat";
import { IgniteLogo } from "./IgniteLogo";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";

interface AIAssistantIconProps {
  expanded: boolean;
}

/**
 * AI Assistant Icon component for the dock
 * Provides access to the Magic Lamp Chat through a floating button in the dock
 * Implements a two-step interaction:
 * 1. First click opens a lamp animation with a welcome message
 * 2. Second click (or "Let's chat" button) opens the full chat interface
 */
export function AIAssistantIcon({ expanded }: AIAssistantIconProps) {
  const [lampDialogOpen, setLampDialogOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const rubAnimationRef = useRef<any>(null);
  
  // Handle the transition from lamp dialog to chat dialog
  const handleChatOpen = () => {
    setLampDialogOpen(false);
    setTimeout(() => {
      setChatDialogOpen(true);
    }, 100);
  };
  
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
      
      {/* First Dialog - Magical Lamp Animation */}
      <Dialog open={lampDialogOpen} onOpenChange={setLampDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 bg-gradient-to-b from-black/95 to-blue-950/90 border border-blue-500/20 text-white overflow-hidden rounded-xl shadow-xl">
          <div className="relative h-[500px] flex flex-col items-center justify-center overflow-hidden">
            {/* Close button */}
            <DialogClose asChild className="absolute top-3 right-3 z-50">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
            
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
              {/* Stars */}
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-white"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    opacity: [0.1, 0.8, 0.1],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: Math.random() * 2,
                  }}
                />
              ))}
              
              {/* Cosmic dust */}
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent"
                style={{ transform: 'translate(-50%, -50%)', left: '50%', top: '50%', width: '200%', height: '200%' }}
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, 0, -5, 0],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
            
            {/* Magical Lamp Content */}
            <div className="z-10 flex flex-col items-center">
              {/* Digital energy animation */}
              <motion.div
                className="absolute w-40 h-40 rounded-full bg-gradient-to-t from-blue-500/20 via-blue-300/5 to-transparent"
                style={{ y: -60 }}
                animate={{
                  y: [-60, -120],
                  opacity: [0.2, 0],
                  scale: [1, 2],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              
              {/* The lamp */}
              <motion.div
                className="relative cursor-pointer"
                whileHover={{ scale: 1.05 }}
                animate={{
                  rotate: [-2, 2, -2],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                onHoverStart={() => {
                  if (rubAnimationRef.current) {
                    rubAnimationRef.current.start();
                  }
                }}
              >
                <motion.div
                  ref={rubAnimationRef}
                  className="absolute inset-0 rounded-xl bg-blue-400/30 blur-md"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 0.7,
                    scale: 1.2,
                  }}
                  transition={{
                    duration: 0.3,
                  }}
                />
                <div className="relative bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-900/50 border border-blue-300">
                  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-24 w-24">
                    <path d="M18.7102 4.00004H16.2L12.7001 11H15.2102L18.7102 4.00004Z" fill="white"/>
                    <path d="M22.9999 1L14.9999 16H8.99986L12.9999 8L8.99986 1H14.9999L22.9999 1Z" stroke="white" strokeWidth="1.5"/>
                    <path d="M1 1V23H6V8L1 1Z" stroke="white" strokeWidth="1.5"/>
                  </svg>
                </div>
                
                {/* Digital energy beam */}
                <motion.div
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full w-20 h-32 bg-gradient-to-t from-blue-300/40 to-transparent rounded-t-full origin-bottom"
                  animate={{
                    opacity: [0.3, 0.5, 0.3],
                    scaleY: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>
              
              {/* Assistant message */}
              <motion.div
                className="mt-12 text-center max-w-xs"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <h3 className="text-2xl font-bold text-blue-300 mb-2">
                  How Can I Help You Today?
                </h3>
                <p className="text-blue-100/80 mb-6">
                  I'm your Ignite therapy assistant. I can help with budget planning, session notes, and analytics.
                </p>
                <Button
                  onClick={handleChatOpen}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white border-none shadow-lg shadow-blue-900/30"
                >
                  <motion.span
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="flex items-center gap-2"
                  >
                    <Wand2 className="h-4 w-4" />
                    Let's Chat
                  </motion.span>
                </Button>
              </motion.div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Second Dialog - Full Chat Interface */}
      <Dialog open={chatDialogOpen} onOpenChange={setChatDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] p-0 bg-black/95 border border-white/20 text-white overflow-hidden">
          <MagicLampChat />
        </DialogContent>
      </Dialog>
      
      {/* Dock Icon Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setLampDialogOpen(true)}
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
            <svg width={expanded ? 26 : 22} height={expanded ? 26 : 22} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.7102 4.00004H16.2L12.7001 11H15.2102L18.7102 4.00004Z" fill="white"/>
              <path d="M22.9999 1L14.9999 16H8.99986L12.9999 8L8.99986 1H14.9999L22.9999 1Z" stroke="white" strokeWidth="1.5"/>
              <path d="M1 1V23H6V8L1 1Z" stroke="white" strokeWidth="1.5"/>
            </svg>
          </motion.div>
          {expanded && (
            <span className="text-xs mt-1 font-medium">Assistant</span>
          )}
        </div>
        
        {/* Sparkle effects */}
        <motion.div 
          className="absolute top-0 right-0 text-blue-300/70"
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
    </div>
  );
}