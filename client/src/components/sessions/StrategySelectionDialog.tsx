import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Check,
  Search,
  Bookmark,
  BookMarked,
  ShieldCheck,
  Lightbulb
} from "lucide-react";

import { Strategy } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StrategySelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStrategies: string[];
  milestoneId: number;
  onSelectStrategy: (strategy: Strategy) => void;
  maxStrategies?: number;
}

const STRATEGY_CATEGORIES = [
  { id: "all", name: "All Strategies" },
  { id: "communication", name: "Communication" },
  { id: "social", name: "Social Skills" },
  { id: "cognitive", name: "Cognitive" },
  { id: "sensory", name: "Sensory" },
  { id: "motor", name: "Motor Skills" },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "communication":
      return <Bookmark className="h-4 w-4 mr-2" />;
    case "social":
      return <ShieldCheck className="h-4 w-4 mr-2" />;
    case "cognitive":
      return <Lightbulb className="h-4 w-4 mr-2" />;
    case "sensory":
      return <BookMarked className="h-4 w-4 mr-2" />;
    default:
      return null;
  }
};

export function StrategySelectionDialog({
  open,
  onOpenChange,
  selectedStrategies,
  milestoneId,
  onSelectStrategy,
  maxStrategies = 5
}: StrategySelectionDialogProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch strategies
  const { data: strategies = [] } = useQuery({
    queryKey: ["/api/strategies"],
  });
  
  // Filter strategies based on category and search query
  const filteredStrategies = strategies.filter((strategy) => {
    // Filter by category
    const categoryMatch = 
      activeCategory === "all" || 
      strategy.category === activeCategory;
    
    // Filter by search query
    const searchMatch = 
      !searchQuery || 
      strategy.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      strategy.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return categoryMatch && searchMatch;
  });
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select Strategies</DialogTitle>
          <DialogDescription>
            Choose up to {maxStrategies} strategies to help achieve this milestone.
            <Badge variant="outline" className="ml-2">
              {selectedStrategies.length}/{maxStrategies} selected
            </Badge>
          </DialogDescription>
        </DialogHeader>
        
        <div className="mb-4 flex items-center border rounded-md">
          <Search className="ml-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search strategies..."
            className="border-0 focus-visible:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 mb-4">
            {STRATEGY_CATEGORIES.map(category => (
              <TabsTrigger key={category.id} value={category.id} className="text-xs">
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <ScrollArea className="flex-grow h-[300px] rounded-md border p-4">
            <div className="space-y-2">
              {filteredStrategies.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">
                  No strategies found matching your criteria
                </div>
              ) : (
                filteredStrategies.map((strategy) => {
                  const isSelected = selectedStrategies.includes(strategy.id.toString());
                  const isDisabled = !isSelected && selectedStrategies.length >= maxStrategies;
                  
                  return (
                    <div
                      key={strategy.id}
                      className={cn(
                        "p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                        isSelected && "border-primary/40 bg-primary/5",
                        isDisabled && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => {
                        if (!isDisabled || isSelected) {
                          onSelectStrategy(strategy);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium flex items-center">
                          {getCategoryIcon(strategy.category || "")}
                          {strategy.name}
                          {isSelected && (
                            <Check className="h-4 w-4 ml-2 text-primary" />
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {strategy.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {strategy.description}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}