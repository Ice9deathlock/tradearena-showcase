import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Competitions from "./pages/Competitions";
import CompetitionDetail from "./pages/CompetitionDetail";
import MyCompetitionDashboard from "./pages/MyCompetitionDashboard";
import Trading from "./pages/Trading";
import TradingPlatform from "./pages/TradingPlatform";
import Leaderboard from "./pages/Leaderboard";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import AdminBlueprint from "./pages/AdminBlueprint";
import AdminDev from "./pages/AdminDev";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/competitions" element={<Competitions />} />
            <Route path="/competitions/:id" element={<CompetitionDetail />} />
            <Route path="/dashboard/:id" element={
              <ProtectedRoute>
                <MyCompetitionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/trading" element={<Trading />} />
            <Route path="/trading-platform" element={<TradingPlatform />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/wallet" element={
              <ProtectedRoute>
                <Wallet />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin>
                <AdminBlueprint />
              </ProtectedRoute>
            } />
            <Route path="/dev" element={
              <ProtectedRoute requireAdmin>
                <AdminDev />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
