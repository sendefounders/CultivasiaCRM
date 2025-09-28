import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  BarChart3, 
  List, 
  Receipt, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3, id: "dashboard" },
    { name: "Call List", href: "/call-list", icon: List, id: "call-list" },
    { name: "Transactions", href: "/transactions", icon: Receipt, id: "transactions" },
    { name: "Setup", href: "/setup", icon: Settings, id: "setup", adminOnly: true },
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || user?.role === 'admin'
  );

  return (
    <aside 
      className={cn(
        "bg-white border-r border-border flex flex-col shadow-sm transition-all duration-300",
        isCollapsed ? "w-20" : "w-72"
      )}
      data-testid="sidebar"
    >
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center space-x-3", isCollapsed && "justify-center")}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Phone className="h-5 w-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-semibold text-lg text-foreground">Cultivasia</h1>
                <p className="text-xs text-muted-foreground">CRM System</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2"
            data-testid="button-toggle-sidebar"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* User Info */}
      <div className="p-6 border-b border-border">
        <div className={cn("flex items-center space-x-3", isCollapsed && "justify-center")}>
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
            {user ? (
              <span className="text-white font-medium text-sm">
                {getInitials(user.username)}
              </span>
            ) : (
              <User className="h-5 w-5 text-white" />
            )}
          </div>
          {!isCollapsed && (
            <div>
              <p className="font-medium text-sm" data-testid="text-username">
                {user?.username || "User"}
              </p>
              <p className="text-xs text-muted-foreground capitalize" data-testid="text-user-role">
                {user?.role || "Agent"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <a
                    className={cn(
                      "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      isCollapsed && "justify-center"
                    )}
                    data-testid={`nav-${item.id}`}
                  >
                    <Icon className="h-5 w-5" />
                    {!isCollapsed && <span>{item.name}</span>}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors w-full",
            isCollapsed && "justify-center"
          )}
          data-testid="button-logout"
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
