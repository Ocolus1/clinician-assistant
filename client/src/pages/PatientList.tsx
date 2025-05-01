import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  PlusCircle,
  Edit,
  User,
  Calendar,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Patient } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PatientList() {
  const [location, setLocation] = useLocation();
  const [showIncomplete, setShowIncomplete] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  // Fetch patients with server-side filtering
  const {
    data: patients = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Patient[]>({
    queryKey: ["/api/patients", { includeIncomplete: showIncomplete }],
    queryFn: async ({ queryKey }) => {
      // Extract includeIncomplete from queryKey
      const params = queryKey[1] as { includeIncomplete: boolean };
      const response = await fetch(
        `/api/patients?includeIncomplete=${params.includeIncomplete}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch patients");
      }
      return response.json();
    },
  });

  // When showIncomplete changes, refetch with the new parameter
  useEffect(() => {
    refetch();
  }, [showIncomplete, refetch]);

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: (patientId: number) =>
      apiRequest("DELETE", `/api/patients/${patientId}`),
    onSuccess: () => {
      // Show success toast
      toast({
        title: "Patient deleted",
        description: "The patient has been successfully deleted",
        variant: "default",
      });

      // Invalidate both standard patients query and enriched patients query
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients/enriched"] });

      // Reset patient to delete
      setPatientToDelete(null);
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: "Error deleting patient",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleNewPatient = () => {
    setLocation("/patients/new");
  };

  const openDeleteDialog = (patient: Patient) => {
    setPatientToDelete(patient);
    setDeleteDialogOpen(true);
  };

  const handleDeletePatient = () => {
    if (patientToDelete) {
      deletePatientMutation.mutate(patientToDelete.id);
      setDeleteDialogOpen(false);
    }
  };

  // Add specific styles for this page
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .patient-list-container {
        width: 100%;
        max-width: 100%;
        display: flex;
        flex-direction: column;
      }
      .patient-card {
        width: 100%;
        max-width: 100%;
        flex: 1;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div
      className="patient-list-container w-full flex flex-col"
      style={{ width: "100%", maxWidth: "100%" }}
    >
      {/* Header section */}
      <div className="flex justify-between items-center mb-6 w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Patient Management
          </h1>
          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="show-incomplete"
              checked={showIncomplete}
              onChange={(e) => setShowIncomplete(e.target.checked)}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="show-incomplete" className="text-sm text-gray-600">
              Show incomplete patients
            </label>
          </div>
        </div>
        <Button
          onClick={handleNewPatient}
          className="bg-primary hover:bg-primary/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Patient
        </Button>
      </div>

      {/* Patient list card */}
      <Card className="patient-card border-gray-200 shadow-sm w-full">
        <div className="bg-gray-50 p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Patient List</h2>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex flex-col space-y-3 p-4 border border-gray-100 rounded-md"
                >
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex space-x-4">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              <p>Failed to load patients. Please try again.</p>
            </div>
          ) : patients && patients.length > 0 ? (
            <ul className="divide-y divide-gray-200 w-full">
              {patients.map((patient: Patient) => (
                <li
                  key={patient.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between p-5">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="flex items-center justify-center bg-gray-100 rounded-full h-10 w-10 text-gray-700 mr-3">
                          <User className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {patient.name}
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1 space-x-3">
                            <div className="flex items-center">
                              <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400" />
                              <span>
                                {patient.dateOfBirth
                                  ? format(
                                      new Date(patient.dateOfBirth),
                                      "MMM d, yyyy"
                                    )
                                  : "Unknown"}
                              </span>
                            </div>
                            {patient.fundsManagement && (
                              <Badge
                                variant="outline"
                                className="text-xs font-normal"
                              >
                                {patient.fundsManagement}
                              </Badge>
                            )}
                            {patient.onboardingStatus === "incomplete" && (
                              <Badge
                                variant="destructive"
                                className="text-xs font-normal ml-2"
                              >
                                Incomplete
                              </Badge>
                            )}
                            {patient.onboardingStatus === "complete" && (
                              <Badge
                                variant="outline"
                                className="text-xs font-normal bg-green-100 text-green-800 hover:bg-green-200 border-green-200 ml-2"
                              >
                                Complete
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() =>
                          setLocation(`/patient/${patient.id}/summary`)
                        }
                        variant="outline"
                        size="sm"
                        className="text-primary hover:text-primary-dark"
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        onClick={() => setLocation(`/patient/${patient.id}/edit`)}
                        variant="outline"
                        size="sm"
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => openDeleteDialog(patient)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                        disabled={deletePatientMutation.isPending}
                      >
                        {deletePatientMutation.isPending &&
                        deletePatientMutation.variables === patient.id ? (
                          <>
                            <span className="animate-spin h-4 w-4 mr-1">
                              ⏳
                            </span>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-2">No patients found</p>
              <Button
                onClick={handleNewPatient}
                variant="outline"
                className="mt-2"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add your first patient
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete {patientToDelete?.name}'s
              record and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePatient}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deletePatientMutation.isPending}
            >
              {deletePatientMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
