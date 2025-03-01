import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import OnboardingForm from "@/pages/OnboardingForm";
import Summary from "@/pages/Summary";
import PrintSummary from "@/pages/PrintSummary";
import ClientList from "@/pages/ClientList";
import EnhancedClientList from "@/pages/EnhancedClientList";
import ClientProfile from "@/pages/ClientProfile";
import { AppLayout } from "@/components/layout/AppLayout";

function Router() {
  const [location] = useLocation();
  
  // Check if the current route is the print summary page (which shouldn't use the layout)
  const isPrintPage = location.startsWith("/print-summary");
  
  // Routes that should be wrapped in the AppLayout
  const LayoutRoutes = () => (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients/new" component={OnboardingForm} />
        <Route path="/clients" component={EnhancedClientList} />
        <Route path="/clients/legacy" component={ClientList} />
        <Route path="/summary/:clientId" component={Summary} />
        <Route path="/client/:clientId/summary" component={Summary} />
        <Route path="/client/:id/profile" component={ClientProfile} />
        <Route path="/clients/:id/profile" component={ClientProfile} />
        <Route path="/client/:id/print" component={PrintSummary} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
  
  return (
    <Switch>
      <Route path="/print-summary/:clientId" component={PrintSummary} />
      <Route>
        <LayoutRoutes />
      </Route>
    </Switch>
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
