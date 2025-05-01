import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/utils";
import { format, differenceInYears } from "date-fns";
import {
  PlusCircle,
  Edit,
  User,
  Calendar,
  Search,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Download,
  MoreHorizontal,
  Share2,
  Printer,
  FilePlus,
  X,
  Filter,
  Calendar as CalendarIcon,
  BarChart,
  DollarSign,
  Clock,
  Target,
  Award,
  LineChart,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import {
  Patient,
  Caregiver,
  Goal,
  BudgetItem,
  BudgetSettings,
} from "@shared/schema";

// Function to calculate age from date of birth
const calculateAge = (dateOfBirth: string): number => {
  return differenceInYears(new Date(), new Date(dateOfBirth));
};

// Simple sparkline component
const Sparkline: React.FC<{
  data: number[];
  height?: number;
  width?: number;
  color?: string;
  fillColor?: string;
}> = ({
  data,
  height = 30,
  width = 80,
  color = "#4f46e5",
  fillColor = "rgba(79, 70, 229, 0.1)",
}) => {
  if (!data || data.length === 0) return null;

  // Find the max and min values in the data
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue;

  // Calculate the points for the path
  const points = data
    .map((value, index) => {
      const x = index * (width / (data.length - 1));
      const y = height - ((value - minValue) / (range || 1)) * height;
      return `${x},${y}`;
    })
    .join(" ");

  // Create a path for the sparkline
  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Fill area under the line */}
      <path
        d={`M0,${height} ${data
          .map((value, index) => {
            const x = index * (width / (data.length - 1));
            const y = height - ((value - minValue) / (range || 1)) * height;
            return `L${x},${y}`;
          })
          .join(" ")
          .substring(1)} L${width},${height} Z`}
        fill={fillColor}
        strokeWidth="0"
      />

      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />

      {/* End point */}
      <circle
        cx={width}
        cy={
          height - ((data[data.length - 1] - minValue) / (range || 1)) * height
        }
        r="3"
        fill={color}
      />
    </svg>
  );
};

// Types for the enriched patient data
interface EnrichedPatient extends Patient {
  age: number;
  caregivers: Caregiver[];
  clinicians: Array<{ id: number; name: string; role: string }>;
  goals: Goal[];
  budgetItems: BudgetItem[];
  budgetSettings?: BudgetSettings;
  sessions?: Array<any>;
  sessionNotesWithProducts?: Array<any>; // Session notes with product usage data
  score?: number;
  progress?: number[];
  status?: "active" | "inactive";
}

// Column definition for the patient table
interface ColumnDef {
  id: string;
  header: string;
  accessorFn: (patient: EnrichedPatient) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  alignment?: "start" | "center" | "end";
}

