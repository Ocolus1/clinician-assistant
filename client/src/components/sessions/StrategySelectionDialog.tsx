import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Strategy } from "@shared/schema";
import { X, Search, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StrategySelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStrategies: string[];
  milestoneId: number;
  onSelectStrategy: (strategy: Strategy) => void;
  maxStrategies?: number;
}

export function StrategySelectionDialog({
  open,
  onOpenChange,
  selectedStrategies,
  milestoneId,
  onSelectStrategy,
  maxStrategies = 5
}: StrategySelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch all strategies
  const { data: strategies = [], isLoading } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
    enabled: open
  });

  // Filter strategies based on search term
  const filteredStrategies = strategies.filter(strategy => 
    strategy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    strategy.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    strategy.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group strategies by category
  const groupedStrategies = filteredStrategies.reduce<Record<string, Strategy[]>>((acc, strategy) => {
    if (!acc[strategy.category]) {
      acc[strategy.category] = [];
    }
    acc[strategy.category].push(strategy);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Strategies</DialogTitle>
          <DialogDescription>
            Choose up to {maxStrategies} strategies to use for this milestone
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search strategies..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="mb-2">
          <p className="text-sm text-muted-foreground">
            Selected: {selectedStrategies.length}/{maxStrategies}
          </p>
        </div>

        <ScrollArea className="flex-grow">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading strategies...</p>
            </div>
          ) : filteredStrategies.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No strategies found matching "{searchTerm}"
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedStrategies).map(([category, categoryStrategies]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium mb-2">{category}</h3>
                  <div className="space-y-2">
                    {categoryStrategies.map((strategy) => {
                      const isSelected = selectedStrategies.includes(strategy.name);
                      const isDisabled = !isSelected && selectedStrategies.length >= maxStrategies;
                      
                      return (
                        <div 
                          key={strategy.id}
                          className={`p-3 border rounded-md flex justify-between items-center cursor-pointer hover:bg-muted/20 ${isSelected ? 'bg-primary/10 border-primary/30' : ''} ${isDisabled ? 'opacity-50' : ''}`}
                          onClick={() => {
                            if (!isDisabled || isSelected) {
                              onSelectStrategy(strategy);
                            }
                          }}
                        >
                          <div className="flex-1">
                            <p className="font-medium">{strategy.name}</p>
                          </div>
                          
                          {strategy.description && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-muted-foreground">
                                    <Info className="h-4 w-4" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <p>{strategy.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}