
import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "../ui/dialog";
import { Button } from "../ui/button";
import { 
  Card, 
  CardContent, 
  CardFooter,
  CardHeader,
  CardTitle
} from "../ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Input,
  Label,
  Alert,
  AlertCircle,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/index";
import { Badge } from "../ui/badge";
import { 
  DollarSign, 
  Save, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle
} from "lucide-react";
import { BudgetPlan, BudgetItem, BudgetItemCatalog } from "../../types";

interface BudgetPlanEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: BudgetPlan | null;
  budgetItems: BudgetItem[];
  catalogItems?: BudgetItemCatalog[];
  onSave: (items: BudgetItem[]) => void;
  isLoading?: boolean;
}

export function BudgetPlanEditDialog({
  open,
  onOpenChange,
  plan,
  budgetItems: initialBudgetItems,
  catalogItems = [],
  onSave,
  isLoading = false
}: BudgetPlanEditDialogProps) {
  // State for edited items and budget calculations
  const [editedItems, setEditedItems] = useState<BudgetItem[]>([]);
  const [originalTotal, setOriginalTotal] = useState(0);
  const [newTotal, setNewTotal] = useState(0);
  const [budgetDifference, setBudgetDifference] = useState(0);
  
  // Reset data when dialog opens
  useEffect(() => {
    if (open && initialBudgetItems) {
      // Deep clone budget items to avoid modifying originals
      setEditedItems(JSON.parse(JSON.stringify(initialBudgetItems)));
      
      // Calculate original total
      const total = initialBudgetItems.reduce((sum, item) => {
        return sum + (item.unitPrice * item.quantity);
      }, 0);
      
      setOriginalTotal(total);
      setNewTotal(total);
      setBudgetDifference(0);
    }
  }, [open, initialBudgetItems]);
  
  if (!plan) return null;
  
  // Update an item's quantity
  const handleQuantityChange = (index: number, newQuantity: number) => {
    // Create a copy of the edited items
    const updatedItems = [...editedItems];
    
    // Update the quantity (ensure it's at least 0)
    updatedItems[index].quantity = Math.max(0, newQuantity);
    
    // Update state
    setEditedItems(updatedItems);
    
    // Recalculate totals
    updateTotals(updatedItems);
  };
  
  // Calculate totals and difference
  const updateTotals = (items: BudgetItem[]) => {
    const newTotalValue = items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);
    
    setNewTotal(newTotalValue);
    setBudgetDifference(newTotalValue - originalTotal);
  };
  
  // Add a new item from catalog
  const handleAddItem = (catalogItem: BudgetItemCatalog) => {
    // Create a new budget item from catalog
    const newItem: BudgetItem = {
      id: 0, // Temporary ID, will be replaced on save
      clientId: plan.clientId,
      budgetSettingsId: plan.id,
      itemCode: catalogItem.itemCode,
      name: "",
      description: catalogItem.description,
      unitPrice: catalogItem.defaultUnitPrice,
      quantity: 1,
      category: catalogItem.category || undefined
    };
    
    // Add to edited items
    const updatedItems = [...editedItems, newItem];
    setEditedItems(updatedItems);
    
    // Recalculate totals
    updateTotals(updatedItems);
  };
  
  // Remove an item
  const handleRemoveItem = (index: number) => {
    const updatedItems = editedItems.filter((_, i) => i !== index);
    setEditedItems(updatedItems);
    updateTotals(updatedItems);
  };
  
  // Handle save
  const handleSave = () => {
    onSave(editedItems);
  };
  
  // Determine the color and message for budget difference
  const getBudgetDifferenceInfo = () => {
    if (Math.abs(budgetDifference) < 0.01) {
      return {
        color: 'green',
        icon: <CheckCircle className="h-4 w-4" />,
        message: 'No change to budget total'
      };
    }
    
    if (budgetDifference > 0) {
      return {
        color: 'red',
        icon: <AlertTriangle className="h-4 w-4" />,
        message: `Over budget by $${budgetDifference.toFixed(2)}`
      };
    }
    
    return {
      color: 'amber',
      icon: <Info className="h-4 w-4" />,
      message: `Under budget by $${Math.abs(budgetDifference).toFixed(2)}`
    };
  };
  
  const differenceInfo = getBudgetDifferenceInfo();
  
  // Calculate percentage of budget used
  const budgetPercentage = originalTotal > 0 
    ? (newTotal / originalTotal) * 100 
    : 100;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Edit Budget Plan
          </DialogTitle>
          <DialogDescription>
            Adjust item quantities within your fixed budget of ${originalTotal.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        
        {/* Budget summary and warning */}
        <Card className={`${budgetDifference > 0 ? 'border-red-200 bg-red-50' : budgetDifference < 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Budget Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <div>
                <div className="text-sm text-gray-500">Initial Budget</div>
                <div className="text-lg font-bold">${originalTotal.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">New Total</div>
                <div className={`text-lg font-bold ${budgetDifference > 0 ? 'text-red-600' : budgetDifference < 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  ${newTotal.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Difference</div>
                <div className={`text-lg font-bold ${budgetDifference > 0 ? 'text-red-600' : budgetDifference < 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {budgetDifference > 0 ? '+' : ''}${budgetDifference.toFixed(2)}
                </div>
              </div>
            </div>
            
            <Progress 
              value={budgetPercentage} 
              max={100} 
              className={`h-2 ${
                budgetDifference > 0 ? 'bg-red-200' : 
                budgetDifference < 0 ? 'bg-amber-200' : 
                'bg-green-200'
              }`}
              indicatorClassName={`${
                budgetDifference > 0 ? 'bg-red-500' : 
                budgetDifference < 0 ? 'bg-amber-500' : 
                'bg-green-500'
              }`}
            />
            
            <div className={`flex items-center gap-2 mt-4 text-sm ${
              budgetDifference > 0 ? 'text-red-600' : 
              budgetDifference < 0 ? 'text-amber-600' : 
              'text-green-600'
            }`}>
              {differenceInfo.icon}
              <span>{differenceInfo.message}</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Budget items table */}
        <div className="rounded-md border">
          <Table>
            <TableCaption>Adjust quantities to reallocate your budget</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedItems.map((item, index) => {
                const itemTotal = item.unitPrice * item.quantity;
                
                return (
                  <TableRow key={item.id || index}>
                    <TableCell className="font-medium">{item.itemCode}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right w-28">
                      <Input
                        type="number"
                        min="0"
                        className="w-20 text-right"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${itemTotal.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {/* Add item from catalog */}
        {catalogItems.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Add Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor="catalogItem" className="text-xs mb-1">Select from catalog</Label>
                  <Select onValueChange={(value) => {
                    const item = catalogItems.find(i => i.itemCode === value);
                    if (item) handleAddItem(item);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogItems.map((item) => (
                        <SelectItem key={item.itemCode} value={item.itemCode}>
                          {item.itemCode} - {item.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="mb-0.5" disabled>
                  <Plus className="h-4 w-4 mr-1" />
                  Custom Item
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Warning for over budget */}
        {budgetDifference > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Your changes exceed the original budget by ${budgetDifference.toFixed(2)}. Please adjust quantities to stay within budget.</span>
          </Alert>
        )}
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          
          <Button 
            onClick={handleSave} 
            disabled={isLoading || budgetDifference > 0}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
