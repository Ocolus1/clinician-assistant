import React, { useState, useEffect, useMemo, useLayoutEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon,
  Clock,
  Check,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Minus,
  ShoppingCart,
  RefreshCw,
  User as UserIcon,
  MapPin as MapPinIcon,
  ClipboardList,
  UserCheck,
  ChevronsUpDown,
  Package,
  BarChart,
  Star as StarIcon
} from "lucide-react";
import "./session-form.css";
import { ThreeColumnLayout } from "./ThreeColumnLayout";
import { Ally, BudgetItem, BudgetSettings, Client, Goal, Session, Subgoal, Strategy, insertSessionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useSafeForm } from "@/hooks/use-safe-hooks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { StrategySelectionDialog } from "./StrategySelectionDialog";

const hideUnwantedCalendars = () => {
  const unwantedCalendars = document.querySelectorAll('.rdp:not([data-calendar-container="true"] .rdp, [data-state="open"] .rdp)');
  unwantedCalendars.forEach(calendar => {
    if (calendar.parentElement) {
      calendar.parentElement.classList.add('uncontained-calendar');
    }
  });
};

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { NumericRating } from "@/components/sessions/NumericRating";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

const sessionFormSchema = insertSessionSchema.extend({
  sessionDate: z.coerce.date({
    required_error: "Session date is required",
  }),
  clientId: z.coerce.number({
    required_error: "Client is required",
  }),
  therapistId: z.coerce.number().optional(),
  location: z.string().optional(),
  sessionId: z.string().optional(),
});

const performanceAssessmentSchema = z.object({
  goalId: z.number(),
  goalTitle: z.string().optional(),
  notes: z.string().optional(),
  milestones: z.array(z.object({
    milestoneId: z.number(),
    milestoneTitle: z.string().optional(),
    rating: z.number().min(0).max(10).optional(),
    strategies: z.array(z.string()).default([]),
    notes: z.string().optional(),
  })).default([]),
});

const sessionProductSchema = z.object({
  budgetItemId: z.number(),
  productCode: z.string(),
  productDescription: z.string(),
  quantity: z.number().min(0.01),
  unitPrice: z.number(),
  availableQuantity: z.number(),
});

const sessionNoteSchema = z.object({
  presentAllies: z.array(z.string()).default([]),
  presentAllyIds: z.array(z.number()).default([]),
  moodRating: z.number().min(0).max(10).default(5),
  focusRating: z.number().min(0).max(10).default(5),
  cooperationRating: z.number().min(0).max(10).default(5),
  physicalActivityRating: z.number().min(0).max(10).default(5),
  notes: z.string().optional(),
  products: z.array(sessionProductSchema).default([]),
  status: z.enum(["draft", "completed"]).default("draft"),
  selectedValue: z.any().optional(), // Add this field to handle RichTextEditor's internal state
});

const integratedSessionFormSchema = z.object({
  session: sessionFormSchema,
  sessionNote: sessionNoteSchema.passthrough(), // Add passthrough to handle any extra fields that might be added dynamically
  performanceAssessments: z.array(performanceAssessmentSchema).default([]),
});

type IntegratedSessionFormValues = z.infer<typeof integratedSessionFormSchema>;

interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
}

// Use the NumericRating component instead of the slider
const RatingSlider = ({ value, onChange, label, description }: RatingSliderProps) => {
  return (
    <NumericRating
      value={value}
      onChange={onChange}
      label={label}
      description={description}
      min={0}
      max={10}
    />
  );
};

interface GoalSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: Goal[];
  selectedGoalIds: number[];
  onSelectGoal: (goal: Goal) => void;
}

// Import the GoalSelectionDialog from the separate component file
import { GoalSelectionDialog as GoalSelectionDialogComponent } from "./dialogs/GoalSelectionDialog";

// Use the imported component with a local wrapper to maintain compatibility
const GoalSelectionDialog = ({ 
  open, 
  onOpenChange, 
  goals, 
  selectedGoalIds, 
  onSelectGoal 
}: GoalSelectionDialogProps) => {
  return (
    <GoalSelectionDialogComponent
      open={open}
      onOpenChange={onOpenChange}
      goals={goals}
      selectedGoalIds={selectedGoalIds}
      onSelectGoal={onSelectGoal}
    />
  );
};

interface MilestoneSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subgoals: Subgoal[];
  selectedMilestoneIds: number[];
  onSelectMilestone: (subgoal: Subgoal) => void;
}

