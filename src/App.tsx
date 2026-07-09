import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import ThemeBackground from "@/components/ThemeBackground";
import Index from "./pages/Index";
import Match from "./pages/Match";
import Teams from "./pages/Teams";
import MatchDetailPage from "./pages/MatchDetailPage";
import SantPauGlobalStats from "./pages/SantPauGlobalStats";
import LiveMatchPage from "./pages/LiveMatchPage";
import NotFound from "./pages/NotFound";
import TacticalBoard from "./pages/TacticalBoard";
import TacticalViewer from "./pages/TacticalViewer";
import Callups from "./pages/Callups";
import MatchHistory from "./pages/MatchHistory";
import FormularioTemporada from "./pages/FormularioTemporada";
import FormularioAdmin from "./pages/FormularioAdmin";
import EntrenamientosHome from "./pages/entrenamientos/EntrenamientosHome";
import SessionEditor from "./pages/entrenamientos/SessionEditor";
import PublicSessionView from "./pages/entrenamientos/PublicSessionView";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ThemeBackground>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/match" element={<Match />} />
                <Route path="/match/edit/:matchId" element={<Match />} />
                <Route path="/match/:id" element={<MatchDetailPage />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/sant-pau-stats" element={<SantPauGlobalStats />} />
                <Route path="/live/:sessionId" element={<LiveMatchPage />} />
                <Route path="/tactical" element={<TacticalBoard />} />
                <Route path="/tactical/view/:id" element={<TacticalViewer />} />
                <Route path="/callups" element={<Callups />} />
                <Route path="/history" element={<MatchHistory />} />
                <Route path="/formulario" element={<FormularioTemporada />} />
                <Route path="/formulario/admin" element={<FormularioAdmin />} />
                <Route path="/entrenamientos" element={<EntrenamientosHome />} />
                <Route path="/entrenamientos/sesion/:id" element={<SessionEditor />} />
                <Route path="/entrenamientos/publico/:token" element={<PublicSessionView />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ThemeBackground>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
