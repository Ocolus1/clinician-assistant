import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

/**
 * Helper function to format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface ClientExpirationData {
  clientId: number;
  clientName: string;
  planId: number;
  planName: string;
  daysLeft?: number;
  unutilizedAmount?: number;
  unutilizedPercentage?: number;
}

export interface BudgetExpirationTimelineProps {
  clients: ClientExpirationData[];
  maxDays?: number;
  showStatistics?: boolean;
  showHeader?: boolean;
  compact?: boolean;
}

/**
 * Budget Expiration Timeline Component
 * 
 * Displays a horizontal timeline visualization of expiring budget plans
 * Groups clients by urgency and shows funds at risk
 */
export function BudgetExpirationTimeline({
  clients,
  maxDays = 30,
  showStatistics = true,
  showHeader = true,
  compact = false
}: BudgetExpirationTimelineProps) {
  const [, setLocation] = useLocation();
  
  // Group clients by urgency
  const criticalClients = clients.filter(client => (client.daysLeft || maxDays) <= 7);
  const urgentClients = clients.filter(client => (client.daysLeft || maxDays) > 7 && (client.daysLeft || maxDays) <= 14);
  const monitoringClients = clients.filter(client => (client.daysLeft || maxDays) > 14);
  
  // Calculate total funds at risk
  const totalFundsAtRisk = clients.reduce((sum, client) => sum + (client.unutilizedAmount || 0), 0);
  
  // Generate timeline data with categories and styling information
  const timelineData = clients.map(client => {
    const daysLeft = client.daysLeft || maxDays;
    const unutilizedAmount = client.unutilizedAmount || 0;
    const unutilizedPercentage = client.unutilizedPercentage || 0;
    
    // Calculate urgency category and color
    let urgencyCategory = 'monitoring';
    let colorIntensity = 0.2;
    
    if (daysLeft <= 7) {
      urgencyCategory = 'critical';
      colorIntensity = 1;
    } else if (daysLeft <= 14) {
      urgencyCategory = 'urgent';
      colorIntensity = 0.6;
    }
    
    return {
      ...client,
      daysLeft,
      unutilizedAmount,
      unutilizedPercentage,
      urgencyCategory,
      colorIntensity
    };
  });

  if (clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-muted-foreground text-sm">
        No plans expiring in the next {maxDays} days
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Summary statistics */}
      {showStatistics && (
        <div className="flex items-center justify-end gap-3 text-xs mb-1">
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full bg-red-600 mr-1"></div>
            <span className="text-muted-foreground">
              {criticalClients.length} critical
            </span>
          </div>
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full bg-amber-500 mr-1"></div>
            <span className="text-muted-foreground">
              {urgentClients.length} urgent
            </span>
          </div>
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full bg-blue-400 mr-1"></div>
            <span className="text-muted-foreground">
              {monitoringClients.length} monitoring
            </span>
          </div>
          <div className="border-l border-gray-200 pl-2">
            <span className="font-medium">
              {formatCurrency(totalFundsAtRisk)} at risk
            </span>
          </div>
        </div>
      )}
      
      {/* Timeline visualization */}
      <div className={`bg-slate-50 p-2 border rounded-md ${compact ? 'text-xs' : ''}`}>
        {showHeader && (
          <div className="w-full flex items-center text-xs mb-1">
            <span className={compact ? "w-20" : "w-32"} className="text-muted-foreground">Client</span>
            <div className="flex-1 flex items-center">
              <span className="text-red-600 font-medium">Critical</span>
              <div className="h-0.5 flex-1 bg-gradient-to-r from-red-600 via-amber-500 to-blue-400 mx-1"></div>
              <span className="text-blue-400">Monitoring</span>
            </div>
            <span className={compact ? "w-16" : "w-24"} className="text-right text-muted-foreground">Funds at risk</span>
          </div>
        )}
        
        {timelineData.sort((a, b) => (a.daysLeft - b.daysLeft)).map((client) => {
          // Get values from the client data
          const daysLeft = client.daysLeft;
          const unutilizedAmount = client.unutilizedAmount; 
          const unutilizedPercentage = client.unutilizedPercentage;
          
          // Calculate position on the timeline (maxDays max)
          const position = Math.min(daysLeft / maxDays, 1) * 100;
          
          // Determine color based on days left
          let color = '#3B82F6'; // blue-500
          if (daysLeft <= 7) {
            color = '#DC2626'; // red-600
          } else if (daysLeft <= 14) {
            color = '#F59E0B'; // amber-500
          }
          
          return (
            <div 
              key={`${client.clientId}-${client.planId}`}
              className="flex items-center mb-1.5 group hover:bg-slate-100 px-1 py-0.5 rounded"
            >
              <div className={compact ? "w-20" : "w-32"} className="truncate text-sm font-medium">{client.clientName}</div>
              <div className="flex-1 relative h-6">
                {/* Timeline bar */}
                <div className="absolute top-0 left-0 w-full h-full bg-gray-100 rounded-full"></div>
                
                {/* Position marker */}
                <div 
                  className="absolute top-0 h-6 flex items-center justify-center"
                  style={{ left: `${position}%` }}
                >
                  <div 
                    className="h-4 w-4 rounded-full border-2 border-white transition-all group-hover:h-5 group-hover:w-5"
                    style={{ 
                      backgroundColor: color,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                  ></div>
                </div>
                
                {/* Days indicator (only shown on hover) */}
                <div 
                  className="absolute top-[-18px] opacity-0 group-hover:opacity-100 transition-opacity bg-white text-xs font-medium shadow rounded px-1 py-0.5"
                  style={{ 
                    left: `${position}%`, 
                    transform: 'translateX(-50%)',
                    border: `1px solid ${color}`
                  }}
                >
                  {daysLeft} days
                </div>
              </div>
              
              <div className={compact ? "w-16" : "w-24"} className="text-right">
                <div className="text-sm font-medium">
                  {formatCurrency(unutilizedAmount)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {unutilizedPercentage}% unused
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation(`/client/${client.clientId}/budget`)}
                className="ml-1 h-6 w-6 p-0"
              >
                <ArrowRight className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}