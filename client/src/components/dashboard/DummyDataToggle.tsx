import React from 'react';
import { useDashboard } from './DashboardProvider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { InfoIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * A component that allows toggling between real and dummy data
 * Only visible in development environments
 */
export function DummyDataToggle() {
  const { dataSource, setDataSource } = useDashboard();
  
  // Handle toggle change
  const handleToggleChange = (checked: boolean) => {
    setDataSource(checked ? 'dummy' : 'real');
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-full border">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <Switch
                id="dummy-data-toggle"
                checked={dataSource === 'dummy'}
                onCheckedChange={handleToggleChange}
                className="data-[state=checked]:bg-green-600"
              />
              <Label
                htmlFor="dummy-data-toggle"
                className="ml-2 text-xs font-medium cursor-pointer"
              >
                Dummy Data
              </Label>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="text-xs">
              <p className="font-semibold mb-1">Dummy Data Mode</p>
              <p className="mb-2">
                Toggle to use rich, varied dummy data instead of API data. 
                This helps with UI development and testing.
              </p>
              <div className="flex items-center gap-1">
                <InfoIcon className="h-3 w-3 text-blue-400" />
                <span className="text-blue-400">
                  Add <code className="bg-background/70 px-1 rounded">?dummy=true</code> to URL to enable automatically.
                </span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {dataSource === 'dummy' && (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
          USING DUMMY DATA
        </Badge>
      )}
    </div>
  );
}