import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Mic, 
  FileText, 
  Video, 
  Chrome, 
  User, 
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/ai-interview', label: 'AI Interview', icon: Mic },
  { path: '/dashboard/resume-interview', label: 'Resume Interview', icon: FileText },
  { path: '/dashboard/live-meeting', label: 'Live Meeting', icon: Video },
  { path: '/dashboard/chrome-extension', label: 'Chrome Extension', icon: Chrome },
  { path: '/dashboard/profile', label: 'Profile', icon: User },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Check if current page is LiveMeeting (needs different overflow handling)
  const isLiveMeetingPage = location.pathname.includes('/live-meeting');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Keyboard shortcut to toggle sidebar (Ctrl/Cmd + B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out shadow-2xl",
        sidebarOpen ? "w-64" : "w-0"
      )}>
        <div className={cn(
          "flex flex-col h-full w-64 transition-opacity duration-300",
          sidebarOpen ? "opacity-100 delay-100" : "opacity-0 pointer-events-none"
        )}>
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-sidebar-primary" />
              <span className="text-xl font-bold">InterviewAI</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "hover:bg-sidebar-accent text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-lg font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.name}</p>
                <p className="text-sm text-sidebar-foreground/70 truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Floating Toggle Button (when sidebar is closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-4 rounded-r-xl shadow-2xl transition-all duration-300 hover:scale-110 hover:pr-6 group"
          title="Open Sidebar (Ctrl+B)"
        >
          <div className="flex items-center gap-2">
            <ChevronRight className="h-6 w-6" />
            <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              Open
            </span>
          </div>
        </button>
      )}

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 h-full overflow-hidden",
        sidebarOpen ? "ml-64" : "ml-0"
      )}>
        <header className="sticky top-0 z-40 border-b border-border px-4 lg:px-8 py-4 flex items-center gap-4 backdrop-blur-sm bg-card/95 flex-shrink-0">
          <button 
            className="p-2 hover:bg-muted rounded-lg transition-all duration-200 hover:scale-110 group"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Close Sidebar (Ctrl+B)" : "Open Sidebar (Ctrl+B)"}
          >
            {sidebarOpen ? (
              <X className="h-6 w-6 text-foreground group-hover:text-red-600 transition-colors" />
            ) : (
              <Menu className="h-6 w-6 text-foreground group-hover:text-blue-600 transition-colors" />
            )}
          </button>
          <div className="flex-1 flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">
              {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
            </h1>
            {!sidebarOpen && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Ctrl+B to toggle
              </span>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className={cn(
          "flex-1",
          isLiveMeetingPage ? "overflow-hidden" : "p-4 lg:p-8 overflow-auto"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