export default function EnhancedPatientList() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // State for delete dialog
  const [patientToDelete, setClientToDelete] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all patients
  const {
    data: patients = [],
    isLoading,
    error,
  } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Create functions to fetch additional data for each patient
  const fetchCaregivers = async (patientId: number): Promise<Caregiver[]> => {
    const response = await fetch(`/api/patients/${patientId}/caregivers`);
    if (!response.ok) return [];
    return response.json();
  };

  const fetchClinicians = async (
    patientId: number
  ): Promise<Array<{ id: number; name: string; role: string }>> => {
    try {
      const response = await fetch(`/api/patients/${patientId}/clinicians`);
      if (!response.ok) return [];
      return response.json();
    } catch (error) {
      console.error("Error fetching clinicians:", error);
      return [];
    }
  };

  const fetchGoals = async (patientId: number): Promise<Goal[]> => {
    const response = await fetch(`/api/patients/${patientId}/goals`);
    if (!response.ok) return [];
    return response.json();
  };

  const fetchBudgetItems = async (patientId: number): Promise<BudgetItem[]> => {
    const response = await fetch(`/api/patients/${patientId}/budget-items`);
    if (!response.ok) return [];
    return response.json();
  };

  const fetchBudgetSettings = async (
    patientId: number
  ): Promise<BudgetSettings | undefined> => {
    try {
      const response = await fetch(
        `/api/patients/${patientId}/budget-settings`
      );
      if (!response.ok) return undefined;
      return response.json();
    } catch (error) {
      console.error("Error fetching budget settings:", error);
      return undefined;
    }
  };

  const fetchSessions = async (patientId: number): Promise<any[]> => {
    try {
      const response = await fetch(`/api/patients/${patientId}/sessions`);
      if (!response.ok) return [];
      return response.json();
    } catch (error) {
      console.error("Error fetching sessions:", error);
      return [];
    }
  };

  // Helper function to fetch session notes with products for budget usage calculation
  const fetchSessionNotesWithProducts = async (
    patientId: number
  ): Promise<any[]> => {
    try {
      // Use the endpoint that includes product usage data
      const response = await fetch(
        `/api/patients/${patientId}/session-notes-with-products`
      );
      if (!response.ok) {
        console.error(
          "Error fetching session notes with products, status:",
          response.status
        );
        return [];
      }
      return response.json();
    } catch (error) {
      console.error("Error fetching session notes with products:", error);
      return [];
    }
  };

  // Enrich patients with additional data
  const { data: enrichedPatients = [], isLoading: isEnrichingClients } =
    useQuery<EnrichedPatient[]>({
      queryKey: ["/api/patients/enriched"],
      enabled: patients.length > 0,
      queryFn: async () => {
        return Promise.all(
          patients.map(async (patient) => {
            // Fetch additional data for each patient
            const [
              caregivers,
              clinicians,
              goals,
              budgetItems,
              budgetSettings,
              sessions,
              sessionNotesWithProducts,
            ] = await Promise.all([
              fetchCaregivers(patient.id),
              fetchClinicians(patient.id),
              fetchGoals(patient.id),
              fetchBudgetItems(patient.id),
              fetchBudgetSettings(patient.id),
              fetchSessions(patient.id),
              fetchSessionNotesWithProducts(patient.id),
            ]);

            // Calculate age
            const age = calculateAge(patient.dateOfBirth);

            // Get active plan information
            const activePlan =
              budgetSettings && budgetSettings.isActive
                ? budgetSettings
                : undefined;

            // Calculate score based on sessions in active plan
            let score = 0;
            let sessionPerformances: number[] = [];

            if (activePlan && sessions && sessions.length > 0) {
              // Filter sessions that belong to active plan period
              const planStartDate = activePlan.createdAt
                ? new Date(activePlan.createdAt)
                : new Date();
              const planEndDate = activePlan.endOfPlan
                ? new Date(activePlan.endOfPlan)
                : new Date();

              const planSessions = sessions.filter((session) => {
                const sessionDate = new Date(session.sessionDate);
                return (
                  sessionDate >= planStartDate && sessionDate <= planEndDate
                );
              });

              // Extract performance data from session notes (if available)
              if (planSessions.length > 0) {
                // In a real app, we would get actual performance scores from session notes
                // For now, using placeholder logic
                const performanceScores = planSessions
                  .filter((session) => session.performanceScore)
                  .map((session) => session.performanceScore);

                if (performanceScores.length > 0) {
                  score = Math.round(
                    performanceScores.reduce((sum, val) => sum + val, 0) /
                      performanceScores.length
                  );
                  sessionPerformances = performanceScores.slice(-10); // Get last 10 performance scores
                }
              }
            }

            // Determine status - just active or inactive based on active plan
            const status =
              activePlan && activePlan.isActive ? "active" : "inactive";

            return {
              ...patient,
              age,
              caregivers,
              clinicians,
              goals,
              budgetItems,
              budgetSettings,
              sessions,
              sessionNotesWithProducts,
              score: score || undefined,
              progress:
                sessionPerformances.length > 0
                  ? sessionPerformances
                  : undefined,
              status,
            };
          })
        );
      },
    });

  // Columns definition for the patient table
  const columns: ColumnDef[] = [
    {
      id: "select",
      header: "",
      accessorFn: (patient) => (
        <Checkbox
          checked={selectedClients.includes(patient.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedClients([...selectedClients, patient.id]);
            } else {
              setSelectedClients(
                selectedClients.filter((id) => id !== patient.id)
              );
            }
          }}
        />
      ),
      width: "40px",
      alignment: "center",
    },
    {
      id: "id",
      header: "ID",
      accessorFn: (patient) => (
        <span className="text-xs text-gray-500 font-mono">#{patient.id}</span>
      ),
      sortable: true,
      width: "60px",
      alignment: "start",
    },
    {
      id: "name",
      header: "Patient Name",
      accessorFn: (patient) => (
        <div className="font-medium">{patient.name}</div>
      ),
      sortable: true,
      width: "160px",
      alignment: "start",
    },
    {
      id: "age",
      header: "Age",
      accessorFn: (patient) => (
        <span className="text-sm">{patient.age} years</span>
      ),
      sortable: true,
      width: "80px",
      alignment: "start",
    },
    {
      id: "therapists",
      header: "Therapists",
      accessorFn: (patient) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {patient.clinicians && patient.clinicians.length > 0 ? (
            patient.clinicians.slice(0, 3).map((assignment, index) => (
              <TooltipProvider key={assignment.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="bg-primary/5 hover:bg-primary/10 cursor-pointer"
                    >
                      {assignment.name.split(" ")[0]}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div className="font-bold text-wrap">
                        {assignment.name}
                      </div>
                      <div className="text-gray-500">{assignment.role}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))
          ) : (
            <span className="text-gray-400 text-xs">No therapists</span>
          )}
          {patient.clinicians && patient.clinicians.length > 3 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="bg-gray-100 hover:bg-gray-200 cursor-pointer"
                  >
                    +{patient.clinicians.length - 3}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    {patient.clinicians.slice(3).map((assignment, index) => (
                      <div key={assignment.id} className="mb-1">
                        <div className="font-bold">{assignment.name}</div>
                        <div className="text-gray-500">{assignment.role}</div>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ),
      width: "200px",
      alignment: "start",
    },
    {
      id: "goals",
      header: "Goals",
      accessorFn: (patient) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Target className="h-4 w-4 mr-1 text-primary" />
                <span className="font-medium">{patient.goals.length}</span>
              </div>
            </TooltipTrigger>
            {patient.goals.length > 0 && (
              <TooltipContent className="max-w-sm">
                <div className="text-xs max-h-[200px] overflow-y-auto">
                  <div className="font-bold mb-1">Goals:</div>
                  <ul className="list-disc list-inside">
                    {patient.goals.map((goal) => (
                      <li key={goal.id} className="mb-1">
                        {goal.title}
                      </li>
                    ))}
                  </ul>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      ),
      sortable: true,
      width: "80px",
      alignment: "start",
    },
    {
      id: "score",
      header: "Score",
      accessorFn: (patient) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center mr-2 ${
                    patient.score
                      ? patient.score > 70
                        ? "bg-green-100 text-green-700"
                        : patient.score > 40
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <Award className="h-4 w-4" />
                </div>
                <span className="font-medium">{patient.score || "N/A"}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <div className="font-bold mb-1">Performance Score</div>
                <div className="text-gray-500">
                  Based on therapy goals progress
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      sortable: true,
      width: "100px",
      alignment: "start",
    },
    {
      id: "progress",
      header: "Progress",
      accessorFn: (patient) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Sparkline
                  data={patient.progress || [0, 0, 0]}
                  width={80}
                  height={30}
                  color={
                    patient.progress && patient.progress.length > 1
                      ? patient.progress[patient.progress.length - 1] >
                        patient.progress[0]
                        ? "#22c55e" // improving
                        : "#ef4444" // declining
                      : "#6b7280" // neutral
                  }
                  fillColor={
                    patient.progress && patient.progress.length > 1
                      ? patient.progress[patient.progress.length - 1] >
                        patient.progress[0]
                        ? "rgba(34, 197, 94, 0.1)" // improving
                        : "rgba(239, 68, 68, 0.1)" // declining
                      : "rgba(107, 114, 128, 0.1)" // neutral
                  }
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <div className="font-bold mb-1">Session Progress Trend</div>
                <div className="text-gray-500">Last 10 therapy sessions</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      width: "100px",
      alignment: "start",
    },
    {
      id: "budget",
      header: "Budget Usage",
      accessorFn: (patient) => {
        // Calculate total allocated budget from ACTIVE budget items
        const activeBudgetItems = patient.budgetItems.filter(
          (item) => item.isActivePlan !== false
        );

        const totalAllocated = activeBudgetItems.reduce((acc, item) => {
          const unitPrice =
            typeof item.unitPrice === "string"
              ? parseFloat(item.unitPrice)
              : item.unitPrice;
          const quantity =
            typeof item.quantity === "string"
              ? parseInt(item.quantity)
              : item.quantity;
          return acc + unitPrice * quantity;
        }, 0);

        // Use total allocated as the correct budget total (not ndisFunds from settings)
        const totalBudget = totalAllocated;

        // Use the session notes with products for accurate usage calculation
        let usedBudget = 0;

        if (
          patient.sessionNotesWithProducts &&
          patient.sessionNotesWithProducts.length > 0
        ) {
          // Calculate used budget from session notes with products
          patient.sessionNotesWithProducts.forEach((sessionNote) => {
            if (sessionNote.products && Array.isArray(sessionNote.products)) {
              sessionNote.products.forEach((product) => {
                const unitPrice =
                  typeof product.unitPrice === "string"
                    ? parseFloat(product.unitPrice)
                    : product.unitPrice || 0;
                const quantity =
                  typeof product.quantity === "string"
                    ? parseInt(product.quantity)
                    : product.quantity || 0;
                usedBudget += unitPrice * quantity;
              });
            }
          });
        } else if (activeBudgetItems && activeBudgetItems.length > 0) {
          // Fallback: Calculate from budget items' usedQuantity field if available
          activeBudgetItems.forEach((item) => {
            const unitPrice =
              typeof item.unitPrice === "string"
                ? parseFloat(item.unitPrice)
                : item.unitPrice;
            const usedQty = item.usedQuantity || 0;
            usedBudget += unitPrice * usedQty;
          });
        }

        // Safety check - don't show more than 100% usage
        usedBudget = Math.min(usedBudget, totalBudget);

        // Calculate usage percentage
        const usagePercentage =
          totalBudget > 0 ? (usedBudget / totalBudget) * 100 : 0;
        const formattedUsage = Math.round(usagePercentage) + "%";

        // Determine color based on usage
        let progressColor = "bg-blue-500";
        if (usagePercentage > 90) progressColor = "bg-red-500";
        else if (usagePercentage > 75) progressColor = "bg-amber-500";
        else if (usagePercentage > 50) progressColor = "bg-green-500";

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full max-w-[140px] pl-1">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span>{formattedUsage}</span>
                    <DollarSign className="h-3 w-3 text-gray-400" />
                  </div>
                  <Progress
                    value={usagePercentage}
                    className="h-2"
                    indicatorClassName={progressColor}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-bold mb-1">Budget Usage</div>
                  <div>Used: ${Number(usedBudget).toFixed(2)}</div>
                  <div>Total: ${Number(totalBudget).toFixed(2)}</div>
                  <div>
                    Remaining: ${Number(totalBudget - usedBudget).toFixed(2)}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      sortable: true,
      width: "150px",
      alignment: "start",
    },
    {
      id: "expiry",
      header: "Expiry",
      accessorFn: (patient) => {
        // Get the plan end date from budget settings
        const endOfPlan = patient.budgetSettings?.endOfPlan;

        if (!endOfPlan || !patient.budgetSettings?.isActive) {
          return <span className="text-gray-400 text-xs">N/A</span>;
        }

        // Calculate days left until expiration
        const today = new Date();
        const expiryDate = new Date(endOfPlan);
        const daysLeft = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Determine color based on days left
        let textColor = "text-gray-600";
        let bgColor = "bg-gray-100";

        if (daysLeft <= 30) {
          textColor = "text-red-700";
          bgColor = "bg-red-100";
        } else if (daysLeft <= 60) {
          textColor = "text-amber-700";
          bgColor = "bg-amber-100";
        } else if (daysLeft <= 90) {
          textColor = "text-blue-700";
          bgColor = "bg-blue-100";
        } else {
          textColor = "text-green-700";
          bgColor = "bg-green-100";
        }

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {daysLeft} days
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-bold mb-1">Plan Expiration</div>
                  <div>Expires on: {format(expiryDate, "MMM d, yyyy")}</div>
                  <div>{daysLeft} days remaining</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      sortable: true,
      width: "100px",
      alignment: "start",
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (patient) => {
        // Determine badge color based on status
        let badgeClass = "bg-gray-100 text-gray-800"; // default
        if (patient.status === "active")
          badgeClass = "bg-green-100 text-green-800";
        else if (patient.status === "inactive")
          badgeClass = "bg-gray-100 text-gray-800";
        else if (patient.status === "review")
          badgeClass = "bg-amber-100 text-amber-800";
        else if (patient.status === "completed")
          badgeClass = "bg-blue-100 text-blue-800";

        return (
          <Badge className={`${badgeClass} capitalize`}>
            {patient.status || "Unknown"}
          </Badge>
        );
      },
      sortable: true,
      width: "100px",
      alignment: "start",
    },
    {
      id: "lastSession",
      header: "Last Session",
      accessorFn: (patient) => {
        // Find the latest session date
        const latestSession =
          patient.sessions && patient.sessions.length > 0
            ? patient.sessions.sort((a, b) => {
                const dateA = new Date(a.sessionDate).getTime();
                const dateB = new Date(b.sessionDate).getTime();
                return dateB - dateA; // Sort in descending order (newest first)
              })[0]
            : null;

        return (
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            {latestSession ? (
              <span>
                {format(new Date(latestSession.sessionDate), "MMM d")}
              </span>
            ) : (
              <span>None</span>
            )}
          </div>
        );
      },
      sortable: true,
      width: "100px",
      alignment: "start",
    },
    {
      id: "actions",
      header: "",
      accessorFn: (patient) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setLocation(`/patient/${patient.id}/summary`)}
              >
                <BarChart className="h-4 w-4 mr-2" />
                View Summary
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLocation(`/patient/${patient.id}/profile`)}
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.open(`/patient/${patient.id}/print`, "_blank")
                }
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <FilePlus className="h-4 w-4 mr-2" />
                New Session
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="h-4 w-4 mr-2" />
                Share Access
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteClick(patient.id)}
                className="text-red-600 focus:text-red-600"
              >
                <X className="h-4 w-4 mr-2" />
                Delete Patient
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      width: "50px",
      alignment: "end",
    },
  ];

  // Handle sorting change
  const handleSortChange = (columnId: string) => {
    if (sortBy === columnId) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and reset to ascending
      setSortBy(columnId);
      setSortDirection("asc");
    }
  };

  // Handle new patient button click
  const handleNewPatient = () => {
    setLocation("/patients/new");
  };

  // Handle patient deletion
  const deletePatient = async (patientId: number) => {
    if (!patientId) return;

    setIsDeleting(true);
    try {
      // Use the apiRequest function instead of fetch directly
      await apiRequest("DELETE", `/api/patients/${patientId}`);

      // Invalidate queries to refresh data
      // First invalidate the base patient query
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      // Also invalidate the enriched patients query since the component uses this for display
      queryClient.invalidateQueries({ queryKey: ["/api/patients/enriched"] });

      // Reset delete dialog state
      setClientToDelete(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete patient:", error);
      // Consider showing an error toast here if you want to inform the user
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle patient delete button click
  const handleDeleteClick = (patientId: number) => {
    setClientToDelete(patientId);
    setDeleteDialogOpen(true);
  };

  // Filter and sort the patients
  const filteredAndSortedPatients = React.useMemo(() => {
    if (!enrichedPatients) return [];

    let results = [...enrichedPatients];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      results = results.filter(
        (patient) =>
          patient.name.toLowerCase().includes(searchLower) ||
          patient.id.toString().includes(searchLower) ||
          (patient.caregivers &&
            patient.caregivers.some((t) =>
              t.name.toLowerCase().includes(searchLower)
            ))
      );
    }

    // Apply status filter
    if (filterStatus.length > 0) {
      results = results.filter(
        (patient) => patient.status && filterStatus.includes(patient.status)
      );
    }

    // Apply sorting
    if (sortBy) {
      results.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        // Handle special sorting cases based on columnId
        switch (sortBy) {
          case "id":
            aValue = a.id;
            bValue = b.id;
            break;
          case "name":
            aValue = a.name;
            bValue = b.name;
            break;
          case "age":
            aValue = a.age || 0;
            bValue = b.age || 0;
            break;
          case "goals":
            aValue = a.goals?.length || 0;
            bValue = b.goals?.length || 0;
            break;
          case "score":
            aValue = a.score || 0;
            bValue = b.score || 0;
            break;
          case "budget":
            // Sort by budget usage percentage using session notes with products
            // Calculate total allocated budget from ACTIVE budget items for patient A
            const aActiveBudgetItems = a.budgetItems.filter(
              (item) => item.isActivePlan !== false
            );

            const aTotalAllocated = aActiveBudgetItems.reduce((acc, item) => {
              const unitPrice =
                typeof item.unitPrice === "string"
                  ? parseFloat(item.unitPrice)
                  : item.unitPrice;
              const quantity =
                typeof item.quantity === "string"
                  ? parseInt(item.quantity)
                  : item.quantity;
              return acc + unitPrice * quantity;
            }, 0);

            // Calculate total allocated budget from ACTIVE budget items for patient B
            const bActiveBudgetItems = b.budgetItems.filter(
              (item) => item.isActivePlan !== false
            );
            const bTotalAllocated = bActiveBudgetItems.reduce((acc, item) => {
              const unitPrice =
                typeof item.unitPrice === "string"
                  ? parseFloat(item.unitPrice)
                  : item.unitPrice;
              const quantity =
                typeof item.quantity === "string"
                  ? parseInt(item.quantity)
                  : item.quantity;
              return acc + unitPrice * quantity;
            }, 0);

            const aTotalFunds = aTotalAllocated;
            const bTotalFunds = bTotalAllocated;

            // Calculate actual usage from session notes with products
            let aUsedBudget = 0;
            let bUsedBudget = 0;

            // For patient A
            if (
              a.sessionNotesWithProducts &&
              a.sessionNotesWithProducts.length > 0
            ) {
              // Calculate used budget from session notes with products
              a.sessionNotesWithProducts.forEach((sessionNote) => {
                if (
                  sessionNote.products &&
                  Array.isArray(sessionNote.products)
                ) {
                  sessionNote.products.forEach((product) => {
                    const unitPrice =
                      typeof product.unitPrice === "string"
                        ? parseFloat(product.unitPrice)
                        : product.unitPrice || 0;
                    const quantity =
                      typeof product.quantity === "string"
                        ? parseInt(product.quantity)
                        : product.quantity || 0;
                    aUsedBudget += unitPrice * quantity;
                  });
                }
              });
            } else if (a.budgetItems && a.budgetItems.length > 0) {
              // Fallback: Calculate from budget items' usedQuantity field if available
              a.budgetItems.forEach((item) => {
                const unitPrice =
                  typeof item.unitPrice === "string"
                    ? parseFloat(item.unitPrice)
                    : item.unitPrice;
                const usedQty = item.usedQuantity || 0;
                aUsedBudget += unitPrice * usedQty;
              });
            }

            // For patient B
            if (
              b.sessionNotesWithProducts &&
              b.sessionNotesWithProducts.length > 0
            ) {
              // Calculate used budget from session notes with products
              b.sessionNotesWithProducts.forEach((sessionNote) => {
                if (
                  sessionNote.products &&
                  Array.isArray(sessionNote.products)
                ) {
                  sessionNote.products.forEach((product) => {
                    const unitPrice =
                      typeof product.unitPrice === "string"
                        ? parseFloat(product.unitPrice)
                        : product.unitPrice || 0;
                    const quantity =
                      typeof product.quantity === "string"
                        ? parseInt(product.quantity)
                        : product.quantity || 0;
                    bUsedBudget += unitPrice * quantity;
                  });
                }
              });
            } else if (b.budgetItems && b.budgetItems.length > 0) {
              // Fallback: Calculate from budget items' usedQuantity field if available
              b.budgetItems.forEach((item) => {
                const unitPrice =
                  typeof item.unitPrice === "string"
                    ? parseFloat(item.unitPrice)
                    : item.unitPrice;
                const usedQty = item.usedQuantity || 0;
                bUsedBudget += unitPrice * usedQty;
              });
            }

            // Safety check - don't show more than 100% usage
            aUsedBudget = Math.min(aUsedBudget, aTotalFunds);
            bUsedBudget = Math.min(bUsedBudget, bTotalFunds);

            aValue = aTotalFunds > 0 ? (aUsedBudget / aTotalFunds) * 100 : 0;
            bValue = bTotalFunds > 0 ? (bUsedBudget / bTotalFunds) * 100 : 0;
            break;
          case "expiry":
            // Calculate days left until expiration
            const aEndOfPlan = a.budgetSettings?.endOfPlan;
            const bEndOfPlan = b.budgetSettings?.endOfPlan;

            // If no end of plan or inactive, sort to the end
            if (!aEndOfPlan || !a.budgetSettings?.isActive) {
              aValue = Number.MAX_SAFE_INTEGER;
            } else {
              const today = new Date();
              const aExpiryDate = new Date(aEndOfPlan);
              aValue = Math.ceil(
                (aExpiryDate.getTime() - today.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
            }

            if (!bEndOfPlan || !b.budgetSettings?.isActive) {
              bValue = Number.MAX_SAFE_INTEGER;
            } else {
              const today = new Date();
              const bExpiryDate = new Date(bEndOfPlan);
              bValue = Math.ceil(
                (bExpiryDate.getTime() - today.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
            }
            break;
          case "status":
            aValue = a.status || "";
            bValue = b.status || "";
            break;
          default:
            aValue = a[sortBy as keyof EnrichedPatient] || 0;
            bValue = b[sortBy as keyof EnrichedPatient] || 0;
        }

        // Perform the comparison
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return results;
  }, [enrichedPatients, searchTerm, filterStatus, sortBy, sortDirection]);

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(filteredAndSortedPatients.map((c) => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on`, selectedClients);
    // Implement bulk actions here

    // Clear selection after action
    setSelectedClients([]);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterStatus([]);
    setSortBy("name");
    setSortDirection("asc");
  };

  // Render loading skeleton
  if (isLoading || isEnrichingClients) {
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Patient Management
          </h1>
          <Skeleton className="h-10 w-36" />
        </div>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <Skeleton className="h-10 w-48" />
              <div className="flex space-x-2">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex space-x-4">
                <Skeleton className="h-8 w-[5%]" />
                <Skeleton className="h-8 w-[15%]" />
                <Skeleton className="h-8 w-[10%]" />
                <Skeleton className="h-8 w-[15%]" />
                <Skeleton className="h-8 w-[10%]" />
                <Skeleton className="h-8 w-[10%]" />
                <Skeleton className="h-8 w-[10%]" />
                <Skeleton className="h-8 w-[10%]" />
                <Skeleton className="h-8 w-[10%]" />
                <Skeleton className="h-8 w-[10%]" />
              </div>

              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex space-x-4">
                  <Skeleton className="h-14 w-[5%]" />
                  <Skeleton className="h-14 w-[15%]" />
                  <Skeleton className="h-14 w-[10%]" />
                  <Skeleton className="h-14 w-[15%]" />
                  <Skeleton className="h-14 w-[10%]" />
                  <Skeleton className="h-14 w-[10%]" />
                  <Skeleton className="h-14 w-[10%]" />
                  <Skeleton className="h-14 w-[10%]" />
                  <Skeleton className="h-14 w-[10%]" />
                  <Skeleton className="h-14 w-[10%]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Patient Management
          </h1>
          <Button onClick={handleNewPatient}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Patient
          </Button>
        </div>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-red-100 p-3 mb-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium mb-1">
                Failed to load patients
              </h3>
              <p className="text-gray-500 mb-4">
                There was an error loading the patient list.
              </p>
              <Button
                onClick={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["/api/patients"],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["/api/patients/enriched"],
                  });
                }}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
        <Button
          onClick={handleNewPatient}
          className="bg-primary hover:bg-primary/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Patient
        </Button>
      </div>

      {/* Patient table card */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg font-semibold text-gray-800">
                Patient List
              </CardTitle>
              <Badge>{filteredAndSortedPatients.length} patients</Badge>
            </div>

            <div className="flex items-center space-x-2">
              {selectedClients.length > 0 && (
                <div className="flex items-center mr-2">
                  <Badge variant="outline" className="mr-2 bg-primary/10">
                    {selectedClients.length} selected
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Actions
                        <ChevronDown className="ml-1 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => handleBulkAction("export")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBulkAction("print")}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Reports
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBulkAction("session")}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Sessions
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              <div className="relative flex items-center">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Search patients..."
                  className="pl-9 h-9 w-[200px] lg:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="absolute right-2.5 top-2.5"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>

              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-9 w-9 ${
                      filterStatus.length > 0
                        ? "bg-primary/10 border-primary"
                        : ""
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium">Filter Patients</h4>

                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">
                        Status
                      </h5>
                      <div className="grid grid-cols-2 gap-2">
                        {["active", "inactive", "review", "completed"].map(
                          (status) => (
                            <div
                              key={status}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`status-${status}`}
                                checked={filterStatus.includes(status)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFilterStatus([...filterStatus, status]);
                                  } else {
                                    setFilterStatus(
                                      filterStatus.filter((s) => s !== status)
                                    );
                                  }
                                }}
                              />
                              <label
                                htmlFor={`status-${status}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                              >
                                {status}
                              </label>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearFilters}
                      >
                        Reset
                      </Button>
                      <Button size="sm" onClick={() => setShowFilters(false)}>
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("export-all")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export All Clients
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      queryClient.invalidateQueries({
                        queryKey: ["/api/patients"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["/api/patients/enriched"],
                      });
                    }}
                  >
                    <LineChart className="h-4 w-4 mr-2" />
                    Refresh Data
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredAndSortedPatients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-2">No patients found</p>
              {searchTerm || filterStatus.length > 0 ? (
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  className="mt-2"
                >
                  Clear filters
                </Button>
              ) : (
                <Button
                  onClick={handleNewPatient}
                  variant="outline"
                  className="mt-2"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add your first patient
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-auto !p-0">
              <table className="w-full table-fixed divide-y divide-gray-200 border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-[40px]">
                      <Checkbox
                        checked={
                          selectedClients.length > 0 &&
                          selectedClients.length ===
                            filteredAndSortedPatients.length
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    {columns.slice(1).map((column) => (
                      <th
                        key={column.id}
                        className={`py-3.5 text-sm font-semibold text-gray-900 ${
                          column.alignment === "center"
                            ? "text-center px-3"
                            : column.alignment === "end"
                            ? "text-right px-3"
                            : column.id === "name"
                            ? "text-left pl-3 pr-3"
                            : "text-left px-3"
                        }`}
                        style={
                          column.width
                            ? { width: column.width, minWidth: column.width }
                            : {}
                        }
                      >
                        {column.sortable ? (
                          <button
                            className={`group inline-flex items-center ${
                              column.id === "name" ? "!pl-0 -translate-x-3" : ""
                            }`}
                            onClick={() => handleSortChange(column.id)}
                          >
                            {column.header}
                            <span className="ml-2 flex-none rounded text-gray-400">
                              {sortBy === column.id ? (
                                sortDirection === "asc" ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )
                              ) : (
                                <ChevronUp className="h-4 w-4 opacity-0 group-hover:opacity-50" />
                              )}
                            </span>
                          </button>
                        ) : (
                          column.header
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredAndSortedPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      {columns.map((column) => (
                        <td
                          key={`${patient.id}-${column.id}`}
                          className={`whitespace-nowrap py-4 text-sm ${
                            column.alignment === "center"
                              ? "text-center px-3"
                              : column.alignment === "end"
                              ? "text-right px-3"
                              : column.id === "name"
                              ? "text-left pl-3 pr-3"
                              : "text-left px-3"
                          }`}
                          style={
                            column.width
                              ? { width: column.width, minWidth: column.width }
                              : {}
                          }
                        >
                          {column.accessorFn(patient)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Patient</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this patient? This action cannot
              be undone and all associated data will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center space-x-2 py-3">
            <div className="rounded-full bg-red-100 p-2">
              <X className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium">
                {patientToDelete &&
                  enrichedPatients?.find((c) => c.id === patientToDelete)?.name}
              </p>
              <p className="text-sm text-gray-500">ID: {patientToDelete}</p>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setClientToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => patientToDelete && deletePatient(patientToDelete)}
              disabled={isDeleting}
              className="gap-1"
            >
              {isDeleting ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Deleting...
                </>
              ) : (
                "Delete Patient"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
