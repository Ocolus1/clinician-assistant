import * as React from "react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Strategy } from "@shared/schema";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InlineStrategySelectorProps {
  selectedStrategies: string[];
  onChange: (strategies: string[]) => void;
  maxStrategies?: number;
  label?: string;
}

/**
 * An inline strategy selector component that allows selection of therapy strategies
 * and displays them as badges. Supports search and category filtering.
 */
export function InlineStrategySelector({
  selectedStrategies = [],
  onChange,
  maxStrategies = 5,
  label = "Strategies:"
}: InlineStrategySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Fetch strategies
  const { data: strategies = [] } = useQuery({
    queryKey: ["/api/strategies"],
    staleTime: 60 * 1000, // 1 minute cache
  });

  // Get unique categories from strategies
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set<string>();
    strategies.forEach((strategy: Strategy) => {
      if (strategy.category) {
        uniqueCategories.add(strategy.category);
      }
    });
    return Array.from(uniqueCategories).sort();
  }, [strategies]);

  // Filter strategies based on search and category
  const filteredStrategies = React.useMemo(() => {
    return strategies.filter((strategy: Strategy) => {
      const matchesSearch = !searchValue || 
        strategy.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        (strategy.description && strategy.description.toLowerCase().includes(searchValue.toLowerCase()));
      
      const matchesCategory = !selectedCategory || strategy.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [strategies, searchValue, selectedCategory]);

  // Close dropdown if maximum number of strategies is reached
  useEffect(() => {
    if (selectedStrategies.length >= maxStrategies) {
      setOpen(false);
    }
  }, [selectedStrategies, maxStrategies]);

  // Handle selecting a strategy
  const handleSelect = (strategyName: string) => {
    if (selectedStrategies.includes(strategyName)) {
      // If already selected, remove it
      onChange(selectedStrategies.filter(name => name !== strategyName));
    } else if (selectedStrategies.length < maxStrategies) {
      // If not at max, add it
      onChange([...selectedStrategies, strategyName]);
    }
  };

  // Handle removing a strategy
  const handleRemove = (strategyName: string) => {
    onChange(selectedStrategies.filter(name => name !== strategyName));
  };

  // Reset search and category when popover opens
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setSearchValue("");
      // Don't reset category to make it easier for users to find related strategies
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      
      <div className="flex flex-wrap gap-1.5">
        {selectedStrategies.map((strategyName, index) => (
          <Badge key={index} variant="outline" className="text-xs pl-2 pr-1 h-6 flex items-center gap-1">
            {strategyName}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-4 w-4 p-0 ml-1 rounded-full hover:bg-muted"
              onClick={() => handleRemove(strategyName)}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove</span>
            </Button>
          </Badge>
        ))}
        
        {selectedStrategies.length < maxStrategies && (
          <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                {selectedStrategies.length === 0 ? "Add Strategies" : "Add More"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-72" align="start">
              <Command>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  <CommandInput 
                    placeholder="Search strategies..." 
                    className="h-9 border-0 focus:ring-0 focus-visible:ring-0"
                    value={searchValue}
                    onValueChange={setSearchValue} 
                  />
                </div>
                
                {/* Category filter */}
                {categories.length > 0 && (
                  <div className="p-2 border-b">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      <Button
                        variant={selectedCategory === null ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs whitespace-nowrap"
                        onClick={() => setSelectedCategory(null)}
                      >
                        All
                      </Button>
                      
                      {categories.map(category => (
                        <Button
                          key={category}
                          variant={selectedCategory === category ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs whitespace-nowrap"
                          onClick={() => setSelectedCategory(category)}
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                <CommandList>
                  <ScrollArea className="h-52">
                    {filteredStrategies.length === 0 && (
                      <CommandEmpty>No strategies found</CommandEmpty>
                    )}
                    
                    <CommandGroup>
                      {filteredStrategies.map((strategy: Strategy) => {
                        const isSelected = selectedStrategies.includes(strategy.name);
                        
                        return (
                          <CommandItem
                            key={strategy.id}
                            value={strategy.name}
                            onSelect={() => handleSelect(strategy.name)}
                            className={cn(
                              "flex items-start py-2",
                              isSelected && "bg-primary/10"
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{strategy.name}</span>
                              {strategy.description && (
                                <span className="text-xs text-muted-foreground leading-tight mt-0.5">
                                  {strategy.description}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </ScrollArea>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
        
        {selectedStrategies.length >= maxStrategies && (
          <span className="text-xs text-muted-foreground italic px-1">
            (max {maxStrategies} strategies)
          </span>
        )}
      </div>
    </div>
  );
}