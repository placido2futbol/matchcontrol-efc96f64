import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Match from "./pages/Match";
import Teams from "./pages/Teams";
import MatchDetailPage from "./pages/MatchDetailPage";
import SantPauGlobalStats from "./pages/SantPauGlobalStats";
import LiveMatchPage from "./pages/LiveMatchPage";
import NotFound from "./pages/NotFound";
import TacticalBoard from "./pages/TacticalBoard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/match" element={<Match />} />
            <Route path="/match/edit/:matchId" element={<Match />} />
            <Route path="/match/:id" element={<MatchDetailPage />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/sant-pau-stats" element={<SantPauGlobalStats />} />
            <Route path="/live/:sessionId" element={<LiveMatchPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
