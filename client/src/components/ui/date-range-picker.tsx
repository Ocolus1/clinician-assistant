import * as React from "react";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
  showCompactDropdown?: boolean;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
  showCompactDropdown = false,
}: DateRangePickerProps) {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  // Predefined ranges
  const handleQuickSelect = (value: string) => {
    const today = new Date();
    
    switch (value) {
      case "last-7-days":
        onDateRangeChange({
          from: addDays(today, -7),
          to: today,
        });
        break;
      case "last-30-days":
        onDateRangeChange({
          from: addDays(today, -30),
          to: today,
        });
        break;
      case "last-90-days":
        onDateRangeChange({
          from: addDays(today, -90),
          to: today,
        });
        break;
      case "all-time":
        onDateRangeChange(undefined);
        break;
      default:
        break;
    }
    
    if (value !== "custom") {
      setIsPopoverOpen(false);
    }
  };

  // Format the displayed date range
  const formatDateRange = () => {
    if (!dateRange?.from) {
      return "All Time";
    }
    
    if (dateRange.from && !dateRange.to) {
      return `From ${format(dateRange.from, "MMM d, yyyy")}`;
    }
    
    if (dateRange.from && dateRange.to) {
      if (format(dateRange.from, "MMM yyyy") === format(dateRange.to, "MMM yyyy")) {
        // Same month, show "May 1-15, 2024"
        return `${format(dateRange.from, "MMM d")}${dateRange.to ? `-${format(dateRange.to, "d, yyyy")}` : ", " + format(dateRange.from, "yyyy")}`;
      }
      
      // Different months, show "May 1 - Jun 15, 2024"
      return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`;
    }
    
    return "Select date range";
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-range"
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal",
              !dateRange && "text-muted-foreground",
              showCompactDropdown ? "h-9 w-[240px]" : "w-[300px]"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex items-center border-b border-border p-3">
            <div className="flex-1 text-sm font-medium">Date Range</div>
            <Select
              onValueChange={handleQuickSelect}
              defaultValue={dateRange ? "custom" : "all-time"}
            >
              <SelectTrigger className="h-8 w-[150px]">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-time">All Time</SelectItem>
                <SelectItem value="last-7-days">Last 7 days</SelectItem>
                <SelectItem value="last-30-days">Last 30 days</SelectItem>
                <SelectItem value="last-90-days">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
            />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onDateRangeChange(undefined);
                setIsPopoverOpen(false);
              }}
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsPopoverOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}