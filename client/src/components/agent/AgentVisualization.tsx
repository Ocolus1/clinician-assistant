import React from 'react';
import { useAgent } from './AgentContext';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { CombinedInsights } from './CombinedInsights';
import { BudgetAnalysis, ProgressAnalysis, VisualizationHint } from '@/lib/agent/types';

interface AgentVisualizationProps {
  type?: VisualizationHint;
  clientName?: string;
}

export default function AgentVisualization({ type, clientName }: AgentVisualizationProps) {
  const { conversationHistory, activeClient } = useAgent();
  
  // Get the latest message with data
  const latestMessageWithData = [...conversationHistory]
    .reverse()
    .find(message => message.role === 'assistant' && message.data);
  
  // If no visualization data is available
  if (!latestMessageWithData?.data) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No visualization data is available yet. Ask a question about budget utilization or client progress to see visualizations.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Use client name from props or from active client
  const displayClientName = clientName || activeClient?.name || 'this client';
  
  // Render different visualizations based on type
  switch (type) {
    case 'BUBBLE_CHART':
      return <BudgetVisualization data={latestMessageWithData.data} />;
    case 'PIE_CHART':
      return <BudgetVisualization data={latestMessageWithData.data} />;
    case 'PROGRESS_CHART':
      return <ProgressVisualization data={latestMessageWithData.data} />;
    case 'COMBINED_INSIGHTS':
      return (
        <CombinedInsights 
          budgetData={latestMessageWithData.data.budgetData as BudgetAnalysis} 
          progressData={latestMessageWithData.data.progressData as ProgressAnalysis}
          clientName={displayClientName}
        />
      );
    default:
      // Auto-select visualization based on data type
      if (latestMessageWithData.data.budgetData && latestMessageWithData.data.progressData) {
        return (
          <CombinedInsights 
            budgetData={latestMessageWithData.data.budgetData as BudgetAnalysis} 
            progressData={latestMessageWithData.data.progressData as ProgressAnalysis}
            clientName={displayClientName}
          />
        );
      } else if (latestMessageWithData.data.totalBudget !== undefined) {
        return <BudgetVisualization data={latestMessageWithData.data} />;
      } else if (latestMessageWithData.data.overallProgress !== undefined) {
        return <ProgressVisualization data={latestMessageWithData.data} />;
      } else {
        return (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Ask a question about budget utilization or client progress to see visualizations.
            </AlertDescription>
          </Alert>
        );
      }
  }
}

