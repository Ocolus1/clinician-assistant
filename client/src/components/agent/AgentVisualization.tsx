import React from 'react';
import { useAgent } from './AgentContext';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface AgentVisualizationProps {
  type?: 'BUBBLE_CHART' | 'PROGRESS_CHART' | 'NONE';
}

export default function AgentVisualization({ type }: AgentVisualizationProps) {
  const { conversationHistory } = useAgent();
  
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
  
  // Render different visualizations based on type
  switch (type) {
    case 'BUBBLE_CHART':
      return <BudgetVisualization data={latestMessageWithData.data} />;
    case 'PROGRESS_CHART':
      return <ProgressVisualization data={latestMessageWithData.data} />;
    default:
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

// Budget visualization component
function BudgetVisualization({ data }: { data: any }) {
  // Extract data for visualization
  const { spendingByCategory, totalBudget, totalSpent, remaining } = data;
  
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
  
  // Prepare data for pie chart
  const pieData = Object.entries(spendingByCategory).map(([category, amount]: [string, any]) => ({
    id: category,
    label: category,
    value: amount,
    color: getRandomColor(category),
  }));
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Budget Utilization</CardTitle>
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
              </div>
            );
          }}
        />
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        <div>Total Budget: ${totalBudget?.toFixed(2) || 0}</div>
        <div>Spent: ${totalSpent?.toFixed(2) || 0}</div>
        <div>Remaining: ${remaining?.toFixed(2) || 0}</div>
      </CardFooter>
    </Card>
  );
}

// Progress visualization component
function ProgressVisualization({ data }: { data: any }) {
  const { goalProgress, overallProgress, attendanceRate } = data;
  
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
  
  // Prepare data for bar chart
  const barData = goalProgress.map((goal: any) => ({
    goal: goal.goalTitle.length > 20 
      ? goal.goalTitle.substring(0, 20) + '...' 
      : goal.goalTitle,
    progress: goal.progress,
  }));
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Goal Progress</CardTitle>
        <CardDescription>
          Progress across different goals
        </CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveBar
          data={barData}
          keys={['progress']}
          indexBy="goal"
          margin={{ top: 10, right: 10, bottom: 50, left: 60 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={{ scheme: 'nivo' }}
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
          labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
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
            </div>
          )}
        />
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        <div>Overall Progress: {overallProgress?.toFixed(1) || 0}%</div>
        <div>Attendance Rate: {attendanceRate?.toFixed(1) || 0}%</div>
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