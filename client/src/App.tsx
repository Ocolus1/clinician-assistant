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
import Sessions from "@/pages/Sessions";
import Settings from "@/pages/Settings";
import { AppLayout } from "@/components/layout/AppLayout";
// Agent components
import { AgentProvider } from '@/components/agent/AgentContext';
import AgentBubble from '@/components/agent/AgentBubble';
import AgentPanel from '@/components/agent/AgentPanel';
import AgentVisualization from '@/components/agent/AgentVisualization';

function Router() {
  const [location] = useLocation();
  
  // Check if the current route is the print summary page or dashboard (special layouts)
  const isPrintPage = location.startsWith("/print-summary");
  const isDashboard = location === "/";
  
  // Routes that should be wrapped in the AppLayout (excludes Dashboard)
  const LayoutRoutes = () => (
    <AppLayout>
      <Switch>
        <Route path="/clients/new" component={OnboardingForm} />
        <Route path="/clients" component={EnhancedClientList} />
        <Route path="/clients/legacy" component={ClientList} />
        <Route path="/summary/:clientId" component={Summary} />
        <Route path="/client/:clientId/summary" component={Summary} />
        <Route path="/client/:id/profile" component={ClientProfile} />
        <Route path="/clients/:id/profile" component={ClientProfile} />
        <Route path="/client/:id/print" component={PrintSummary} />
        <Route path="/sessions" component={Sessions} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
  
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
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
      <AgentProvider>
        <Router />
        <AgentBubble />
        <AgentPanel />
        <AgentVisualization type="NONE" />
        <Toaster />
      </AgentProvider>
    </QueryClientProvider>
  );
}

export default App;
