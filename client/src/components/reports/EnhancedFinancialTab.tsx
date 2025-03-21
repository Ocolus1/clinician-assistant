import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BudgetItemUtilization } from "./BudgetItemUtilization";
import { FundUtilizationTimeline } from "./FundUtilizationTimeline";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ClientReportData } from "@/lib/api/clientReports";

interface EnhancedFinancialTabProps {
  clientId: number;
  reportData?: ClientReportData;
}

const COLORS = {
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
};

export function EnhancedFinancialTab({ clientId, reportData }: EnhancedFinancialTabProps) {
  if (!reportData) {
    return (
      <div className="p-8 text-center">
        <p>Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Main enhanced components */}
      <FundUtilizationTimeline clientId={clientId} />
      <BudgetItemUtilization clientId={clientId} />

      {/* Session attendance - retained from original financial tab */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Session Attendance</CardTitle>
            <CardDescription className="text-xs">Breakdown of session attendance</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="h-[170px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Completed', value: reportData.cancellations.completed, color: COLORS.green },
                      { name: 'Waived', value: reportData.cancellations.waived, color: COLORS.red },
                      { name: 'Rescheduled', value: reportData.cancellations.changed, color: COLORS.amber },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                  >
                    {[
                      { name: 'Completed', value: reportData.cancellations.completed, color: COLORS.green },
                      { name: 'Waived', value: reportData.cancellations.waived, color: COLORS.red },
                      { name: 'Rescheduled', value: reportData.cancellations.changed, color: COLORS.amber },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {reportData.cancellations.total > 0 && (
              <div className="text-center text-xs text-muted-foreground pt-2">
                Total sessions: {reportData.cancellations.total}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Metrics Overview Card */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Key Financial Indicators</CardTitle>
            <CardDescription className="text-xs">Performance against plan goals</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-rows-3 gap-4 h-[170px]">
              {/* Spending Variance */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Spending Variance</span>
                  <div className="flex items-center space-x-2">
                    <span className={
                      reportData.keyMetrics.spendingDeviation > 0 
                        ? "text-red-600 font-semibold text-xl" 
                        : "text-green-600 font-semibold text-xl"
                    }>
                      {(reportData.keyMetrics.spendingDeviation * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {reportData.keyMetrics.spendingDeviation > 0 
                        ? "Over-allocated" 
                        : "Under-allocated"}
                    </span>
                  </div>
                </div>
                <div className={
                  reportData.keyMetrics.spendingDeviation > 0 
                    ? "h-12 w-12 rounded-full bg-red-100 flex items-center justify-center" 
                    : "h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"
                }>
                  <span className={
                    reportData.keyMetrics.spendingDeviation > 0 
                      ? "text-red-600 text-xl font-bold" 
                      : "text-green-600 text-xl font-bold"
                  }>
                    {reportData.keyMetrics.spendingDeviation > 0 ? "+" : "-"}
                  </span>
                </div>
              </div>
              
              {/* Plan Expiration */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Plan Expiration</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-800 font-semibold text-xl">
                      {reportData.keyMetrics.planExpiration}
                    </span>
                    <span className="text-xs text-muted-foreground">days remaining</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <span className="text-slate-600 text-sm font-bold">
                    {Math.ceil(reportData.keyMetrics.planExpiration / 30)}mo
                  </span>
                </div>
              </div>
              
              {/* Cancellation Rate */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Cancellation Rate</span>
                  <div className="flex items-center space-x-2">
                    <span className={
                      (reportData.keyMetrics.cancellationRate || 0) > 30
                        ? "text-red-600 font-semibold text-xl" 
                        : (reportData.keyMetrics.cancellationRate || 0) > 15
                          ? "text-amber-600 font-semibold text-xl"
                          : "text-slate-800 font-semibold text-xl"
                    }>
                      {reportData.keyMetrics.cancellationRate?.toFixed(0) || "0"}%
                    </span>
                    <span className="text-xs text-muted-foreground">of sessions</span>
                  </div>
                </div>
                <div className={
                  (reportData.keyMetrics.cancellationRate || 0) > 30
                    ? "h-12 w-12 rounded-full bg-red-100 flex items-center justify-center" 
                    : (reportData.keyMetrics.cancellationRate || 0) > 15
                      ? "h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center"
                      : "h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center"
                }>
                  <span className={
                    (reportData.keyMetrics.cancellationRate || 0) > 30
                      ? "text-red-600 text-xl font-bold" 
                      : (reportData.keyMetrics.cancellationRate || 0) > 15
                        ? "text-amber-600 text-xl font-bold"
                        : "text-slate-600 text-xl font-bold"
                  }>
                    {(reportData.keyMetrics.cancellationRate || 0) > 30
                      ? "!" 
                      : (reportData.keyMetrics.cancellationRate || 0) > 15
                        ? "⚠"
                        : "✓"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}