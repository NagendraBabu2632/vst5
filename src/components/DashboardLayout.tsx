import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Settings, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import UserProfileDropdown from "@/components/UserProfileDropdown";
import ThemeToggle from "@/components/ThemeToggle";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

const SETTINGS_TABS: { value: string; label: string }[] = [
  { value: "sku", label: "Family" },
  { value: "tariff", label: "Tariff" },
  { value: "moisture-specs", label: "Moisture Specs" },
  { value: "process", label: "Process Params" },
  { value: "upload", label: "Production Upload" },
  { value: "ec-losses", label: "Electricity Consumption Losses" },
  { value: "alerts", label: "Alert Configurator" },
];

const DashboardLayout = ({ children, title }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground mono">Live</span>
              <span className="h-2 w-2 rounded-full bg-success animate-pulse-glow" />
              <ThemeToggle />
              <Link to="/alerts" className="relative p-2 rounded-md hover:bg-muted">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-critical text-[10px] flex items-center justify-center text-critical-foreground font-bold">2</span>
              </Link>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/settings" className="p-2 rounded-md hover:bg-muted">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <UserProfileDropdown />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
