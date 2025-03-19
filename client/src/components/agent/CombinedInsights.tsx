import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CircleCheck, CircleAlert, TrendingUp, TrendingDown, AlertTriangle, Gem, DollarSign, BarChart } from 'lucide-react';
import { BudgetAnalysis, ProgressAnalysis } from '@/lib/agent/types';

interface CombinedInsightsProps {
  budgetData: BudgetAnalysis;
  progressData: ProgressAnalysis;
  clientName?: string;
}

export function CombinedInsights({ budgetData, progressData, clientName = 'Client' }: CombinedInsightsProps) {
  // Validate that we have both datasets
  if (!budgetData || !progressData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Complete data is not available for combined insights visualization.
        </AlertDescription>
      </Alert>
    );
  }

  // Calculate key metrics for visualization
  const utilizationRate = budgetData.utilizationRate;
  const progressRate = progressData.overallProgress;
  const attendanceRate = progressData.attendanceRate;
  const remainingBudgetPercent = 100 - utilizationRate;
  
  // Calculate ROI metrics
  const costPerProgressPoint = progressRate > 0 
    ? budgetData.totalSpent / progressRate
    : budgetData.totalSpent;
  
  // Determine trend indicators
  const budgetTrend = budgetData.spendingPatterns?.trend || 'stable';
  const budgetTrendIndicator = 
    budgetTrend === 'increasing' ? <TrendingUp className="h-4 w-4 text-amber-500" /> :
    budgetTrend === 'decreasing' ? <TrendingDown className="h-4 w-4 text-green-500" /> :
    null;
  
  // Calculate therapy efficiency and generate status indicators
  const isEfficient = costPerProgressPoint < 100 && progressRate > 50;
  const isInefficient = costPerProgressPoint > 200 || (progressRate < 30 && utilizationRate > 50);
  const hasAttendanceChallenges = attendanceRate < 70;
  
  // Prepare combined comparison data for visualization
  const comparisonData = [
    {
      metric: 'Budget Utilization',
      value: utilizationRate,
      target: 100,
      color: utilizationRate > 90 ? '#ff6b6b' : 
             utilizationRate > 70 ? '#ffb347' : '#4caf50'
    },
    {
      metric: 'Goal Progress',
      value: progressRate,
      target: 100,
      color: progressRate > 70 ? '#4caf50' : 
             progressRate > 40 ? '#ffb347' : '#ff6b6b'
    },
    {
      metric: 'Attendance Rate',
      value: attendanceRate,
      target: 90,
      color: attendanceRate > 80 ? '#4caf50' : 
             attendanceRate > 60 ? '#ffb347' : '#ff6b6b'
    }
  ];
  
  // Prepare efficiency data for visualization
  const efficiencyData = [
    {
      id: 'Budget',
      label: 'Budget',
      value: utilizationRate,
      color: '#3b82f6'
    },
    {
      id: 'Progress',
      label: 'Progress',
      value: progressRate,
      color: '#4caf50'
    }
  ];
  
  // Prepare goal data by progress
  const goalProgressData = progressData.goalProgress
    .map(goal => ({
      goalId: goal.goalId,
      goal: goal.goalTitle.length > 15 
        ? goal.goalTitle.substring(0, 15) + '...' 
        : goal.goalTitle,
      progress: goal.progress,
      color: goal.progress > 70 ? '#4caf50' : 
             goal.progress > 40 ? '#ffb347' : '#ff6b6b'
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5); // Limit to top 5 goals
  
  // Prepare spending data by category
  const spendingData = budgetData.spendingByCategory 
    ? Object.entries(budgetData.spendingByCategory)
      .map(([category, amount]: [string, number]) => {
        // Check if this is a high usage or projected overage category
        const isHighUsage = budgetData.spendingPatterns?.highUsageCategories.includes(category);
        const isProjectedOverage = budgetData.spendingPatterns?.projectedOverages.includes(category);
        
        return {
          id: category,
          label: category,
          value: amount,
          color: isProjectedOverage ? '#ff6b6b' : 
                isHighUsage ? '#ffb347' : '#3b82f6',
          isHighUsage,
          isProjectedOverage
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 4) // Limit to top 4 categories
    : [];
  
  return (
    <div className="space-y-4">
      {/* Header Card with Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Combined Insights for {clientName}</CardTitle>
          <CardDescription>
            Budget-to-Progress relationship analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Budget Status */}
            <div className="flex flex-col p-3 bg-slate-50 dark:bg-slate-900 rounded-md">
              <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                <DollarSign className="h-3.5 w-3.5" />
                Budget Status
              </div>
              <div className="text-lg font-semibold">${budgetData.remaining.toFixed(2)} remaining</div>
              <div className="text-sm">
                {remainingBudgetPercent.toFixed(1)}% of ${budgetData.totalBudget.toFixed(2)}
                {budgetTrendIndicator && <span className="ml-1">{budgetTrendIndicator}</span>}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Est. depletion: {new Date(budgetData.forecastedDepletion).toLocaleDateString()}
              </div>
            </div>
            
            {/* Progress Status */}
            <div className="flex flex-col p-3 bg-slate-50 dark:bg-slate-900 rounded-md">
              <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                <BarChart className="h-3.5 w-3.5" />
                Progress Status
              </div>
              <div className="text-lg font-semibold">{progressRate.toFixed(1)}% overall progress</div>
              <div className="text-sm">
                {progressData.goalProgress.length} goals tracked
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Sessions: {progressData.sessionsCompleted} completed
                {progressData.sessionsCancelled > 0 && `, ${progressData.sessionsCancelled} cancelled`}
              </div>
            </div>
            
            {/* Therapy ROI */}
            <div className="flex flex-col p-3 bg-slate-50 dark:bg-slate-900 rounded-md">
              <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                <Gem className="h-3.5 w-3.5" />
                Therapy Efficiency
              </div>
              <div className="text-lg font-semibold">${costPerProgressPoint.toFixed(2)} per progress point</div>
              <div className="text-sm flex items-center gap-1">
                {isEfficient && <CircleCheck className="h-3.5 w-3.5 text-green-500" />}
                {isInefficient && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                {isEfficient ? 'Highly efficient therapy' : 
                 isInefficient ? 'Efficiency improvements possible' : 'Average efficiency'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {attendanceRate.toFixed(1)}% attendance rate
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Visualization Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Budget vs Progress Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Budget to Progress Comparison</CardTitle>
            <CardDescription>
              Relationship between budget utilization and goal achievement
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveBar
              data={comparisonData}
              keys={['value']}
              indexBy="metric"
              margin={{ top: 10, right: 10, bottom: 40, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear', max: 100 }}
              indexScale={{ type: 'band', round: true }}
              colors={d => d.data.color}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Metrics',
                legendPosition: 'middle',
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Percentage (%)',
                legendPosition: 'middle',
                legendOffset: -50
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
              animate={true}
              tooltip={({ data, value }) => (
                <div style={{
                  padding: 12,
                  background: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: 4
                }}>
                  <strong>{data.metric}: </strong>
                  {value.toFixed(1)}%
                  {data.metric === 'Budget Utilization' && (
                    <div className="text-xs mt-1">
                      ${budgetData.totalSpent.toFixed(2)} spent of ${budgetData.totalBudget.toFixed(2)}
                    </div>
                  )}
                  {data.metric === 'Goal Progress' && (
                    <div className="text-xs mt-1">
                      {progressData.goalProgress.length} goals tracked
                    </div>
                  )}
                  {data.metric === 'Attendance Rate' && (
                    <div className="text-xs mt-1">
                      {progressData.sessionsCompleted} sessions completed
                    </div>
                  )}
                </div>
              )}
            />
          </CardContent>
          <CardFooter className="text-xs text-slate-600 dark:text-slate-400">
            {utilizationRate > progressRate + 20 ? (
              <div className="text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                Budget utilization exceeds progress rate by {(utilizationRate - progressRate).toFixed(1)}%. 
                Consider reviewing therapy effectiveness.
              </div>
            ) : progressRate > utilizationRate + 20 ? (
              <div className="text-green-600">
                <CircleCheck className="h-3.5 w-3.5 inline mr-1" />
                Progress rate exceeds budget utilization by {(progressRate - utilizationRate).toFixed(1)}%, 
                indicating highly efficient therapy.
              </div>
            ) : (
              <div>
                Budget utilization and progress rate are well-balanced, 
                indicating appropriate resource allocation.
              </div>
            )}
          </CardFooter>
        </Card>
        
        {/* Top Goals by Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Goals Progress</CardTitle>
            <CardDescription>
              Progress across major therapy goals
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveBar
              data={goalProgressData}
              keys={['progress']}
              indexBy="goal"
              margin={{ top: 10, right: 10, bottom: 40, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear', max: 100 }}
              indexScale={{ type: 'band', round: true }}
              colors={d => d.data.color}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Goal',
                legendPosition: 'middle',
                legendOffset: 32
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
              labelTextColor="#ffffff"
              animate={true}
            />
          </CardContent>
          <CardFooter className="text-xs text-slate-600 dark:text-slate-400">
            {goalProgressData.length > 0 && goalProgressData[0].progress - goalProgressData[goalProgressData.length - 1].progress > 30 && (
              <div>
                <AlertTriangle className="h-3.5 w-3.5 inline mr-1 text-amber-500" />
                Significant variation in goal progress indicates potential areas for 
                attention distribution review.
              </div>
            )}
          </CardFooter>
        </Card>
        
        {/* Spending Categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Budget Allocation</CardTitle>
            <CardDescription>
              Top spending categories
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {spendingData.length > 0 ? (
              <ResponsivePie
                data={spendingData}
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                activeOuterRadiusOffset={8}
                borderWidth={1}
                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsTextColor="#333333"
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor="#ffffff"
                tooltip={(props) => {
                  const { datum } = props;
                  const isHighUsage = datum.data.isHighUsage;
                  const isProjectedOverage = datum.data.isProjectedOverage;
                  
                  return (
                    <div style={{
                      padding: 12,
                      background: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: 4
                    }}>
                      <strong>{String(datum.id)}: </strong>
                      ${Number(datum.value).toFixed(2)}
                      {isHighUsage && (
                        <div className="text-amber-600 text-xs mt-1">
                          High usage category
                        </div>
                      )}
                      {isProjectedOverage && (
                        <div className="text-red-600 text-xs mt-1">
                          ⚠️ Projected to exceed budget
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-500">
                No spending data available by category
              </div>
            )}
          </CardContent>
          <CardFooter className="text-xs text-slate-600 dark:text-slate-400">
            {budgetData.spendingPatterns?.projectedOverages.length > 0 && (
              <div className="text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                {budgetData.spendingPatterns.projectedOverages.join(', ')} {budgetData.spendingPatterns.projectedOverages.length === 1 ? 'is' : 'are'} projected to exceed allocation.
              </div>
            )}
          </CardFooter>
        </Card>
        
        {/* Efficiency Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Therapy Efficiency Analysis</CardTitle>
            <CardDescription>
              Budget utilization relative to progress achieved
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <div className="grid grid-cols-2 h-full">
              <div className="flex flex-col justify-center items-center">
                <div className="text-2xl font-bold">
                  ${costPerProgressPoint.toFixed(2)}
                </div>
                <div className="text-sm text-slate-500 text-center">
                  Cost per progress percentage point
                </div>
                
                <div className={`mt-2 text-sm ${
                  isEfficient ? 'text-green-600' : 
                  isInefficient ? 'text-amber-600' : 'text-slate-600'
                }`}>
                  {isEfficient ? (
                    <span className="flex items-center">
                      <CircleCheck className="h-4 w-4 mr-1" />
                      Highly efficient
                    </span>
                  ) : isInefficient ? (
                    <span className="flex items-center">
                      <CircleAlert className="h-4 w-4 mr-1" />
                      Needs optimization
                    </span>
                  ) : (
                    <span>Average efficiency</span>
                  )}
                </div>
                
                {hasAttendanceChallenges && (
                  <div className="mt-2 text-xs text-amber-600 flex items-center">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                    Low attendance affecting efficiency
                  </div>
                )}
              </div>
              
              <div>
                <ResponsivePie
                  data={efficiencyData}
                  margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={3}
                  activeOuterRadiusOffset={8}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  enableArcLabels={false}
                  arcLinkLabelsSkipAngle={10}
                  arcLinkLabelsTextColor="#333333"
                  arcLinkLabelsThickness={2}
                  arcLinkLabelsColor={{ from: 'color' }}
                  legends={[
                    {
                      anchor: 'bottom',
                      direction: 'row',
                      justify: false,
                      translateX: 0,
                      translateY: 30,
                      itemsSpacing: 0,
                      itemWidth: 60,
                      itemHeight: 20,
                      itemTextColor: '#999',
                      itemDirection: 'left-to-right',
                      itemOpacity: 1,
                      symbolSize: 10,
                      symbolShape: 'circle'
                    }
                  ]}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="text-xs text-slate-600 dark:text-slate-400">
            Ideal therapy shows balanced budget utilization and progress achievement.
            {budgetData.spendingVelocity && budgetData.spendingVelocity > 0.3 && (
              <span className="ml-1 text-amber-600">
                Accelerating spending may affect long-term efficiency.
              </span>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}