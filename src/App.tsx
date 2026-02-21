import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PatientRegister from "./pages/PatientRegister";
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";
import Appointments from "./pages/Appointments";
import Treatments from "./pages/Treatments";
import Prescriptions from "./pages/Prescriptions";
import Allergies from "./pages/Allergies";
import Billing from "./pages/Billing";

import UserManagement from "./pages/UserManagement";
import PermissionManagement from "./pages/PermissionManagement";
import InventoryManagement from "./pages/InventoryManagement";
import ServiceManagement from "./pages/ServiceManagement";
import MyProfile from "./pages/MyProfile";
import StaffRegister from "./pages/StaffRegister";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/staff-register" element={<StaffRegister />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/register" element={<ProtectedRoute><PatientRegister /></ProtectedRoute>} />
              <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
              <Route path="/patients/:id" element={<ProtectedRoute><PatientProfile /></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
              <Route path="/treatments" element={<ProtectedRoute allowedRoles={["admin", "doctor", "therapist"]}><Treatments /></ProtectedRoute>} />
              <Route path="/prescriptions" element={<ProtectedRoute allowedRoles={["admin", "doctor"]}><Prescriptions /></ProtectedRoute>} />
              <Route path="/allergies" element={<ProtectedRoute><Allergies /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><Billing /></ProtectedRoute>} />
              <Route path="/medications" element={<ProtectedRoute allowedRoles={["admin", "doctor"]}><InventoryManagement /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute allowedRoles={["admin"]}><UserManagement /></ProtectedRoute>} />
              <Route path="/permissions" element={<ProtectedRoute><PermissionManagement /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute allowedRoles={["admin", "doctor"]}><InventoryManagement /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowedRoles={["admin"]}><ServiceManagement /></ProtectedRoute>} />
              <Route path="/my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
