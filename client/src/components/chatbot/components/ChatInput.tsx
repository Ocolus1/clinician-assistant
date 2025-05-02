import React, { useRef } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";

interface ChatInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSendMessage: () => void;
  isTyping: boolean;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function ChatInput({
  inputValue,
  setInputValue,
  handleSendMessage,
  isTyping,
  handleKeyDown
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="p-4 border-t bg-white">
      <form 
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => { 
          e.preventDefault(); 
          if (inputValue.trim() && !isTyping) {
            handleSendMessage();
          }
        }} 
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-2">
          <Textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about patients, goals, progress, or sessions..."
            className="flex-1 min-h-[60px] max-h-[200px] resize-none"
          />
          <Button 
            type="submit"
            size="icon" 
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              if (inputValue.trim() && !isTyping) {
                handleSendMessage();
              }
            }}
            disabled={!inputValue.trim() || isTyping}
            className="h-10 w-10 rounded-full"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground text-center">
          This is a secure, read-only interface. Patient data is protected and cannot be modified through this chat.
        </div>
      </form>
    </div>
  );
}
