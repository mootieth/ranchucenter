import { ReactNode } from "react";
import Sidebar, { SIDEBAR_EXPANDED, SIDEBAR_COLLAPSED } from "./Sidebar";
import Header from "./Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebarState } from "@/contexts/SidebarContext";

interface MainLayoutProps {
  children: ReactNode;
  title: string;
}

const MainLayout = ({ children, title }: MainLayoutProps) => {
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useSidebarState();
  const isMobile = useIsMobile();

  const marginLeft = isMobile ? 0 : sidebarOpen ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <div className="transition-all duration-300" style={{ marginLeft }}>
        <Header title={title} sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />
        <main className="p-4 md:p-6 page-enter">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
