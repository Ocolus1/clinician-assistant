import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Summary from "@/pages/Summary";
import PrintSummary from "@/pages/PrintSummary";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/summary/:clientId" component={Summary} />
      <Route path="/print-summary/:clientId" component={PrintSummary} />
      <Route component={NotFound} />
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