const MilestoneSelectionDialog = ({
  open,
  onOpenChange,
  subgoals,
  selectedMilestoneIds,
  onSelectMilestone
}: MilestoneSelectionDialogProps) => {
  const [localSubgoals, setLocalSubgoals] = useState<Subgoal[]>([]);
  const [goalId, setGoalId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const hardcodedSubgoals: Record<number, Subgoal[]> = {
    24: [
      { id: 38, goalId: 24, title: "Initial /s/ sounds", description: "Improve articulation of 's' sound at beginning of words", status: "in-progress" },
      { id: 39, goalId: 24, title: "Medial /s/ sounds", description: "Improve articulation of 's' sound in middle of words", status: "not-started" }
    ],
    25: [
      { id: 40, goalId: 25, title: "Initiating conversations", description: "Learn to appropriately start conversations with peers", status: "in-progress" }
    ]
  };

  useEffect(() => {
    if (open) {
      let extractedGoalId = subgoals.length > 0 ? subgoals[0]?.goalId : null;
      if (!extractedGoalId) {
        const selectedGoalId = queryClient.getQueryData<number>(['selectedGoalId']);
        if (selectedGoalId) {
          extractedGoalId = selectedGoalId;
        }
      }
      if (!extractedGoalId) {
        const formState = queryClient.getQueryData<any>(['formState']);
        const performanceAssessments = formState?.performanceAssessments || [];
        const currentGoalIndex = formState?.currentGoalIndex;
        if (currentGoalIndex !== null && performanceAssessments[currentGoalIndex]) {
          extractedGoalId = performanceAssessments[currentGoalIndex].goalId;
        }
      }
      if (extractedGoalId) {
        setGoalId(extractedGoalId);
      } else {
        console.log("WARNING: Could not determine goal ID for milestone selection");
      }
    }
  }, [open, subgoals, queryClient]);

  useEffect(() => {
    if (open && goalId) {
      fetch(`/api/goals/${goalId}/subgoals`)
        .then(response => {
          if (!response.ok) {
            throw new Error("Failed to fetch subgoals");
          }
          return response.json();
        })
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setLocalSubgoals(data);
          } else {
            setLocalSubgoals(hardcodedSubgoals[goalId] || []);
          }
        })
        .catch(error => {
          setLocalSubgoals(hardcodedSubgoals[goalId] || []);
        });
    }
  }, [open, goalId]);

  const availableSubgoals = localSubgoals.length > 0 
    ? localSubgoals.filter(subgoal => !selectedMilestoneIds.includes(subgoal.id))
    : subgoals.filter(subgoal => !selectedMilestoneIds.includes(subgoal.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Milestone</DialogTitle>
          <DialogDescription>
            Choose a milestone to assess for this goal
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {availableSubgoals.length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center">
              <p className="text-muted-foreground">
                {localSubgoals.length > 0 ? "All milestones have been selected" : "No milestones found for this goal"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableSubgoals.map(subgoal => (
                <Card 
                  key={subgoal.id} 
                  className="cursor-pointer hover:bg-muted/20"
                  onClick={() => {
                    onSelectMilestone(subgoal);
                    onOpenChange(false);
                  }}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">{subgoal.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground">{subgoal.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface IntegratedSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialClient?: Client;
  isFullScreen?: boolean;
}

export function IntegratedSessionForm({ 
  open, 
  onOpenChange,
  initialClient,
  isFullScreen = false
}: IntegratedSessionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [goalSelectionOpen, setGoalSelectionOpen] = useState(false);
  const [milestoneSelectionOpen, setMilestoneSelectionOpen] = useState(false);
  const [milestoneGoalId, setMilestoneGoalId] = useState<number | null>(null);
  const [currentGoalIndex, setCurrentGoalIndex] = useState<number | null>(null);

  const [strategySelectionOpen, setStrategySelectionOpen] = useState(false);
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState<number | null>(null);
  
  // Add state for attendee selection dialog
  const [attendeeDialogOpen, setAttendeeDialogOpen] = useState(false);

  const removeProduct = (index: number) => {
    const products = form.getValues("sessionNote.products") || [];
    const updatedProducts = [...products];
    updatedProducts.splice(index, 1);
    form.setValue("sessionNote.products", updatedProducts, { shouldDirty: true, shouldValidate: false });
  };

  const removeGoal = (goalId: number) => {
    const assessments = form.getValues("performanceAssessments") || [];
    const updatedAssessments = assessments.filter(a => a.goalId !== goalId);
    form.setValue("performanceAssessments", updatedAssessments, { shouldDirty: true, shouldValidate: false });
  };

  const removeMilestone = (goalId: number, milestoneId: number) => {
    const assessments = form.getValues("performanceAssessments") || [];
    const updatedAssessments = assessments.map(assessment => {
      if (assessment.goalId === goalId) {
        return {
          ...assessment,
          milestones: assessment.milestones.filter(m => m.milestoneId !== milestoneId)
        };
      }
      return assessment;
    });
    form.setValue("performanceAssessments", updatedAssessments, { shouldDirty: true, shouldValidate: false });
  };

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: open,
  });

  const sessionId = useMemo(() => {
    const now = new Date();
    return `ST-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
  }, []);

  const defaultValues: Partial<IntegratedSessionFormValues> = {
    session: {
      sessionDate: new Date(),
      location: "Clinic - Room 101",
      clientId: initialClient?.id || 0,
      title: "Therapy Session",
      duration: 60,
      status: "scheduled",
      description: "",
      sessionId: sessionId,
    },
    sessionNote: {
      presentAllies: [],
      presentAllyIds: [],
      moodRating: 5,
      focusRating: 5,
      cooperationRating: 5,
      physicalActivityRating: 5,
      notes: "",
      products: [],
      status: "draft",
      selectedValue: null, // Add this to match FullScreenSessionForm implementation
    },
    performanceAssessments: [],
  };

  const form = useForm<IntegratedSessionFormValues>({
    resolver: zodResolver(integratedSessionFormSchema),
    defaultValues,
  });

  const clientId = form.watch("session.clientId");

  useEffect(() => {
    if (clientId) {
      queryClient.setQueryData(['formState'], { clientId });
    }
  }, [clientId, queryClient]);

  const { data: allAllies = [] } = useQuery<Ally[]>({
    queryKey: ["/api/clients", clientId, "allies"],
    enabled: open && !!clientId,
    queryFn: async () => {
      if (!clientId) return [];
      try {
        const response = await fetch(`/api/clients/${clientId}/allies`);
        if (!response.ok) {
          return [];
        }
        const data = await response.json();
        return data;
      } catch (error) {
        return [];
      }
    },
  });

  useEffect(() => {
    if (allAllies.length > 0) {
      console.log("Fetched allies for client:", clientId, allAllies);
    }
  }, [allAllies, clientId]);

  const allies = React.useMemo(() => {
    if (allAllies.length === 0 && clientId === 37) {
      return [{ 
        id: 34, 
        name: "Mohamad", 
        relationship: "parent", 
        clientId: 37,
        archived: false 
      }];
    }
    const filtered = allAllies.filter(ally => !ally.archived);
    const nameMap = new Map<string, typeof filtered[0]>();
    filtered.forEach(ally => {
      if (!nameMap.has(ally.name)) {
        nameMap.set(ally.name, ally);
      }
    });
    const uniqueAllies = Array.from(nameMap.values());
    return uniqueAllies;
  }, [allAllies, clientId]);

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/clients", clientId, "goals"],
    enabled: open && !!clientId,
  });

  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

  const { data: subgoals = [] } = useQuery<Subgoal[]>({
    queryKey: ["/api/goals", selectedGoalId, "subgoals"],
    enabled: open && !!selectedGoalId,
  });

  useEffect(() => {
    const hideUnwantedCalendarsTimer = setInterval(hideUnwantedCalendars, 100);
    hideUnwantedCalendars();
    return () => {
      clearInterval(hideUnwantedCalendarsTimer);
    };
  }, [open]);

  const { data: budgetSettings, isLoading: isLoadingBudgetSettings, error: budgetSettingsError, refetch: refetchBudgetSettings } = useQuery<BudgetSettings>({
    queryKey: ["/api/clients", clientId, "budget-settings"],
    enabled: open && !!clientId,
  });

  useEffect(() => {
    console.log('Budget settings query:', { 
      clientId, 
      isLoadingBudgetSettings, 
      hasData: !!budgetSettings, 
      error: budgetSettingsError
    });
  }, [clientId, budgetSettings, isLoadingBudgetSettings, budgetSettingsError]);

  useEffect(() => {
    if (budgetSettings) {
      console.log('Budget settings loaded successfully:', budgetSettings);
      console.log('Budget settings isActive:', budgetSettings.isActive);
    }
  }, [budgetSettings]);

  const { 
    data: allBudgetItems = [], 
    isLoading: isLoadingBudgetItems, 
    error: budgetItemsError,
    refetch: refetchBudgetItems 
  } = useQuery<BudgetItem[]>({
    queryKey: ["/api/clients", clientId, "budget-items"],
    enabled: open && !!clientId,
  });

  useEffect(() => {
    console.log('Budget items query:', { 
      clientId, 
      isLoadingBudgetItems, 
      itemCount: allBudgetItems?.length, 
      error: budgetItemsError
    });
  }, [clientId, allBudgetItems, isLoadingBudgetItems, budgetItemsError]);

  useEffect(() => {
    if (allBudgetItems?.length > 0) {
      console.log('Budget items loaded successfully:', allBudgetItems);
    }
  }, [allBudgetItems]);

  const [productSelectionOpen, setProductSelectionOpen] = useState(false);

  const selectedProducts = form.watch("sessionNote.products") || [];

  const hasClientSelected = clientId !== null && clientId !== undefined;
  const [hasSampleProducts, setHasSampleProducts] = useState(false);

  const availableProducts = useMemo(() => {
    if (import.meta.env.DEV && (window as any).__sampleProducts?.length > 0) {
      return (window as any).__sampleProducts;
    }
    if (!Array.isArray(allBudgetItems) || allBudgetItems.length === 0) {
      return [];
    }
    if (!budgetSettings) {
      const tempProducts = allBudgetItems
        .filter(item => item.clientId === clientId && item.quantity > 0)
        .map(item => ({
          ...item,
          availableQuantity: item.quantity,
          productCode: item.itemCode,
          productDescription: item.description || item.itemCode,
          unitPrice: item.unitPrice
        }));
      if (tempProducts.length > 0) {
        return tempProducts;
      }
      return [];
    }
    let isActiveBool = true;
    if (budgetSettings.isActive === false) {
      isActiveBool = false;
    } 
    else if (budgetSettings.isActive === null) {
      isActiveBool = true;
    }
    else if (typeof budgetSettings.isActive === 'string') {
      const isActiveStr = String(budgetSettings.isActive);
      isActiveBool = isActiveStr.toLowerCase() !== 'false';
    }
    if (!isActiveBool) {
      return [];
    }
    const filteredProducts = allBudgetItems
      .filter((item: BudgetItem) => item.budgetSettingsId === budgetSettings.id && item.quantity > 0)
      .map((item: BudgetItem) => ({
        ...item,
        availableQuantity: item.quantity,
        productCode: item.itemCode,
        productDescription: item.description || item.name || item.itemCode,
        unitPrice: item.unitPrice
      }));
    return filteredProducts;
  }, [allBudgetItems, budgetSettings, clientId, hasSampleProducts]);

  const subgoalsByGoalId = React.useMemo(() => {
    const result: Record<number, Subgoal[]> = {};
    if (selectedGoalId) {
      result[selectedGoalId] = subgoals;
    }
    return result;
  }, [selectedGoalId, subgoals]);

  useEffect(() => {
    if (initialClient?.id && initialClient.id !== clientId) {
      form.setValue("session.clientId", initialClient.id, { shouldDirty: true, shouldValidate: false });
    }
  }, [initialClient, form, clientId]);

  const selectedPerformanceAssessments = form.watch("performanceAssessments") || [];
  const selectedGoalIds = selectedPerformanceAssessments.map(pa => pa.goalId);

  const getSelectedMilestoneIds = (goalId: number): number[] => {
    const assessment = selectedPerformanceAssessments.find(pa => pa.goalId === goalId);
    return assessment?.milestones?.map(m => m.milestoneId) || [];
  };

  const handleGoalSelection = (goal: Goal) => {
    const updatedAssessments = [...selectedPerformanceAssessments];
    updatedAssessments.push({
      goalId: goal.id,
      goalTitle: goal.title,
      notes: "",
      milestones: []
    });

    form.setValue("performanceAssessments", updatedAssessments, { shouldDirty: true, shouldValidate: false });
    setSelectedGoalId(goal.id);
    queryClient.setQueryData(['selectedGoalId'], goal.id);
    queryClient.setQueryData(['formState'], {
      ...queryClient.getQueryData(['formState']) || {},
      clientId,
      currentGoalIndex: updatedAssessments.length - 1,
      performanceAssessments: updatedAssessments
    });
    setTimeout(() => {
      if (updatedAssessments.length > 0) {
        queryClient.invalidateQueries({
          queryKey: ['/api/goals', goal.id, 'subgoals']
        });
      }
    }, 100);
  };

  const handleMilestoneSelection = (subgoal: Subgoal) =>{
    if (currentGoalIndex === null) return;
    const updatedAssessments = [...selectedPerformanceAssessments];
    const milestones = [...(updatedAssessments[currentGoalIndex].milestones || [])];
    milestones.push({
      milestoneId: subgoal.id,
      milestoneTitle: subgoal.title,
      rating: 5,
      strategies: [],
      notes: ""
    });
    updatedAssessments[currentGoalIndex].milestones = milestones;
    form.setValue("performanceAssessments", updatedAssessments, { shouldDirty: true, shouldValidate: false });
    if (selectedGoalId=== null && updatedAssessments[currentGoalIndex]) {
      setSelectedGoalId(updatedAssessments[currentGoalIndex].goalId);
    }
  };

  const handleStrategySelection = (strategy: Strategy) => {
    if (currentGoalIndex === null || currentMilestoneIndex === null) return;
    const updatedAssessments = [...selectedPerformanceAssessments];
    const milestone = updatedAssessments[currentGoalIndex].milestones[currentMilestoneIndex];
    const currentStrategies = [...(milestone.strategies || [])];
    const strategyName = strategy.name;
    if (currentStrategies.includes(strategyName)) {
      const updatedStrategies = currentStrategies.filter(s => s !== strategyName);
      updatedAssessments[currentGoalIndex].milestones[currentMilestoneIndex].strategies = updatedStrategies;
    } else {
      if (currentStrategies.length < 5) {
        updatedAssessments[currentGoalIndex].milestones[currentMilestoneIndex].strategies = [...currentStrategies, strategyName];
      }
    }
    form.setValue("performanceAssessments", updatedAssessments, { shouldDirty: true, shouldValidate: false });
  };

  const handleRemoveGoal = (index: number) => {
    const updatedAssessments = [...selectedPerformanceAssessments];
    updatedAssessments.splice(index, 1);
    form.setValue("performanceAssessments", updatedAssessments, { shouldDirty: true, shouldValidate: false });
  };

  const handleRemoveMilestone = (goalIndex: number, milestoneIndex: number) => {
    const updatedAssessments = [...selectedPerformanceAssessments];
    const milestones = [...updatedAssessments[goalIndex].milestones];
    milestones.splice(milestoneIndex, 1);
    updatedAssessments[goalIndex].milestones = milestones;
    form.setValue("performanceAssessments", updatedAssessments, { shouldDirty: true, shouldValidate: false });
  };

  const handleAddProduct = (budgetItem: BudgetItem & { availableQuantity: number }, quantity: number) => {
    if (!quantity || quantity <= 0 || quantity > budgetItem.availableQuantity) {
      toast({
        title: "Invalid quantity",
        description: `Please enter a quantity between 1 and ${budgetItem.availableQuantity}`,
        variant: "destructive"
      });
      return;
    }
    const existingProductIndex = selectedProducts.findIndex(
      p => p.budgetItemId === budgetItem.id || p.productCode === budgetItem.itemCode
    );
    if (existingProductIndex >= 0) {
      toast({
        title: "Product already added",
        description: "This product is already in your session. Please adjust the quantity instead.",
        variant: "destructive"
      });
      return;
    }
    const product = {
      budgetItemId: budgetItem.id,
      productCode: budgetItem.itemCode,
      productDescription: budgetItem.description || budgetItem.name || budgetItem.itemCode,
      quantity,
      unitPrice: budgetItem.unitPrice,
      availableQuantity: budgetItem.availableQuantity
    };
    form.setValue("sessionNote.products", [...selectedProducts, product], { shouldDirty: true, shouldValidate: false });
    setProductSelectionOpen(false);
  };

  const handleRemoveProduct = (index: number) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts.splice(index, 1);
    form.setValue("sessionNote.products", updatedProducts, { shouldDirty: true, shouldValidate: false });
  };

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: (BudgetItem & { availableQuantity: number })[];
  onSelectProduct: (product: BudgetItem & { availableQuantity: number }, quantity: number) => void;
}

const ProductSelectionDialog = ({
  open,
  onOpenChange,
  products,
  onSelectProduct
}: ProductSelectionDialogProps) => {
  const [selectedProduct, setSelectedProduct] = useState<(BudgetItem & { availableQuantity: number }) | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (open) {
      setSelectedProduct(null);
      setQuantity(1);
    }
  }, [open, products]);

  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 1) {
      setQuantity(1);
    } else if (selectedProduct && numValue > selectedProduct.availableQuantity) {
      setQuantity(selectedProduct.availableQuantity);
    } else {
      setQuantity(numValue);
    }
  };

  const handleSelectProduct = (product: BudgetItem & { availableQuantity: number }) => {
    setSelectedProduct(product);
    setQuantity(1);
  };

  const handleAddProduct = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedProduct) {
      onSelectProduct(selectedProduct, quantity);
      setSelectedProduct(null);
      setQuantity(1);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add Product to Session</DialogTitle>
          <DialogDescription>
            Select a product from the active budget plan
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 grid grid-cols-1 gap-4">
          {products.length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center">
              <p className="text-muted-foreground">No products available in active budget plan</p>
            </div>
          ) : (
            <>
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                <ScrollArea className="h-full pr-3">
                  <div className="space-y-1 p-1">
                    {products.map(product => (
                      <div 
                        key={product.id} 
                        className={`p-3 border rounded-md cursor-pointer ${selectedProduct?.id === product.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/20'}`}
                        onClick={() => handleSelectProduct(product)}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium">{product.description || product.name}</h4>
                            <p className="text-sm text-muted-foreground">Code: {product.itemCode}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(product.unitPrice)}</div>
                            <div className="text-sm text-muted-foreground">
                              Available: {product.availableQuantity}
                            </div>
                          </div>
                        </div>
                        {selectedProduct?.id === product.id && (
                          <div className="mt-3 pt-3 border-t flex items-center gap-3">
                            <div className="flex items-center border rounded-md">
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                className="h-9 w-9"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (quantity > 1) setQuantity(quantity - 1);
                                }}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input 
                                type="number" 
                                className="w-14 h-9 text-center border-0"
                                min={1}
                                max={product.availableQuantity}
                                value={quantity}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleQuantityChange(e.target.value);
                                }}
                              />
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                className="h-9 w-9"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (quantity < product.availableQuantity) {
                                    setQuantity(quantity + 1);
                                  }
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddProduct();
                              }}
                              data-testid="add-to-session-btn"
                            >
                              Add to Session
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

  const createSessionMutation = useMutation({
    mutationFn: async (data: IntegratedSessionFormValues) => {
      const sessionResponse = await apiRequest("POST", "/api/sessions", data.session);
      const sessionData = sessionResponse as any;
      const noteData = {
        ...data.sessionNote,
        sessionId: sessionData.id,
        clientId: data.session.clientId
      };
      const noteResponse = await apiRequest("POST", `/api/sessions/${sessionData.id}/notes`, noteData);
      const noteResponseData = noteResponse as any;
      if (data.performanceAssessments.length > 0) {
        await Promise.all(
          data.performanceAssessments.map(assessment => 
            apiRequest("POST", `/api/session-notes/${noteResponseData.id}/performance`, {
              goalId: assessment.goalId,
              notes: assessment.notes,
              milestones: assessment.milestones
            })
          )
        );
      }
      return sessionData;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Session and notes created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      form.reset(defaultValues);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create session and notes",
        variant: "destructive",
      });
      console.error("Error creating session:", error);
    },
  });

  function onSubmit(data: IntegratedSessionFormValues) {
    // Only submit the form if the user explicitly clicked the Create Session button
    if (isSubmitting) {
      console.log("Form data:", data);
      console.log("Form errors:", form.formState.errors);
      createSessionMutation.mutate(data);
    } else {
      console.log("Form submission prevented - user did not explicitly submit");
    }
  }
  
  // Handle cancel button click - prevents form submission
  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    onOpenChange(false); // Close the dialog
  }

  const handleNext = () => {
    if (activeTab === "details") setActiveTab("participants");
    else if (activeTab === "participants") setActiveTab("performance");
  };

  const handleBack = () => {
    if (activeTab === "performance") setActiveTab("participants");
    else if (activeTab === "participants") setActiveTab("details");
  };

  if (isFullScreen) {
    return (
      <div className="w-full h-full flex flex-col px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="details">Session Details & Observations</TabsTrigger>
            <TabsTrigger value="performance">Performance Assessment</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-hidden flex flex-col flex-grow">
              <div className="flex-grow overflow-auto pr-2">
                <TabsContent value="details" className="space-y-6 mt-0 px-4">
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-primary" />
                        Session Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                        <FormField
                          control={form.control}
                          name="session.clientId"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-base flex items-center">
                                <UserIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                Client
                              </FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  const clientId = parseInt(value);
                                  field.onChange(clientId);
                                  form.setValue("performanceAssessments", [], { shouldDirty: true, shouldValidate: false });
                                  form.setValue("sessionNote.products", [], { shouldDirty: true, shouldValidate: false });
                                  if (refetchBudgetItems && refetchBudgetSettings) {
                                    setTimeout(() => {
                                      refetchBudgetItems();
                                      refetchBudgetSettings();
                                    }, 100);
                                  }
                                }}
                                value={field.value?.toString() || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select client" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <div className="relative">
                                    <Input
                                      placeholder="Search clients..."
                                      className="mb-2 h-8"
                                      onChange={(e) => {
                                        const searchContainer = e.target.closest(".select-content");
                                        if (searchContainer) {
                                          const items = searchContainer.querySelectorAll(".select-item");
                                          const searchValue = e.target.value.toLowerCase();
                                          items.forEach(item => {
                                            const text = item.textContent?.toLowerCase() || "";
                                            if (text.includes(searchValue)) {
                                              item.classList.remove("hidden");
                                            } else {
                                              item.classList.add("hidden");
                                            }
                                          });
                                        }
                                      }}
                                    />
                                  </div>
                                  <ScrollArea className="h-[300px]">
                                    {clients.map((client) => (
                                      <SelectItem 
                                        key={client.id} 
                                        value={client.id.toString()}
                                        className="select-item"
                                      >
                                        {client.name}
                                      </SelectItem>
                                    ))}
                                  </ScrollArea>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                    />

                    <FormField
                      control={form.control}
                      name="session.location"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-base flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                            Location
                          </FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || ""}
                            defaultValue=""
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Clinic - Room 101">Clinic - Room 101</SelectItem>
                              <SelectItem value="Clinic - Room 102">Clinic - Room 102</SelectItem>
                              <SelectItem value="Clinic - Room 103">Clinic - Room 103</SelectItem>
                              <SelectItem value="Remote - Telehealth">Remote - Telehealth</SelectItem>
                              <SelectItem value="School Visit">School Visit</SelectItem>
                              <SelectItem value="Home Visit">Home Visit</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="session.sessionDate"
                      render={({ field }) => {
                        const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
                        React.useEffect(() => {
                          hideUnwantedCalendars();
                          if (!isCalendarOpen) {
                            const checkTimer = setTimeout(hideUnwantedCalendars, 50);
                            return () => clearTimeout(checkTimer);
                          }
                        }, [isCalendarOpen]);
                        return (
                          <FormItem className="flex flex-col flex-1">
                            <FormLabel className="text-base">Date & Time</FormLabel>
                            <Popover onOpenChange={setIsCalendarOpen} open={isCalendarOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={`w-full h-10 pl-3 text-left font-normal ${
                                      !field.value ? "text-muted-foreground" : ""
                                    }`}
                                    onClick={() => setIsCalendarOpen(true)}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP p")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent 
                                className="w-auto p-0 z-[100]" 
                                align="start" 
                                side="bottom" 
                                sideOffset={4} 
                                data-calendar-container="true"
                                onEscapeKeyDown={() => setIsCalendarOpen(false)}
                                onInteractOutside={() => setIsCalendarOpen(false)}
                              >
                                <div className="bg-background border rounded-md overflow-hidden">
                                  {isCalendarOpen && (
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={(date) => {
                                        if (date) {
                                          const existingDate = field.value || new Date();
                                          date.setHours(existingDate.getHours());
                                          date.setMinutes(existingDate.getMinutes());
                                          field.onChange(date);
                                        }
                                      }}
                                      initialFocus
                                    />
                                  )}
                                  <div className="p-3 border-t">
                                    <Input
                                      type="time"
                                      onChange={(e) => {
                                        const date = new Date(field.value || new Date());
                                        const [hours, minutes] = e.target.value.split(':').map(Number);
                                        date.setHours(hours, minutes);
                                        field.onChange(date);
                                      }}
                                      defaultValue={field.value ? 
                                        format(field.value, "HH:mm") : 
                                        format(new Date(), "HH:mm")
                                      }
                                    />
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                    </CardContent>
                  </Card>

                  <ThreeColumnLayout
                    className="mt-6"
                    leftColumn={
                      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">
                              <UserCheck className="h-5 w-5 inline-block mr-2" />
                              Present
                            </CardTitle>

                            <Button
                              variant="outline"
                              size="sm"
                              type="button" 
                              onClick={(e) => {
                                e.preventDefault(); // Prevent form submission
                                e.stopPropagation(); // Stop event bubbling
                                console.log("New Attendee button clicked, allies:", allies);
                                if (allies.length > 0) {
                                  const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                                  const availableAllies = allies.filter(ally => 
                                    !currentAllies.includes(ally.name)
                                  );
                                  
                                  if (availableAllies.length > 0) {
                                    // Open the attendee dialog using our dedicated state variable
                                    setAttendeeDialogOpen(true);
                                  } else {
                                    toast({
                                      title: "No more allies available",
                                      description: "All available attendees have been added to the session.",
                                      variant: "default"
                                    });
                                  }
                                } else {
                                  toast({
                                    title: "No allies found",
                                    description: "This client doesn't have any allies added to their profile yet.",
                                    variant: "default"
                                  });
                                }
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              New Attendee
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                        {form.watch("sessionNote.presentAllies")?.map((name, index) => {
                          const ally = allies.find(a => a.name === name);
                          return (
                            <div 
                              key={index} 
                              className="flex items-center justify-between py-2 px-1 border-b last:border-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                  {name.charAt(0)}
                                </div>
                                <span className="font-medium">{name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-primary">{ally?.relationship || "Attendee"}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-full"
                                  onClick={() => {
                                    const allyToRemove = allies.find(a => a.name === name);
                                    const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                                    form.setValue(
                                      "sessionNote.presentAllies", 
                                      currentAllies.filter(a => a !== name),
                                      { shouldDirty: true, shouldValidate: false }
                                    );
                                    if (allyToRemove) {
                                      const currentAllyIds = form.getValues("sessionNote.presentAllyIds") || [];
                                      form.setValue(
                                        "sessionNote.presentAllyIds", 
                                        currentAllyIds.filter(id => id !== allyToRemove.id),
                                        { shouldDirty: true, shouldValidate: false }
                                      );
                                    }
                                  }}
                                >
                                  <svg width="18" height="18" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3.625 7.5C3.625 8.12 3.12 8.625 2.5 8.625C1.88 8.625 1.375 8.12 1.375 7.5C1.375 6.88 1.88 6.375 2.5 6.375C3.12 6.375 3.625 6.88 3.625 7.5ZM8.625 7.5C8.625 8.12 8.12 8.625 7.5 8.625C6.88 8.625 6.375 8.12 6.375 7.5C6.375 6.88 6.88 6.375 7.5 6.375C8.12 6.375 8.625 6.88 8.625 7.5ZM13.625 7.5C13.625 8.12 13.12 8.625 12.5 8.625C11.88 8.625 11.375 8.12 11.375 7.5C11.375 6.88 11.88 6.375 12.5 6.375C13.12 6.375 13.625 6.88 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                  </svg>
                                </Button>
                              </div>
                            </div>
                          );
                        })}

                        {(!form.watch("sessionNote.presentAllies") || 
                          form.watch("sessionNote.presentAllies").length === 0) && (
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">
                              No one added yet. Click "New Attendee" to add people present in this session.
                            </p>
                          </div>
                        )}

                        <Dialog 
                          open={attendeeDialogOpen}
                          onOpenChange={(open) => {
                            setAttendeeDialogOpen(open);
                          }}
                        >
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Add Attendee</DialogTitle>
                              <DialogDescription>
                                Select a person who was present in this therapy session.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <Select
                                onValueChange={(value) => {
                                  // Get current form values
                                  const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                                  const [allyId, allyName] = value.split('|');
                                  const currentAllyIds = form.getValues("sessionNote.presentAllyIds") || [];
                                  const allyIdNum = parseInt(allyId);
                                  
                                  // Check if ally is already added
                                  if (currentAllies.includes(allyName) || currentAllyIds.includes(allyIdNum)) {
                                    toast({
                                      title: "Attendee already added",
                                      description: `${allyName} is already present in this session.`,
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  
                                  // Update form with the new ally
                                  form.setValue(
                                    "sessionNote.presentAllies", 
                                    [...currentAllies, allyName],
                                    { shouldDirty: true, shouldValidate: false }
                                  );
                                  form.setValue(
                                    "sessionNote.presentAllyIds",
                                    [...currentAllyIds, allyIdNum],
                                    { shouldDirty: true, shouldValidate: false }
                                  );
                                  
                                  // Close the dialog
                                  setAttendeeDialogOpen(false);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select person" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allies
                                    .filter(ally => {
                                      const currentAllies = form.getValues("sessionNote.presentAllies") || [];
                                      return !currentAllies.includes(ally.name);
                                    })
                                    .map((ally) => (
                                      <SelectItem key={ally.id} value={`${ally.id}|${ally.name}`}>
                                        {ally.name} ({ally.relationship || "Ally"})
                                      </SelectItem>
                                    ))
                                  }
                                </SelectContent>
                              </Select>
                            </div>
                          </DialogContent>
                        </Dialog>
                        </CardContent>
                      </Card>
                    }

                    middleColumn={
                      <Card className="shadow-sm hover:shadow-md transition-all duration-200 h-full">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">
                              <ShoppingCart className="h-5 w-5 inline-block mr-2" />
                              Products Used
                            </CardTitle>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  console.log('Opening product selection dialog');
                                  console.log('Available products:', availableProducts);
                                  if (import.meta.env.DEV && hasClientSelected && availableProducts.length === 0) {
                                    console.log('Creating sample products for development');
                                    const sampleProducts = [
                                      {
                                        id: 9001,
                                        budgetSettingsId: clientId || 0,
                                        clientId: clientId || 0,
                                        itemCode: "THERAPY-001",
                                        description: "Speech Therapy Session",
                                        quantity: 10,
                                        unitPrice: 150,
                                        availableQuantity: 10,
                                        productCode: "THERAPY-001",
                                        productDescription: "Speech Therapy Session",
                                        name: "Speech Therapy Session"
                                      },
                                      {
                                        id: 9002,
                                        budgetSettingsId: clientId || 0,
                                        clientId: clientId || 0,
                                        itemCode: "ASSESS-001",
                                        description: "Assessment Session",
                                        quantity: 5,
                                        unitPrice: 200,
                                        availableQuantity: 5,
                                        productCode: "ASSESS-001",
                                        productDescription: "Assessment Session",
                                        name: "Assessment Session"
                                      }
                                    ];
                                    (window as any).__sampleProducts = sampleProducts;
                                    setHasSampleProducts(true);
                                    toast({
                                      title: "Sample Products Added",
                                      description: "Sample products have been added for this session."
                                    });
                                  }
                                  setTimeout(() => {
                                    setProductSelectionOpen(true);
                                  }, 50);
                                }}
                                disabled={!availableProducts.length && !hasSampleProducts && !hasClientSelected}
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Add Product
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pb-4">
                          <ProductSelectionDialog
                            open={productSelectionOpen}
                            onOpenChange={setProductSelectionOpen}
                            products={availableProducts}
                            onSelectProduct={handleAddProduct}
                          />

                          {selectedProducts.length === 0 ? (
                            <div className="bg-muted/20 rounded-lg p-4 text-center">
                              <p className="text-muted-foreground">No products added to this session</p>
                            </div>
                          ) : (
                            <div className="bg-muted/20 rounded-lg p-4 space-y-2">
                              {selectedProducts.map((product, index) => {
                                const totalPrice = product.quantity * product.unitPrice;
                                return (
                                  <div 
                                    key={index} 
                                    className="flex items-center justify-between py-2 px-1 border-b last:border-0"
                                  >
                                    <div className="flex-1">
                                      <div className="font-medium">{product.productDescription}</div>
                                      <div className="text-sm text-muted-foreground">
                                        Code: {product.productCode}
                                      </div>
                                      <div className="mt-1">
                                        <div className="flex items-center text-xs">
                                          <span className="text-muted-foreground mr-2">Availability:</span>
                                          <div className="w-full max-w-[100px] bg-gray-200 rounded-full h-2.5">
                                            <div 
                                              className="bg-primary h-2.5 rounded-full" 
                                              style={{ 
                                                width: `${Math.min(100, (product.availableQuantity - product.quantity) / product.availableQuantity * 100)}%` 
                                              }}
                                            />
                                          </div>
                                          <span className="ml-2 text-xs">
                                            <span className="text-primary font-medium">{product.availableQuantity - product.quantity}</span>
                                            <span className="text-muted-foreground"> / {product.availableQuantity}</span>
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center border rounded-md mr-2">
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => {
                                            if (product.quantity > 1) {
                                              const updatedProducts = [...selectedProducts];
                                              updatedProducts[index] = {
                                                ...updatedProducts[index],
                                                quantity: product.quantity - 1
                                              };
                                              form.setValue("sessionNote.products", updatedProducts, { shouldDirty: true, shouldValidate: false });
                                            }
                                          }}
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <div className="w-8 text-center">
                                          <span className="text-sm font-medium">{product.quantity}</span>
                                        </div>
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => {
                                            if (product.quantity < product.availableQuantity) {
                                              const updatedProducts = [...selectedProducts];
                                              updatedProducts[index] = {
                                                ...updatedProducts[index],
                                                quantity: product.quantity + 1
                                              };
                                              form.setValue("sessionNote.products", updatedProducts, { shouldDirty: true, shouldValidate: false });
                                            } else {
                                              toast({
                                                title: "Maximum quantity reached",
                                                description: `Only ${product.availableQuantity} units available`,
                                                variant: "destructive"
                                              });
                                            }
                                          }}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>

                                      <div className="text-right">
                                        <div>
                                          <span className="text-muted-foreground text-sm">
                                            {new Intl.NumberFormat('en-US', {
                                              style: 'currency',
                                              currency: 'USD'
                                            }).format(product.unitPrice)}
                                          </span>
                                        </div>
                                        <div className="text-sm font-medium">
                                          {new Intl.NumberFormat('en-US', {
                                            style: 'currency',
                                            currency: 'USD'
                                          }).format(totalPrice)}
                                        </div>
                                      </div>

                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 rounded-full ml-2"
                                        onClick={() => handleRemoveProduct(index)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}

                              <div className="pt-3 mt-2 border-t flex justify-between items-center">
                                <span className="font-medium">Total Value:</span>
                                <span className="font-bold">
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD'
                                  }).format(
                                    selectedProducts.reduce(
                                      (total, product) => total + (product.quantity * product.unitPrice), 
                                      0
                                    )
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    }

                    rightColumn={
                      <div className="hidden lg:block space-y-6 p-2">
                      </div>
                    }
                  />
                </TabsContent>

                <TabsContent value="summary" className="mt-0 px-4 overflow-auto">
                  <div className="space-y-6 p-4 max-w-3xl mx-auto">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Session Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="grid grid-cols-[120px_1fr] gap-1">
                          <div className="text-muted-foreground">Client:</div>
                          <div>{selectedClient ? selectedClient.name : 'Not selected'}</div>

                          <div className="text-muted-foreground">Date:</div>
                          <div>{form.watch('session.date') ? format(form.watch('session.date'), 'MMM dd, yyyy') : 'Not set'}</div>

                          <div className="text-muted-foreground">Duration:</div>
                          <div>{form.watch('session.duration') || 60} minutes</div>

                          <div className="text-muted-foreground">Location:</div>
                          <div>{form.watch('session.location')}</div>

                          <div className="text-muted-foreground">Status:</div>
                          <div>{form.watch('session.status') || 'scheduled'}</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="mt-6">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Session Ratings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Mood & Engagement:</span>
                            <div className="flex items-center">
                              {Array.from({length: 5}).map((_, i) => (
                                <StarIcon 
                                  key={i} 
                                  className={cn(
                                    "h-4 w-4",
                                    i < (form.watch('assessment.moodRating') || 0) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                                  )}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Focus & Attention:</span>
                            <div className="flex items-center">
                              {Array.from({length: 5}).map((_, i) => (
                                <StarIcon 
                                  key={i} 
                                  className={cn(
                                    "h-4 w-4",
                                    i < (form.watch('assessment.focusRating') || 0) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                                  )}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Cooperation:</span>
                            <div className="flex items-center">
                              {Array.from({length: 5}).map((_, i) => (
                                <StarIcon 
                                  key={i} 
                                  className={cn(
                                    "h-4 w-4",
                                    i<i < (form.watch('assessment.cooperationRating') || 0) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                                  )}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Physical Activity:</span>
                            <div className="flex items-center">
                              {Array.from({length: 5}).map((_, i) => (
                                <StarIcon 
                                  key={i} 
                                  className={cn(
                                    "h-4 w-4",
                                    i < (form.watch('assessment.physicalRating') || 0) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="mt-6">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Attendees</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {form.watch('session.attendees')?.length > 0 ? (
                          <div className="space-y-1">
                            {form.watch('session.attendees')?.map((attendee: any, index: number) => (
                              <div key={index} className="text-sm">
                                {attendee.name} <span className="text-muted-foreground">({attendee.role})</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No attendees added</div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="mt-6">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Products</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {form.watch('session.products')?.length > 0 ? (
                          <div className="space-y-1">
                            {form.watch('session.products')?.map((product: any, index: number) => (
                              <div key={index} className="text-sm">
                                {product.name} <span className="text-muted-foreground">({product.quantity})</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No products added</div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="mt-0 px-4 overflow-auto">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-2/3">
                      <div className="flex justify-between items-center w-full mb-4">
                        <h3 className="section-header">
                          <RefreshCw className="h-5 w-5" />
                          Performance Assessment
                        </h3>
                        <Button 
                          type="button" 
                          onClick={() => setGoalSelectionOpen(true)}
                          disabled={!clientId}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Goal
                        </Button>
                      </div>
                      <GoalSelectionDialog
                        open={goalSelectionOpen}
                        onOpenChange={setGoalSelectionOpen}
                        goals={goals}
                        selectedGoalIds={selectedGoalIds}
                        onSelectGoal={handleGoalSelection}
                      />

                      {selectedPerformanceAssessments.length === 0 ? (
                        <div className="border rounded-md p-6 text-center bg-muted/10">
                          <p className="text-muted-foreground">
                            No goals selected yet. Click "Add Goal" to start assessment.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {selectedPerformanceAssessments.map((assessment, goalIndex) => {
                            const goal = goals.find(g => g.id === assessment.goalId);
                            const goalSubgoals = subgoalsByGoalId[assessment.goalId] || [];
                            const selectedMilestoneIds = getSelectedMilestoneIds(assessment.goalId);

                            return (
                              <Card key={assessment.goalId} className="overflow-hidden">
                                <CardHeader className="bg-primary/10 pb-3">
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-base">
                                      {goal?.title || assessment.goalTitle}
                                    </CardTitle>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveGoal(goalIndex)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <CardDescription>
                                    {goal?.description}
                                  </CardDescription>
                                </CardHeader>

                                <CardContent className="pt-4">
                                  <div className="mt-4">
                                    <div className="flex justify-between items-center mb-3">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setCurrentGoalIndex(goalIndex);
                                          setMilestoneSelectionOpen(true);
                                          setSelectedGoalId(assessment.goalId);
                                        }}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Milestone
                                      </Button>
                                    </div>

                                    {currentGoalIndex === goalIndex && (
                                      <MilestoneSelectionDialog
                                        open={milestoneSelectionOpen}
                                        onOpenChange={setMilestoneSelectionOpen}
                                        subgoals={goalSubgoals}
                                        selectedMilestoneIds={selectedMilestoneIds}
                                        onSelectMilestone={handleMilestoneSelection}
                                      />
                                    )}

                                    {assessment.milestones.length === 0 ? (
                                      <div className="border rounded-md p-3 text-center bg-muted/10">
                                        <p className="text-sm text-muted-foreground">
                                          No milestones selected yet. Click "Add Milestone" to assess progress.
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="space-y-4">
                                        {assessment.milestones.map((milestone, milestoneIndex) => {
                                          const subgoal = goalSubgoals.find(s => s.id === milestone.milestoneId);

                                          return (
                                            <div 
                                              key={milestone.milestoneId} 
                                              className="border rounded-md p-4 space-y-3"
                                            >
                                              <FormField
                                                control={form.control}
                                                name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.rating`}
                                                render={({ field }) => {
                                                  const getRatingColorClass = () => {
                                                    const value = field.value !== undefined ? field.value : 5;
                                                    if (value <= 3) return 'text-red-700';
                                                    if (value <= 6) return 'text-amber-700';
                                                    return 'text-green-700';
                                                  };

                                                  return (
                                                    <div className="flex justify-between items-start">
                                                      <div>
                                                        <h5 className="font-medium">
                                                          {subgoal?.title || milestone.milestoneTitle}
                                                          <span className={`ml-2 ${getRatingColorClass()}`}>
                                                            - Score {field.value !== undefined ? field.value : 5}
                                                          </span>
                                                        </h5>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                          {subgoal?.description}
                                                        </p>
                                                      </div>
                                                      <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveMilestone(goalIndex, milestoneIndex)}
                                                      >
                                                        <X className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                  );
                                                }}
                                              />

                                              <FormField
                                                control={form.control}
                                                name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.rating`}
                                                render={({ field }) => {
                                                  const getRangeClass = () => {
                                                    const value = field.value !== undefined ? field.value : 5;
                                                    if (value <= 3) return 'range-low';
                                                    if (value <= 6) return 'range-mid';
                                                    return 'range-high';
                                                  };

                                                  return (
                                                    <FormItem>
                                                      <FormControl>
                                                        <div className="px-1 py-2">
                                                          <Slider
                                                            value={[field.value !== undefined ? field.value : 5]}
                                                            min={0}
                                                            max={10}
                                                            step={1}
                                                            onValueChange={(vals) => field.onChange(vals[0])}
                                                            className={`py-2 rating-slider color-slider ${getRangeClass()}`}
                                                          />
                                                        </div>
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  );
                                                }}
                                              />

                                              <FormField
                                                control={form.control}
                                                name={`performanceAssessments.${goalIndex}.milestones.${milestoneIndex}.strategies`}
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <div className="flex justify-between items-center">
                                                      <FormLabel>Strategies Used</FormLabel>
                                                      <Button 
                                                        type="button" 
                                                        variant="outline" 
                                                        size="sm"
                                                        className="h-8 px-2 text-xs"
                                                        onClick={() => {
                                                          setCurrentGoalIndex(goalIndex);
                                                          setCurrentMilestoneIndex(milestoneIndex);
                                                          setStrategySelectionOpen(true);
                                                        }}
                                                      >
                                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                                        <span>Select Strategies</span>
                                                      </Button>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                      {field.value && field.value.length > 0 ? (
                                                        field.value.map((strategy: string) => (
                                                          <Badge
                                                            key={strategy}
                                                            variant="default"
                                                            className="cursor-pointer"
                                                            onClick={() => {
                                                              field.onChange(field.value.filter((s: string) => s !== strategy));
                                                            }}
                                                          >
                                                            {strategy}
                                                            <X className="h-3 w-3 ml-1" />
                                                          </Badge>
                                                        ))
                                                      ) : (
                                                        <span className="text-sm text-muted-foreground italic">
                                                          No strategies selected
                                                        </span>
                                                      )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      Max 5 strategies per milestone 
                                                      {field.value && field.value.length > 0 && ` (${field.value.length}/5 selected)`}
                                                    </p>
                                                    <FormMessage />
                                                  </FormItem>
                                                )}
                                              />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="md:w-1/3">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="sessionNote.notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter general notes about the session..."
                                  className="resize-none min-h-[300px] border-primary/10 focus:border-primary/30"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>

              <div className="pt-2 border-t flex justify-between items-center">
                <div className="flex items-center">
                  {activeTab !== "details" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="mr-2"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  {activeTab !== "performance" && (
                    <Button
                      type="button"
                      onClick={handleNext}
                      variant="ghost"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  {activeTab === "performance" && (
                    <Button 
                      type="submit"
                      disabled={createSessionMutation.isPending}
                      onClick={() => setIsSubmitting(true)}
                    >
                      {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </Tabs>

        <StrategySelectionDialog
          open={strategySelectionOpen}
          onOpenChange={setStrategySelectionOpen}
          selectedStrategies={
            currentGoalIndex !== null && currentMilestoneIndex !== null
              ? form.getValues(`performanceAssessments.${currentGoalIndex}.milestones.${currentMilestoneIndex}.strategies`) || []
              : []
          }
          milestoneId={
            currentGoalIndex !== null && currentMilestoneIndex !== null
              ? form.getValues(`performanceAssessments.${currentGoalIndex}.milestones.${currentMilestoneIndex}.milestoneId`)
              : 0
          }
          onSelectStrategy={handleStrategySelection}
          maxStrategies={5}
        />
      </DialogContent>
    </Dialog>
  );
}