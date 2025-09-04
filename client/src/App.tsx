import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Router } from "wouter";
import Dashboard from "@/pages/Dashboard";
import DepositGuide from "@/pages/DepositGuide";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/deposit" component={DepositGuide} />
          </Switch>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;