// Budget visualization component
function BudgetVisualization({ data }: { data: any }) {
  // Extract data for visualization
  const { 
    spendingByCategory, 
    totalBudget, 
    totalSpent, 
    remaining, 
    utilizationRate,
    spendingPatterns,
    spendingVelocity
  } = data;
  
  if (!spendingByCategory) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Budget data is not available for visualization.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Prepare data for pie chart with enhanced visuals
  const pieData = Object.entries(spendingByCategory).map(([category, amount]: [string, any]) => {
    // Check if this is a high usage or projected overage category
    const isHighUsage = spendingPatterns?.highUsageCategories?.includes(category) || false;
    const isProjectedOverage = spendingPatterns?.projectedOverages?.includes(category) || false;
    
    // Adjust color based on category status
    let baseColor = getRandomColor(category);
    if (isProjectedOverage) {
      // Use red tint for categories projected to exceed budget
      baseColor = '#ff6b6b';
    } else if (isHighUsage) {
      // Use amber tint for high usage categories
      baseColor = '#ffb347';
    }
    
    return {
      id: category,
      label: category,
      value: amount,
      color: baseColor,
      isHighUsage,
      isProjectedOverage
    };
  });
  
  // Get trend information and format for display
  const trendInfo = spendingPatterns?.trend || 'stable';
  const trendEmoji = 
    trendInfo === 'increasing' ? '↗️' :
    trendInfo === 'decreasing' ? '↘️' :
    trendInfo === 'fluctuating' ? '↔️' : '→';
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Budget Utilization</span>
          <span className="text-sm font-normal px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
            Trend: {trendEmoji} {trendInfo.charAt(0).toUpperCase() + trendInfo.slice(1)}
          </span>
        </CardTitle>
        <CardDescription>
          Spending breakdown by category
        </CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsivePie
          data={pieData}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          innerRadius={0.5}
          padAngle={0.7}
          cornerRadius={3}
          activeOuterRadiusOffset={8}
          colors={{ scheme: 'category10' }}
          borderWidth={1}
          borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsTextColor="#333333"
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: 'color' }}
          arcLabelsSkipAngle={10}
          arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
          tooltip={(props) => {
            const { datum } = props;
            const isHighUsage = datum.data.isHighUsage;
            const isProjectedOverage = datum.data.isProjectedOverage;
            
            return (
              <div
                style={{
                  padding: 12,
                  background: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: 4
                }}
              >
                <strong>{String(datum.id)}: </strong>
                ${Number(datum.value).toFixed(2)}
                {isHighUsage && <div className="text-amber-600 text-xs mt-1">High usage category</div>}
                {isProjectedOverage && <div className="text-red-600 text-xs mt-1">⚠️ Projected to exceed budget</div>}
              </div>
            );
          }}
        />
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex justify-between text-sm w-full">
          <div>Total Budget: ${totalBudget?.toFixed(2) || 0}</div>
          <div>Spent: ${totalSpent?.toFixed(2) || 0}</div>
          <div>Remaining: ${remaining?.toFixed(2) || 0}</div>
        </div>
        
        {/* Add insights section */}
        {spendingPatterns?.projectedOverages && spendingPatterns.projectedOverages.length > 0 && (
          <div className="text-xs text-red-600 font-medium w-full">
            ⚠️ Attention: {spendingPatterns.projectedOverages.join(', ')} {spendingPatterns.projectedOverages.length === 1 ? 'is' : 'are'} projected to exceed budget allocation.
          </div>
        )}
        
        {/* Budget depletion prediction */}
        <div className="text-xs text-slate-600 dark:text-slate-400 w-full">
          At current spending rate ({trendEmoji}), budget will be depleted by {data.forecastedDepletion?.toLocaleDateString() || 'unknown date'}.
        </div>
      </CardFooter>
    </Card>
  );
}

