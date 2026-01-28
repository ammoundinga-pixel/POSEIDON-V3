import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Users,
  Briefcase,
  CheckSquare,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Network,
  Activity as ActivityIcon
} from 'lucide-react';
import { Button } from '../ui/button';

export const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const { user, logout, isAdmin, isManager } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const navigation = [
    { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'manager', 'employee'] },
    { name: 'Calendrier', href: '/calendar', icon: Calendar, roles: ['super_admin', 'admin', 'manager', 'employee'] },
    { name: 'Saisie du temps', href: '/time-entry', icon: Clock, roles: ['super_admin', 'admin', 'manager', 'employee'] },
    { name: 'Planning', href: '/planning', icon: Calendar, roles: ['super_admin', 'admin', 'manager'] },
    { name: 'Activité', href: '/activity', icon: ActivityIcon, roles: ['super_admin', 'admin', 'manager'] },
    { name: 'Validation', href: '/validation', icon: CheckSquare, roles: ['super_admin', 'admin', 'manager'] },
    { name: 'Projets', href: '/projects', icon: Briefcase, roles: ['super_admin', 'admin', 'manager'] },
    { name: 'Organigramme', href: '/organization', icon: Network, roles: ['super_admin', 'admin', 'manager', 'employee'] },
    { name: 'Utilisateurs', href: '/users', icon: Users, roles: ['super_admin', 'admin'] },
    { name: 'Analytique', href: '/analytics', icon: BarChart3, roles: ['super_admin', 'admin', 'manager'] },
    { name: 'Profil', href: '/profile', icon: Settings, roles: ['super_admin', 'admin', 'manager', 'employee'] }
  ];

  const filteredNavigation = navigation.filter(item => item.roles.includes(user?.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-slate-900/80 border-b border-border/50 shadow-sm">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button
              data-testid="toggle-sidebar-button"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-2xl font-heading font-bold tracking-tight bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent">
              POSÉIDON
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Button
              data-testid="toggle-theme-button"
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role.replace('_', ' ')}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center text-white font-semibold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-border bg-card transition-transform duration-200 ease-in-out z-40 overflow-y-auto`}
        >
          <nav className="p-4 space-y-2">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${
                    isActive
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium text-sm">{item.name}</span>
                </Link>
              );
            })}
            <Button
              data-testid="logout-button"
              variant="ghost"
              className="w-full justify-start gap-3 px-4 py-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium text-sm">Déconnexion</span>
            </Button>
          </nav>
        </aside>

        {/* Main content */}
        <main
          className={`flex-1 transition-all duration-200 ${
            sidebarOpen ? 'ml-64' : 'ml-0'
          }`}
        >
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};