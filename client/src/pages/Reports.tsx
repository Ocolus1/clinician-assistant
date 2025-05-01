import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { Patient } from "../../../shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, Users } from "lucide-react";
import { PatientReports } from "@/components/profile/PatientReports";
import { useState } from "react";

/**
 * Reports page component
 * 
 * This page allows users to access various reports for patients or the practice
 */
export default function Reports() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  
  // Fetch all patients for the dropdown
  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
    queryFn: getQueryFn({
      on401: "throw",
      getFn: () => ({ url: '/api/patients' })
    })
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Access performance reports, progress tracking, and budget analysis
        </p>
      </div>
      
      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Patient Reports
            </CardTitle>
            <CardDescription>
              View performance metrics and progress reports for individual patients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex flex-col space-y-2">
                {isLoading ? (
                  <p className="text-muted-foreground">Loading patients...</p>
                ) : patients && patients.length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select a patient:</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={selectedPatientId || ""}
                      onChange={(e) => setSelectedPatientId(e.target.value ? parseInt(e.target.value) : null)}
                    >
                      <option value="">-- Select a patient --</option>
                      {patients.map((patient: Patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No patients found</p>
                )}
              </div>
            </div>
            <div className="mt-4">
              {selectedPatientId ? (
                <Button 
                  variant="default" 
                  onClick={() => window.location.href = `/patient/${selectedPatientId}/profile?tab=reports`}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Reports
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  <FileText className="mr-2 h-4 w-4" />
                  Select a patient
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Practice Reports
            </CardTitle>
            <CardDescription>
              View aggregated performance metrics and statistics for your practice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Practice-wide reporting provides insights across all patients and therapists.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Patient Overview
                </Button>
                <Button variant="outline" className="justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Budget Analysis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Preview panel for selected patient */}
      {selectedPatientId && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>
                Patient Performance Preview
              </CardTitle>
              <CardDescription>
                {patients?.find((p: Patient) => p.id === selectedPatientId)?.name || 'Selected patient'} - Performance Report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PatientReports patientId={selectedPatientId} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
