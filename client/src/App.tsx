import { useState } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MobileNavigation } from "@/components/MobileNavigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useWebSocket } from "@/hooks/useWebSocket";
import Dashboard from "@/pages/Dashboard";
import Trades from "@/pages/Trades";
import Scanner from "@/pages/Scanner";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function Router() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { isConnected } = useWebSocket();

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <MobileNavigation isConnected={isConnected} />
      
      <main className="pt-16 pb-20">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/trades" component={Trades} />
          <Route path="/scanner" component={Scanner} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>

      <BottomNavigation 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
