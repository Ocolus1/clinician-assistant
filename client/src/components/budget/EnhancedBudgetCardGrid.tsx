import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Dialog,
  DialogContent
} from "../ui/dialog";
import { Button } from "../ui/button";
import { PlusCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useBudgetFeature, BudgetPlan } from "./BudgetFeatureContext";
import { BudgetPlanCard } from "./BudgetPlanCard";
import { BudgetPlanFullView } from "./BudgetPlanFullView";
import { BudgetPlanCreateWizard } from "./BudgetPlanCreateWizard";
import { BudgetPlanEditDialog } from "./BudgetPlanEditDialog";

interface EnhancedBudgetCardGridProps {
  clientId: number;
  showArchivedByDefault?: boolean;
}

export function EnhancedBudgetCardGrid({ 
  clientId, 
  showArchivedByDefault = false 
}: EnhancedBudgetCardGridProps) {
  // State for tab selection
  const [activeTab, setActiveTab] = useState<string>(showArchivedByDefault ? "archived" : "active");
  
  // State for dialogs
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BudgetPlan | null>(null);
  
  // Get budget data from context
  const { 
    budgetPlans, 
    isLoading, 
    activePlan, 
    createPlan, 
    updatePlan, 
    archivePlan, 
    setActivePlan,
    updateBudgetItems,
    getBudgetItemsByPlan,
    catalogItems
  } = useBudgetFeature();
  
  // Filter plans by active/archived status
  const activePlans = budgetPlans.filter(plan => !plan.archived);
  const archivedPlans = budgetPlans.filter(plan => plan.archived);
  
  // Handle clicking on a budget plan
  const handlePlanClick = (plan: BudgetPlan) => {
    setSelectedPlan(plan);
    setShowDetailsDialog(true);
  };
  
  // Handle opening edit dialog
  const handleEditPlan = (plan: BudgetPlan) => {
    setSelectedPlan(plan);
    setShowEditDialog(true);
  };
  
  // Handle creating a new plan
  const handleCreatePlan = (data: any) => {
    createPlan(data);
    setShowCreateWizard(false);
  };
  
  // Handle setting a plan as active
  const handleSetActive = (plan: BudgetPlan) => {
    setActivePlan(plan.id);
  };
  
  // Handle archiving a plan
  const handleArchive = (plan: BudgetPlan) => {
    archivePlan(plan.id);
  };
  
  // Variants for container animations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  // Variants for item animations
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Budget Plans</h2>
        <Button
          onClick={() => setShowCreateWizard(true)}
          disabled={isLoading}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Create New Plan
        </Button>
      </div>
      
      {/* Display alert if no plans exist */}
      {budgetPlans.length === 0 && !isLoading && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Budget Plans</AlertTitle>
          <AlertDescription>
            No budget plans have been created for this client yet. Click "Create New Plan" to get started.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Tabs for active/archived plans */}
      {budgetPlans.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active">
              Active Plans ({activePlans.length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archived Plans ({archivedPlans.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-4">
            {activePlans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active plans. Create a new plan or activate an archived plan.
              </div>
            ) : (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {activePlans.map(plan => (
                  <motion.div key={plan.id} variants={itemVariants}>
                    <BudgetPlanCard 
                      plan={plan}
                      isActive={plan.active}
                      onView={() => handlePlanClick(plan)}
                      onEdit={() => handleEditPlan(plan)}
                      onArchive={() => handleArchive(plan)}
                      onSetActive={!plan.active ? () => handleSetActive(plan) : undefined}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>
          
          <TabsContent value="archived" className="mt-4">
            {archivedPlans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No archived plans.
              </div>
            ) : (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {archivedPlans.map(plan => (
                  <motion.div key={plan.id} variants={itemVariants}>
                    <BudgetPlanCard 
                      plan={plan}
                      isArchived={true}
                      onView={() => handlePlanClick(plan)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      )}
      
      {/* Create Plan Wizard */}
      <BudgetPlanCreateWizard
        open={showCreateWizard}
        onOpenChange={setShowCreateWizard}
        onSubmit={handleCreatePlan}
        clientId={clientId}
        catalogItems={catalogItems}
        hasActivePlan={!!activePlan}
      />
      
      {/* Edit Plan Dialog */}
      {selectedPlan && (
        <BudgetPlanEditDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          plan={selectedPlan}
          budgetItems={getBudgetItemsByPlan(selectedPlan.id)}
          catalogItems={catalogItems}
          onSave={(items) => {
            if (selectedPlan) {
              updateBudgetItems(selectedPlan.id, items);
              setShowEditDialog(false);
            }
          }}
        />
      )}
      
      {/* View Plan Details Dialog */}
      <Dialog open={showDetailsDialog && !!selectedPlan} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedPlan && (
            <BudgetPlanFullView
              plan={selectedPlan}
              budgetItems={getBudgetItemsByPlan(selectedPlan.id)}
              onBack={() => setShowDetailsDialog(false)}
              onEdit={() => {
                setShowDetailsDialog(false);
                setShowEditDialog(true);
              }}
              onSetActive={!selectedPlan.active && !selectedPlan.archived ? 
                () => handleSetActive(selectedPlan) : undefined}
              onArchive={!selectedPlan.archived ? 
                () => handleArchive(selectedPlan) : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}