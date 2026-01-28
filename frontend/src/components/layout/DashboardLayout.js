import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Clock,
  Calendar,
  CalendarDays,
  History,
  LayoutDashboard,
  Activity,
  CheckSquare,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Users,
  Network,
  UserCog,
  Shield,
  Layers,
  ListTodo,
  Tags,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight,
  Gauge
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

// Section Component
const NavSection = ({ title, icon: Icon, children, defaultOpen = true, color }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider ${color} rounded-md hover:bg-secondary/50 transition-colors`}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" />}
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {isOpen && (
        <div className="mt-1 ml-2 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
};

// Nav Item Component
const NavItem = ({ href, icon: Icon, label, badge, isActive }) => {
  return (
    <Link
      to={href}
      data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all ${
        isActive
          ? 'bg-accent text-accent-foreground font-medium shadow-sm'
          : 'hover:bg-secondary text-foreground/80 hover:text-foreground'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className={`h-4 w-4 ${isActive ? '' : 'text-muted-foreground'}`} />}
        <span>{label}</span>
      </div>
      {badge && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {badge}
        </Badge>
      )}
    </Link>
  );
};

export const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });
  const { user, logout, isAdmin, isManager, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (href) => location.pathname === href;
  
  // Role checks
  const isAdminOrSuper = user?.role === 'super_admin' || user?.role === 'admin';
  const isManagerOrAbove = isAdminOrSuper || user?.role === 'manager';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/90 border-b border-border/50 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button
              data-testid="toggle-sidebar-button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <Gauge className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-heading font-bold tracking-tight">
                POSÉIDON
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              data-testid="toggle-theme-button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleDarkMode}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border">
              <div className="text-right">
                <p className="text-sm font-medium leading-tight">{user?.first_name} {user?.last_name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{user?.role?.replace('_', ' ')}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center text-white font-semibold text-sm">
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
            sidebarOpen ? 'translate-x-0 w-60' : '-translate-x-full w-0'
          } fixed left-0 top-14 h-[calc(100vh-3.5rem)] border-r border-border bg-card/50 backdrop-blur-sm transition-all duration-200 ease-in-out z-40 overflow-y-auto overflow-x-hidden`}
        >
          <nav className="p-3 space-y-1">
            
            {/* ═══════════════════════════════════════════════════════════
               SECTION 1: TEMPS & ACTIVITÉ (Tous les utilisateurs)
               ═══════════════════════════════════════════════════════════ */}
            <NavSection 
              title="Temps & Activité" 
              icon={Clock} 
              color="text-blue-600 dark:text-blue-400"
              defaultOpen={true}
            >
              <NavItem 
                href="/time-entry" 
                icon={Clock} 
                label="Saisie du temps" 
                isActive={isActive('/time-entry')}
              />
              <NavItem 
                href="/employee-calendar" 
                icon={CalendarDays} 
                label="Mon planning" 
                isActive={isActive('/employee-calendar')}
              />
              <NavItem 
                href="/calendar" 
                icon={Calendar} 
                label="Calendrier" 
                isActive={isActive('/calendar')}
              />
              <NavItem 
                href="/my-history" 
                icon={History} 
                label="Mon historique" 
                isActive={isActive('/my-history')}
              />
            </NavSection>

            {/* ═══════════════════════════════════════════════════════════
               SECTION 2: PILOTAGE (Managers et Admins)
               ═══════════════════════════════════════════════════════════ */}
            {isManagerOrAbove && (
              <NavSection 
                title="Pilotage" 
                icon={LayoutDashboard} 
                color="text-emerald-600 dark:text-emerald-400"
                defaultOpen={true}
              >
                <NavItem 
                  href="/dashboard" 
                  icon={LayoutDashboard} 
                  label="Tableau de bord" 
                  isActive={isActive('/dashboard')}
                />
                <NavItem 
                  href="/activity" 
                  icon={Activity} 
                  label="Activité temps réel" 
                  isActive={isActive('/activity')}
                />
                <NavItem 
                  href="/validation" 
                  icon={CheckSquare} 
                  label="Validation des temps" 
                  isActive={isActive('/validation')}
                />
                <NavItem 
                  href="/alerts" 
                  icon={AlertTriangle} 
                  label="Alertes & anomalies" 
                  isActive={isActive('/alerts')}
                />
                <NavItem 
                  href="/analytics" 
                  icon={BarChart3} 
                  label="Analytique" 
                  isActive={isActive('/analytics')}
                />
              </NavSection>
            )}

            {/* ═══════════════════════════════════════════════════════════
               SECTION 3: ORGANISATION (Managers et Admins)
               ═══════════════════════════════════════════════════════════ */}
            {isManagerOrAbove && (
              <NavSection 
                title="Organisation" 
                icon={Briefcase} 
                color="text-amber-600 dark:text-amber-400"
                defaultOpen={true}
              >
                <NavItem 
                  href="/projects" 
                  icon={Briefcase} 
                  label="Projets" 
                  isActive={isActive('/projects')}
                />
                <NavItem 
                  href="/planning" 
                  icon={CalendarDays} 
                  label="Planning & Affectations" 
                  isActive={isActive('/planning')}
                />
                <NavItem 
                  href="/teams" 
                  icon={Users} 
                  label="Équipes" 
                  isActive={isActive('/teams')}
                />
                <NavItem 
                  href="/organization" 
                  icon={Network} 
                  label="Organigramme" 
                  isActive={isActive('/organization')}
                />
              </NavSection>
            )}

            {/* ═══════════════════════════════════════════════════════════
               SECTION 4: ADMINISTRATION (Admins uniquement)
               ═══════════════════════════════════════════════════════════ */}
            {isAdminOrSuper && (
              <NavSection 
                title="Administration" 
                icon={Shield} 
                color="text-red-600 dark:text-red-400"
                defaultOpen={false}
              >
                <NavItem 
                  href="/users" 
                  icon={UserCog} 
                  label="Utilisateurs" 
                  isActive={isActive('/users')}
                />
                <NavItem 
                  href="/admin/roles" 
                  icon={Shield} 
                  label="Rôles & permissions" 
                  isActive={isActive('/admin/roles')}
                />
                <NavItem 
                  href="/admin/disciplines" 
                  icon={Layers} 
                  label="Disciplines" 
                  isActive={isActive('/admin/disciplines')}
                />
                <NavItem 
                  href="/admin/activities" 
                  icon={ListTodo} 
                  label="Activités (Tasks)" 
                  isActive={isActive('/admin/activities')}
                />
                <NavItem 
                  href="/admin/booking-codes" 
                  icon={Tags} 
                  label="Prestations (Booking)" 
                  isActive={isActive('/admin/booking-codes')}
                />
                <NavItem 
                  href="/admin/settings" 
                  icon={Settings} 
                  label="Paramètres généraux" 
                  isActive={isActive('/admin/settings')}
                />
              </NavSection>
            )}

            {/* Séparateur */}
            <div className="my-3 border-t border-border/50"></div>

            {/* ═══════════════════════════════════════════════════════════
               SECTION 5: MON COMPTE (Tous les utilisateurs)
               ═══════════════════════════════════════════════════════════ */}
            <NavSection 
              title="Mon compte" 
              icon={User} 
              color="text-slate-600 dark:text-slate-400"
              defaultOpen={false}
            >
              <NavItem 
                href="/profile" 
                icon={User} 
                label="Profil" 
                isActive={isActive('/profile')}
              />
              <NavItem 
                href="/preferences" 
                icon={Settings} 
                label="Préférences" 
                isActive={isActive('/preferences')}
              />
            </NavSection>

            {/* Déconnexion */}
            <div className="pt-2">
              <Button
                data-testid="logout-button"
                variant="ghost"
                className="w-full justify-start gap-2.5 px-3 py-2 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </Button>
            </div>
          </nav>

          {/* Footer version */}
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border/30 bg-card/80">
            <div className="text-[10px] text-muted-foreground text-center">
              POSÉIDON v2.0 • Booking System
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main
          className={`flex-1 transition-all duration-200 ${
            sidebarOpen ? 'ml-60' : 'ml-0'
          }`}
        >
          <div className="p-6 max-w-[1800px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
