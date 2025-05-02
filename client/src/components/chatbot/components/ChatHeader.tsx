import React from 'react';
import { Avatar } from "@/components/ui/avatar";
import { Wand2 } from "lucide-react";

export function ChatHeader() {
  return (
    <div className="border-b p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-primary/10 flex items-center justify-center">
            <div className="flex justify-center items-center h-5 w-5 text-primary">
              <Wand2 className="h-5 w-5" />
            </div>
          </Avatar>
          <div>
            <div className="font-medium">Clinical Assistant</div>
            <div className="text-xs text-muted-foreground">
              AI-powered clinical support
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
          <span className="text-xs text-muted-foreground">Online</span>
        </div>
      </div>
    </div>
  );
}
