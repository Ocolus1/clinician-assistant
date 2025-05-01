import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import ModularDashboard from "@/pages/ModularDashboard";
import OnboardingForm from "@/pages/OnboardingForm";
import Summary from "@/pages/Summary";
import PrintSummary from "@/pages/PrintSummary";
import PatientList from "@/pages/PatientList";
import EnhancedPatientList from "@/pages/EnhancedPatientList";
import PatientProfile from "@/pages/PatientProfile";
import Sessions from "@/pages/Sessions";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import TestBudget from "@/pages/TestBudget";
import BudgetDebugPage from "@/pages/BudgetDebugPage";
import { AppLayout } from "@/components/layout/AppLayout";

function Router() {
  const [location] = useLocation();
  
  // Special case for dashboard route (root path)
  if (location === "/") {
    return <ModularDashboard />;
  }
  
  // Special case for print summary route
  if (location.startsWith("/print-summary")) {
    return <PrintSummary />;
  }
  
  // For all other routes, use the standard app layout
  return (
    <AppLayout>
      <Switch>
        <Route path="/dashboard/classic" component={Dashboard} />
        <Route path="/patients/new" component={OnboardingForm} />
        <Route path="/patients" component={EnhancedPatientList} />
        <Route path="/patients/legacy" component={PatientList} />
        <Route path="/patients/:id" component={PatientProfile} />
        <Route path="/summary/:patientId" component={Summary} />
        <Route path="/patient/:patientId/summary" component={Summary} />
        <Route path="/patient/:id/profile" component={PatientProfile} />
        <Route path="/patients/:id/profile" component={PatientProfile} />
        <Route path="/patients/:id/reports" component={Reports} />
        <Route path="/patient/:id/reports" component={Reports} />
        <Route path="/patient/:id/print" component={PrintSummary} />
        <Route path="/sessions" component={Sessions} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route path="/test-budget" component={TestBudget} />
        <Route path="/debug/budget/:patientId?" component={BudgetDebugPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
