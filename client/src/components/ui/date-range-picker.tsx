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
  SelectValue 
} from "@/components/ui/select";

interface DateRangePickerProps {
  className?: string;
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  enablePresets?: boolean;
  align?: "start" | "center" | "end";
  showAllTime?: boolean;
}

export function DateRangePicker({
  className,
  value,
  onChange,
  enablePresets = true,
  align = "start",
  showAllTime = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Predefined date ranges for quick selection
  const presets = [
    {
      label: "Last 7 days",
      dateRange: {
        from: addDays(new Date(), -7),
        to: new Date(),
      },
    },
    {
      label: "Last 30 days",
      dateRange: {
        from: addDays(new Date(), -30),
        to: new Date(),
      },
    },
    {
      label: "Last 90 days",
      dateRange: {
        from: addDays(new Date(), -90),
        to: new Date(),
      },
    },
    {
      label: "Last 180 days",
      dateRange: {
        from: addDays(new Date(), -180),
        to: new Date(),
      },
    },
  ];

  // Handle preset selection
  const handlePresetChange = (preset: string) => {
    const selectedPreset = presets.find((p) => p.label === preset);
    if (selectedPreset) {
      onChange(selectedPreset.dateRange);
      setIsOpen(false);
    } else if (preset === "all-time") {
      onChange(undefined);
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-auto justify-start text-left font-normal",
              !value && showAllTime
                ? "text-blue-600 border-blue-200 bg-[#EBF5FF] hover:bg-blue-100 hover:text-blue-700 font-medium"
                : !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className={cn("mr-2 h-4 w-4", !value && showAllTime ? "text-blue-600" : "")} />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} -{" "}
                  {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>
                {showAllTime ? "All Time" : "Pick a date range"}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          {enablePresets && (
            <div className="flex items-center justify-between space-x-2 p-3 pb-0">
              <Select
                onValueChange={handlePresetChange}
                defaultValue="custom"
              >
                <SelectTrigger className="h-8 w-[150px]">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent position="popper">
                  {showAllTime && (
                    <SelectItem className="text-blue-600 hover:bg-[#EBF5FF] hover:text-blue-700 font-medium" value="all-time">All Time</SelectItem>
                  )}
                  <SelectItem value="custom">Custom Range</SelectItem>
                  {presets.map((preset) => (
                    <SelectItem key={preset.label} value={preset.label}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            className={cn(
              "p-3",
              enablePresets ? "pt-2" : ""
            )}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}