import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import Register from "./pages/Register";
import KYC from "./pages/KYC";
import Plans from "./pages/Plans";
import Dashboard from "./pages/Dashboard";
import TriggerAlert from "./pages/TriggerAlert";
import Payouts from "./pages/Payouts";
import PayoutDetail from "./pages/PayoutDetail";
import Weather from "./pages/Weather";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/register" element={<Register />} />
          <Route path="/kyc" element={<KYC />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trigger" element={<TriggerAlert />} />
          <Route path="/payouts" element={<Payouts />} />
          <Route path="/payout-detail" element={<PayoutDetail />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
