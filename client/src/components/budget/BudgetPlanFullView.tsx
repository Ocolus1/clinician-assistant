import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  DollarSign, 
  Calendar, 
  Clock, 
  Percent, 
  BarChart3, 
  Edit, 
  Star, 
  Archive,
  Search,
  CheckCircle2,
  XCircle,
  Layers,
  FileText
} from "lucide-react";
import { format, formatDistance, parseISO, differenceInDays } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { EnhancedBudgetItem, BudgetPlan } from "./BudgetFeatureContext";

interface BudgetPlanFullViewProps {
  plan: BudgetPlan;
  budgetItems: EnhancedBudgetItem[];
  onBack: () => void;
  onEdit?: () => void;
  onSetActive?: () => void;
  onArchive?: () => void;
}

export function BudgetPlanFullView({
  plan,
  budgetItems,
  onBack,
  onEdit,
  onSetActive,
  onArchive,
}: BudgetPlanFullViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Filter budget items based on search term
  const filteredItems = budgetItems.filter(item => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      item.itemCode.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      (item.category && item.category.toLowerCase().includes(searchLower))
    );
  });
  
  // Prepare data for category pie chart
  const categoryData = React.useMemo(() => {
    const categories: Record<string, number> = {};
    
    budgetItems.forEach(item => {
      const category = item.category || "Uncategorized";
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += item.unitPrice * item.quantity;
    });
    
    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
    }));
  }, [budgetItems]);
  
  // Prepare data for usage bar chart
  const usageData = React.useMemo(() => {
    return budgetItems
      .filter(item => item.quantity > 0)
      .sort((a, b) => (b.unitPrice * b.quantity) - (a.unitPrice * a.quantity))
      .slice(0, 5)
      .map(item => ({
        name: item.itemName || item.description,
        total: item.unitPrice * item.quantity,
        used: item.usedAmount,
        remaining: item.remainingAmount,
      }));
  }, [budgetItems]);
  
  // Calculate days remaining
  const daysRemaining = plan.daysRemaining !== null ? plan.daysRemaining : null;
  const daysRemainingText = daysRemaining !== null 
    ? daysRemaining > 0 
      ? `${daysRemaining} days remaining`
      : "Expired"
    : "No end date set";
  
  // Get status color classes
  const getStatusColorClass = () => {
    switch (plan.statusColor) {
      case 'green':
        return "text-green-600";
      case 'yellow':
        return "text-amber-600";
      case 'red':
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };
  
  // Define chart colors
  const CHART_COLORS = [
    "#2563eb", "#4f46e5", "#7c3aed", "#9333ea", "#c026d3", 
    "#db2777", "#e11d48", "#f59e0b", "#84cc16", "#10b981"
  ];
  
  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">{plan.planName}</h2>
          <Badge className="ml-3" variant={plan.active ? "default" : "outline"}>
            {plan.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex space-x-3">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Plan
            </Button>
          )}
          {onSetActive && (
            <Button variant="default" onClick={onSetActive}>
              <Star className="h-4 w-4 mr-2" />
              Set Active
            </Button>
          )}
          {onArchive && (
            <Button variant="outline" onClick={onArchive}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          )}
        </div>
      </div>
      
      {/* Dashboard Overview Panel */}
      <Card className="bg-card">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left side stats */}
            <div className="md:col-span-5 space-y-4">
              <div className="mb-2">
                {plan.planSerialNumber && (
                  <div className="text-sm text-muted-foreground mb-1">
                    Serial: {plan.planSerialNumber}
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Created</div>
                      <div className="font-medium">
                        {plan.startDate ? format(new Date(plan.startDate), 'MMM d, yyyy') : 'Not set'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Expires</div>
                      <div className={`font-medium ${getStatusColorClass()}`}>
                        {plan.endDate ? format(new Date(plan.endDate), 'MMM d, yyyy') : 'Not set'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div>
                  <div className="text-sm text-muted-foreground">Available Funds</div>
                  <div className="text-2xl font-bold">{formatCurrency(plan.availableFunds)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Used</div>
                  <div className="text-2xl font-bold">{formatCurrency(plan.totalUsed)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Remaining</div>
                  <div className="text-2xl font-bold">{formatCurrency(plan.remainingFunds)}</div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Budget Usage</span>
                  <span className="text-sm font-medium">{Math.round(plan.percentUsed)}%</span>
                </div>
                <Progress 
                  value={plan.percentUsed} 
                  className="h-2" 
                  indicatorClassName={
                    plan.percentUsed > 90 ? "bg-destructive" : 
                    plan.percentUsed > 75 ? "bg-amber-500" : 
                    "bg-green-500"
                  }
                />
              </div>
            </div>
            
            {/* Right side visualization */}
            <div className="md:col-span-7">
              <div className="flex flex-col h-full">
                <div className="text-sm text-muted-foreground mb-2">Budget Allocation by Category</div>
                <div className="flex-1 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                        label={({
                          cx,
                          cy,
                          midAngle,
                          innerRadius,
                          outerRadius,
                          percent,
                          name,
                        }) => {
                          const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
                          const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                          const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                          return (
                            percent > 0.05 ? (
                              <text
                                x={x}
                                y={y}
                                fill="#888888"
                                textAnchor={x > cx ? 'start' : 'end'}
                                dominantBaseline="central"
                                fontSize={11}
                              >
                                {name} ({(percent * 100).toFixed(0)}%)
                              </text>
                            ) : null
                          );
                        }}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CHART_COLORS[index % CHART_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Timeline Indicator */}
      {daysRemaining !== null && plan.endDate && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-medium">Plan Timeline</div>
              <div className={`text-sm ${getStatusColorClass()}`}>
                {daysRemainingText}
              </div>
            </div>
            <div className="relative pt-2">
              <div className="w-full bg-muted rounded-full h-2">
                {daysRemaining > 0 && (
                  <div 
                    className={`h-2 rounded-full ${
                      daysRemaining > 30 ? 'bg-green-500' :
                      daysRemaining > 7 ? 'bg-amber-500' :
                      'bg-destructive'
                    }`}
                    style={{ 
                      width: `${Math.min(100, 100 - ((daysRemaining / 90) * 100))}%` 
                    }}
                  />
                )}
              </div>
              
              {plan.startDate && plan.endDate && (
                <div className="flex justify-between mt-2 text-sm">
                  <div>
                    {format(new Date(plan.startDate), 'MMM d, yyyy')}
                  </div>
                  <div>
                    {format(new Date(plan.endDate), 'MMM d, yyyy')}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Budget Items ({budgetItems.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* Top Items Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top Budget Items</CardTitle>
              <CardDescription>Items with highest allocation in this plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageData} layout="vertical">
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="used" stackId="a" fill="#2563eb" name="Used" />
                    <Bar dataKey="remaining" stackId="a" fill="#93c5fd" name="Remaining" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Percent className="h-4 w-4 mr-2 text-muted-foreground" />
                  Usage Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Items:</span>
                    <span className="font-medium">{budgetItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Items:</span>
                    <span className="font-medium">
                      {budgetItems.filter(i => i.quantity > 0).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Categories:</span>
                    <span className="font-medium">
                      {new Set(budgetItems.map(i => i.category || "Uncategorized")).size}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Allocated:</span>
                    <span className="font-medium">
                      {formatCurrency(budgetItems.reduce((sum, item) => 
                        sum + (item.unitPrice * item.quantity), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Price:</span>
                    <span className="font-medium">
                      {formatCurrency(budgetItems.length > 0 
                        ? budgetItems.reduce((sum, item) => sum + item.unitPrice, 0) / budgetItems.length
                        : 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Largest Item:</span>
                    <span className="font-medium">
                      {budgetItems.length > 0 
                        ? formatCurrency(Math.max(...budgetItems.map(i => i.unitPrice * i.quantity)))
                        : formatCurrency(0)
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  Time Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Created:</span>
                    <span className="font-medium">
                      {plan.startDate ? format(new Date(plan.startDate), 'MMM d, yyyy') : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Expires:</span>
                    <span className={`font-medium ${getStatusColorClass()}`}>
                      {plan.endDate ? format(new Date(plan.endDate), 'MMM d, yyyy') : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Duration:</span>
                    <span className="font-medium">
                      {plan.startDate && plan.endDate 
                        ? `${differenceInDays(new Date(plan.endDate), new Date(plan.startDate))} days`
                        : 'Unknown'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="items" className="mt-4 space-y-4">
          {/* Search and filter */}
          <div className="flex items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search budget items..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Budget items list */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm 
                  ? "No items match your search criteria"
                  : "No budget items in this plan"
                }
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-12 gap-4 py-2 px-4 text-sm font-medium text-muted-foreground border-b">
                  <div className="col-span-5">Item</div>
                  <div className="col-span-2 text-right">Unit Price</div>
                  <div className="col-span-1 text-right">Qty</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-2 text-right">Usage</div>
                </div>
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="overflow-hidden">
                      <div className="grid grid-cols-12 gap-4 p-4 items-center">
                        <div className="col-span-5">
                          <div className="font-medium">{item.itemName || item.description}</div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Badge variant="outline" className="mr-2">
                              {item.itemCode}
                            </Badge>
                            {item.category && (
                              <span>{item.category}</span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2 text-right font-medium">
                          {formatCurrency(item.unitPrice)}
                        </div>
                        <div className="col-span-1 text-right font-medium">
                          {item.quantity}
                        </div>
                        <div className="col-span-2 text-right font-medium">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </div>
                        <div className="col-span-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">
                              {item.usedQuantity}/{item.quantity}
                            </span>
                            <span>
                              {Math.round(item.usagePercentage)}%
                            </span>
                          </div>
                          <Progress 
                            value={item.usagePercentage}
                            className="h-2"
                            indicatorClassName={
                              item.usagePercentage > 90 ? "bg-destructive" : 
                              item.usagePercentage > 75 ? "bg-amber-500" : 
                              "bg-green-500"
                            }
                          />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}