// Progress visualization component
function ProgressVisualization({ data }: { data: any }) {
  const { goalProgress, overallProgress, attendanceRate, sessionsCompleted, sessionsCancelled } = data;
  
  if (!goalProgress || goalProgress.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Progress data is not available for visualization.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Prepare data for bar chart with enhanced insights
  const barData = goalProgress.map((goal: any) => {
    // Calculate milestone completion rate
    const completedMilestones = goal.milestones ? 
      goal.milestones.filter((m: any) => m.completed).length : 0;
    const totalMilestones = goal.milestones ? goal.milestones.length : 0;
    const milestoneRate = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
    
    // Get average rating for milestones if available
    const ratingsAvailable = goal.milestones && goal.milestones.some((m: any) => m.lastRating !== undefined);
    let avgRating = 0;
    
    if (ratingsAvailable) {
      const ratedMilestones = goal.milestones.filter((m: any) => m.lastRating !== undefined);
      const sumRatings = ratedMilestones.reduce((sum: number, m: any) => sum + (m.lastRating || 0), 0);
      avgRating = ratedMilestones.length > 0 ? sumRatings / ratedMilestones.length : 0;
    }
    
    // Determine if progress is on track
    const isOnTrack = goal.progress >= 50;
    
    return {
      goal: goal.goalTitle.length > 20 
        ? goal.goalTitle.substring(0, 20) + '...' 
        : goal.goalTitle,
      progress: goal.progress,
      milestoneRate,
      avgRating: avgRating > 0 ? avgRating : null,
      isOnTrack,
      color: isOnTrack ? '#4caf50' : '#ff9800',
      goalId: goal.goalId
    };
  });
  
  // Sort goals by progress to highlight top and bottom performers
  const sortedBarData = [...barData].sort((a, b) => b.progress - a.progress);
  
  // Calculate session metrics
  const totalSessions = sessionsCompleted + sessionsCancelled;
  const attendanceRateColor = 
    attendanceRate >= 80 ? 'text-green-600' :
    attendanceRate >= 60 ? 'text-amber-600' : 'text-red-600';
  
  // Calculate progress trend (if we had historical data, this would be more dynamic)
  const progressTrend = "steady"; // Placeholder - in a real app this would be calculated from historical data
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Client Goal Progress</span>
          <span className="text-sm font-normal px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
            Overall: {overallProgress?.toFixed(1) || 0}%
          </span>
        </CardTitle>
        <CardDescription>
          Progress across different therapy goals
        </CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveBar
          data={sortedBarData}
          keys={['progress']}
          indexBy="goal"
          margin={{ top: 10, right: 10, bottom: 50, left: 60 }}
          padding={0.3}
          valueScale={{ type: 'linear', max: 100 }}
          indexScale={{ type: 'band', round: true }}
          colors={d => d.data.color || '#3b82f6'}
          borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: 'Goal',
            legendPosition: 'middle',
            legendOffset: 40
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Progress (%)',
            legendPosition: 'middle',
            legendOffset: -50
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
          animate={true}
          tooltip={({ data, value }) => (
            <div
              style={{
                padding: 12,
                background: '#fff',
                border: '1px solid #ccc',
                borderRadius: 4
              }}
            >
              <strong>{data.goal}: </strong>
              {value.toFixed(1)}% complete
              {data.milestoneRate !== undefined && (
                <div className="text-xs mt-1">
                  Milestone completion: {data.milestoneRate.toFixed(1)}%
                </div>
              )}
              {data.avgRating !== null && (
                <div className="text-xs mt-1">
                  Average rating: {data.avgRating.toFixed(1)}/5
                </div>
              )}
              <div className={`text-xs mt-1 ${data.isOnTrack ? 'text-green-600' : 'text-amber-600'}`}>
                {data.isOnTrack ? '✓ On track' : '⚠️ Needs attention'}
              </div>
            </div>
          )}
        />
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex justify-between text-sm w-full">
          <div>Sessions Completed: <span className="font-medium">{sessionsCompleted || 0}</span></div>
          <div>Sessions Cancelled: <span className="font-medium">{sessionsCancelled || 0}</span></div>
          <div>Attendance Rate: <span className={`font-medium ${attendanceRateColor}`}>{attendanceRate?.toFixed(1) || 0}%</span></div>
        </div>
        
        {/* Goal insights */}
        {sortedBarData.length > 0 && (
          <div className="text-xs text-slate-600 dark:text-slate-400 w-full">
            {sortedBarData[0].progress > 70 && (
              <div className="text-green-600">
                ✓ Excellent progress on "{sortedBarData[0].goal}" at {sortedBarData[0].progress.toFixed(1)}%.
              </div>
            )}
            
            {sortedBarData.length > 1 && sortedBarData[sortedBarData.length-1].progress < 30 && (
              <div className="text-amber-600">
                ⚠️ Goal "{sortedBarData[sortedBarData.length-1].goal}" may need additional attention ({sortedBarData[sortedBarData.length-1].progress.toFixed(1)}%).
              </div>
            )}
          </div>
        )}
        
        {/* Attendance insight */}
        {attendanceRate !== undefined && attendanceRate < 70 && (
          <div className="text-xs text-amber-600 font-medium w-full">
            ⚠️ Attendance rate is below target. Consider discussing attendance challenges with the client.
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

// Helper function to generate consistent colors for categories
function getRandomColor(str: string): string {
  // Simple hash function to generate a consistent color for a string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to hex color
  const c = (hash & 0x00FFFFFF)
    .toString(16)
    .toUpperCase()
    .padStart(6, '0');
    
  return `#${c}`;
}