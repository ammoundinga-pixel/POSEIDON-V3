import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label as FormLabel } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, 
  Label, AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3, 
  AlertTriangle, AlertCircle, Users, Briefcase, Clock, Target,
  Activity, Gauge, ArrowUpRight, ArrowDownRight, Flame, Shield,
  Building, ChevronRight, Eye, Filter, Calendar, DollarSign
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// Safe number formatting
const safeToFixed = (value, decimals = 1) => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(decimals) : '0.0';
};

// Occupation rate color coding
const getOccupationColor = (rate) => {
  if (rate >= 80) return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' };
  if (rate >= 65) return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' };
  return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' };
};

// Project status based on hours variance
const getProjectStatus = (consumed, planned) => {
  if (!planned || planned === 0) return { status: 'N/A', color: 'bg-gray-100 text-gray-600' };
  const ratio = (consumed / planned) * 100;
  if (ratio > 110) return { status: 'Dépassement', color: 'bg-red-100 text-red-700', icon: AlertTriangle };
  if (ratio > 90) return { status: 'À surveiller', color: 'bg-amber-100 text-amber-700', icon: AlertCircle };
  return { status: 'OK', color: 'bg-emerald-100 text-emerald-700', icon: Shield };
};

// Workload status
const getWorkloadStatus = (actual, capacity) => {
  if (!capacity || capacity === 0) return { status: 'N/A', color: 'text-gray-500' };
  const ratio = (actual / capacity) * 100;
  if (ratio > 95) return { status: 'Surcharge', color: 'text-red-600', alert: true };
  if (ratio > 85) return { status: 'Haute', color: 'text-amber-600', alert: false };
  if (ratio < 50) return { status: 'Sous-charge', color: 'text-blue-600', alert: true };
  return { status: 'Normal', color: 'text-emerald-600', alert: false };
};

// KPI Card Component
const KPICard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'accent' }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-heading font-bold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          <span>{trendValue}</span>
        </div>
      )}
    </CardContent>
  </Card>
);

// Alert Card Component
const AlertCard = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;
  
  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          Alertes ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-white dark:bg-card rounded border border-amber-200">
              <alert.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${alert.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
              <div>
                <p className="font-medium">{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Occupation Rate Gauge
const OccupationGauge = ({ rate, label, size = 'normal' }) => {
  const colors = getOccupationColor(rate);
  const isLarge = size === 'large';
  
  return (
    <div className={`flex flex-col items-center ${isLarge ? 'p-6' : 'p-3'}`}>
      <div className={`relative ${isLarge ? 'w-32 h-32' : 'w-20 h-20'}`}>
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/20"
          />
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${rate * 2.83} 283`}
            className={colors.text}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${isLarge ? 'text-2xl' : 'text-sm'} ${colors.text}`}>
            {safeToFixed(rate, 0)}%
          </span>
        </div>
      </div>
      {label && <span className="text-xs text-muted-foreground mt-2 text-center">{label}</span>}
    </div>
  );
};

export default function AnalyticsPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  
  // Filters
  const [dateRange, setDateRange] = useState('month'); // week, month, quarter, year
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [viewMode, setViewMode] = useState('global'); // global, team, project, user

  // Calculate date range
  useEffect(() => {
    const now = new Date();
    let start, end;
    
    switch (dateRange) {
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay() + 1);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, [dateRange]);

  // Fetch all data
  useEffect(() => {
    if (!startDate || !endDate) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const [analyticsRes, usersRes, projectsRes, teamsRes, entriesRes] = await Promise.all([
          axios.get('/analytics/project-hours', {
            params: { start_date: startDate + 'T00:00:00Z', end_date: endDate + 'T23:59:59Z' }
          }).catch(() => ({ data: [] })),
          axios.get('/users').catch(() => ({ data: [] })),
          axios.get('/projects').catch(() => ({ data: [] })),
          axios.get('/teams').catch(() => ({ data: [] })),
          axios.get('/time-entries', {
            params: { start_date: startDate + 'T00:00:00Z', end_date: endDate + 'T23:59:59Z' }
          }).catch(() => ({ data: [] }))
        ]);
        
        setAnalytics(analyticsRes.data || []);
        setUsers(usersRes.data || []);
        setProjects(projectsRes.data || []);
        setTeams(teamsRes.data || []);
        setTimeEntries(entriesRes.data || []);
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [startDate, endDate]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!users.length) return null;
    
    // Calculate working days in period
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) workingDays++;
      current.setDate(current.getDate() + 1);
    }
    
    // Total available hours (all active users)
    const activeUsers = users.filter(u => u.is_active && u.role !== 'super_admin');
    const totalAvailableHours = activeUsers.reduce((sum, u) => 
      sum + (Number(u.capacity_hours_per_day) || 7) * workingDays, 0
    );
    
    // Total worked hours
    const totalWorkedHours = timeEntries
      .filter(e => e.status !== 'rejected')
      .reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
    
    // Billable vs Non-billable (based on service_type)
    const billableTypes = ['Études', 'Production', 'Conception', 'Développement', 'Conseil'];
    const billableHours = timeEntries
      .filter(e => e.status !== 'rejected' && billableTypes.some(t => e.service_type?.includes(t)))
      .reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
    const nonBillableHours = totalWorkedHours - billableHours;
    
    // Occupation rate
    const occupationRate = totalAvailableHours > 0 
      ? (totalWorkedHours / totalAvailableHours) * 100 
      : 0;
    
    // Billable rate
    const billableRate = totalWorkedHours > 0 
      ? (billableHours / totalWorkedHours) * 100 
      : 0;
    
    // Per user stats
    const userStats = activeUsers.map(u => {
      const userEntries = timeEntries.filter(e => e.user_id === u.id && e.status !== 'rejected');
      const userHours = userEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
      const userCapacity = (Number(u.capacity_hours_per_day) || 7) * workingDays;
      const userOccupation = userCapacity > 0 ? (userHours / userCapacity) * 100 : 0;
      const userBillable = userEntries
        .filter(e => billableTypes.some(t => e.service_type?.includes(t)))
        .reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
      
      return {
        ...u,
        workedHours: userHours,
        capacity: userCapacity,
        occupationRate: userOccupation,
        billableHours: userBillable,
        billableRate: userHours > 0 ? (userBillable / userHours) * 100 : 0
      };
    });
    
    // Per team stats
    const teamStats = teams.map(t => {
      const teamMembers = userStats.filter(u => 
        t.member_ids?.includes(u.id) || t.manager_id === u.id
      );
      const teamHours = teamMembers.reduce((sum, u) => sum + u.workedHours, 0);
      const teamCapacity = teamMembers.reduce((sum, u) => sum + u.capacity, 0);
      const teamBillable = teamMembers.reduce((sum, u) => sum + u.billableHours, 0);
      
      return {
        ...t,
        memberCount: teamMembers.length,
        workedHours: teamHours,
        capacity: teamCapacity,
        occupationRate: teamCapacity > 0 ? (teamHours / teamCapacity) * 100 : 0,
        billableHours: teamBillable,
        billableRate: teamHours > 0 ? (teamBillable / teamHours) * 100 : 0
      };
    });
    
    // Per project stats
    const projectStats = projects.map(p => {
      const projectEntries = timeEntries.filter(e => e.project_id === p.id && e.status !== 'rejected');
      const consumedHours = projectEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
      const plannedHours = Number(p.estimated_hours) || 0;
      const variance = plannedHours > 0 ? consumedHours - plannedHours : 0;
      const variancePercent = plannedHours > 0 ? (consumedHours / plannedHours) * 100 : 0;
      
      return {
        ...p,
        consumedHours,
        plannedHours,
        variance,
        variancePercent,
        ...getProjectStatus(consumedHours, plannedHours)
      };
    }).filter(p => p.consumedHours > 0 || p.plannedHours > 0);
    
    // Generate alerts
    const alerts = [];
    
    // Project alerts
    projectStats.forEach(p => {
      if (p.variancePercent > 110) {
        alerts.push({
          icon: AlertTriangle,
          severity: 'high',
          title: `Dépassement: ${p.name}`,
          description: `${safeToFixed(p.variancePercent)}% du budget heures consommé`
        });
      }
    });
    
    // User alerts
    userStats.forEach(u => {
      if (u.occupationRate > 95) {
        alerts.push({
          icon: Flame,
          severity: 'high',
          title: `Surcharge: ${u.first_name} ${u.last_name}`,
          description: `Taux d'occupation: ${safeToFixed(u.occupationRate)}%`
        });
      }
      if (u.occupationRate < 50 && u.capacity > 0) {
        alerts.push({
          icon: AlertCircle,
          severity: 'medium',
          title: `Sous-charge: ${u.first_name} ${u.last_name}`,
          description: `Taux d'occupation: ${safeToFixed(u.occupationRate)}%`
        });
      }
    });
    
    // Billable alert
    if (billableRate < 70 && totalWorkedHours > 0) {
      alerts.push({
        icon: DollarSign,
        severity: 'medium',
        title: 'Taux facturable faible',
        description: `Seulement ${safeToFixed(billableRate)}% des heures sont facturables`
      });
    }
    
    return {
      totalAvailableHours,
      totalWorkedHours,
      occupationRate,
      billableHours,
      nonBillableHours,
      billableRate,
      workingDays,
      userStats,
      teamStats,
      projectStats,
      alerts,
      activeUsersCount: activeUsers.length,
      projectsCount: projectStats.length
    };
  }, [users, teams, projects, timeEntries, startDate, endDate]);

  // Monthly evolution data (for charts)
  const monthlyData = useMemo(() => {
    if (!timeEntries.length) return [];
    
    const months = {};
    const billableTypes = ['Études', 'Production', 'Conception', 'Développement', 'Conseil'];
    
    timeEntries.forEach(entry => {
      if (entry.status === 'rejected') return;
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey, total: 0, billable: 0 };
      }
      
      const hours = Number(entry.hours) || 0;
      months[monthKey].total += hours;
      if (billableTypes.some(t => entry.service_type?.includes(t))) {
        months[monthKey].billable += hours;
      }
    });
    
    return Object.values(months)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({
        ...m,
        monthLabel: new Date(m.month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        occupationRate: 0 // Would need capacity data per month
      }));
  }, [timeEntries]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Billable chart data
  const billableChartData = kpis ? [
    { name: 'Facturable', value: kpis.billableHours, fill: '#10B981' },
    { name: 'Non facturable', value: kpis.nonBillableHours, fill: '#94A3B8' }
  ] : [];

  return (
    <DashboardLayout>
      <div data-testid="analytics-page" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold tracking-tight mb-1">Analytique</h1>
            <p className="text-muted-foreground">Tableau de bord décisionnel et pilotage stratégique</p>
          </div>
          
          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="quarter">Ce trimestre</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
              </SelectContent>
            </Select>
            
            {teams.length > 0 && (
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-[160px]">
                  <Building className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Toutes équipes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les équipes</SelectItem>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Alerts */}
        {kpis?.alerts?.length > 0 && <AlertCard alerts={kpis.alerts} />}

        {/* P0: Vital KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Occupation Rate - Main KPI */}
          <Card className={`${getOccupationColor(kpis?.occupationRate || 0).bg} border-0`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Taux d'occupation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-4xl font-heading font-bold ${getOccupationColor(kpis?.occupationRate || 0).text}`}>
                    {safeToFixed(kpis?.occupationRate || 0, 0)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {safeToFixed(kpis?.totalWorkedHours || 0)}h / {safeToFixed(kpis?.totalAvailableHours || 0)}h
                  </p>
                </div>
                <OccupationGauge rate={kpis?.occupationRate || 0} />
              </div>
            </CardContent>
          </Card>

          {/* Billable Rate */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Taux facturable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-heading font-bold">
                {safeToFixed(kpis?.billableRate || 0, 0)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {safeToFixed(kpis?.billableHours || 0)}h facturables
              </p>
              <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all" 
                  style={{ width: `${kpis?.billableRate || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Total Hours */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Heures travaillées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-heading font-bold">
                {safeToFixed(kpis?.totalWorkedHours || 0, 0)}h
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis?.workingDays || 0} jours ouvrés • {kpis?.activeUsersCount || 0} collaborateurs
              </p>
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Projets actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-heading font-bold">
                {kpis?.projectsCount || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis?.projectStats?.filter(p => p.status === 'Dépassement').length || 0} en dépassement
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Vue globale</TabsTrigger>
            <TabsTrigger value="projects">Projets</TabsTrigger>
            <TabsTrigger value="teams">Équipes</TabsTrigger>
            <TabsTrigger value="workload">Charge</TabsTrigger>
            <TabsTrigger value="trends">Évolution</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Billable vs Non-Billable Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Facturable vs Non facturable
                  </CardTitle>
                  <CardDescription>Impact direct sur la rentabilité de l'entreprise</CardDescription>
                </CardHeader>
                <CardContent>
                  {billableChartData.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={billableChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {billableChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0];
                              return (
                                <div className="bg-card p-3 rounded-lg border shadow-lg">
                                  <p className="font-medium">{data.name}</p>
                                  <p className="text-lg font-bold">{safeToFixed(data.value)}h</p>
                                  <p className="text-xs text-muted-foreground">
                                    {data.name === 'Facturable' 
                                      ? 'Heures génératrices de revenus'
                                      : 'Heures internes, formation, admin...'}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                      Aucune donnée disponible
                    </div>
                  )}
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-sm">Facturable: {safeToFixed(kpis?.billableHours || 0)}h</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                      <span className="text-sm">Non fact.: {safeToFixed(kpis?.nonBillableHours || 0)}h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Occupation by Team */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Taux d'occupation par équipe
                  </CardTitle>
                  <CardDescription>Comparaison de la charge entre équipes</CardDescription>
                </CardHeader>
                <CardContent>
                  {kpis?.teamStats?.length > 0 ? (
                    <div className="space-y-4">
                      {kpis.teamStats.map(team => {
                        const colors = getOccupationColor(team.occupationRate);
                        return (
                          <div key={team.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{team.name}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {team.memberCount} membres
                                </Badge>
                                <span className={`text-sm font-bold ${colors.text}`}>
                                  {safeToFixed(team.occupationRate, 0)}%
                                </span>
                              </div>
                            </div>
                            <div className="h-3 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${colors.dot.replace('bg-', 'bg-')}`}
                                style={{ width: `${Math.min(team.occupationRate, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{safeToFixed(team.workedHours)}h travaillées</span>
                              <span>{safeToFixed(team.capacity)}h capacité</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                      <Building className="h-12 w-12 mb-2 opacity-50" />
                      <p>Aucune équipe configurée</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Projects Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition des heures par projet</CardTitle>
                <CardDescription>Top 10 projets par volume d'heures</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={analytics.slice(0, 10).map(p => ({
                      name: (p.project_name || 'Projet').substring(0, 15),
                      fullName: p.project_name,
                      heures: Number(p.total_hours) || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--foreground))"
                        fontSize={11}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="hsl(var(--foreground))">
                        <Label value="Heures" angle={-90} position="insideLeft" />
                      </YAxis>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-card p-3 rounded-lg border shadow-lg">
                                <p className="font-medium">{payload[0].payload.fullName}</p>
                                <p className="text-accent text-lg font-bold">{safeToFixed(payload[0].value)}h</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="heures" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                    Aucune donnée disponible
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab - P1: Rentabilité projet */}
          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Rentabilité par projet (heures)
                </CardTitle>
                <CardDescription>Suivi des heures prévues vs consommées</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-sm font-semibold">Projet</th>
                        <th className="text-right p-3 text-sm font-semibold">Heures prévues</th>
                        <th className="text-right p-3 text-sm font-semibold">Heures consommées</th>
                        <th className="text-right p-3 text-sm font-semibold">Écart</th>
                        <th className="text-right p-3 text-sm font-semibold">%</th>
                        <th className="text-center p-3 text-sm font-semibold">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpis?.projectStats?.length > 0 ? (
                        kpis.projectStats
                          .sort((a, b) => b.variancePercent - a.variancePercent)
                          .map((project, idx) => {
                            const StatusIcon = project.icon;
                            return (
                              <tr key={idx} className="border-b hover:bg-muted/50">
                                <td className="p-3">
                                  <div className="font-medium">{project.name}</div>
                                  {project.code && (
                                    <div className="text-xs text-muted-foreground">{project.code}</div>
                                  )}
                                </td>
                                <td className="p-3 text-right font-mono">
                                  {project.plannedHours > 0 ? `${safeToFixed(project.plannedHours)}h` : '-'}
                                </td>
                                <td className="p-3 text-right font-mono font-bold">
                                  {safeToFixed(project.consumedHours)}h
                                </td>
                                <td className={`p-3 text-right font-mono ${project.variance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {project.plannedHours > 0 ? (
                                    <>
                                      {project.variance > 0 ? '+' : ''}{safeToFixed(project.variance)}h
                                    </>
                                  ) : '-'}
                                </td>
                                <td className="p-3 text-right font-mono">
                                  {project.plannedHours > 0 ? `${safeToFixed(project.variancePercent, 0)}%` : '-'}
                                </td>
                                <td className="p-3 text-center">
                                  <Badge className={project.color}>
                                    {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                                    {project.status}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            Aucun projet avec des heures sur cette période
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kpis?.teamStats?.length > 0 ? (
                kpis.teamStats.map(team => {
                  const colors = getOccupationColor(team.occupationRate);
                  return (
                    <Card key={team.id} className={colors.bg}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span>{team.name}</span>
                          <Badge variant="outline">{team.memberCount} membres</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Occupation</p>
                            <p className={`text-2xl font-bold ${colors.text}`}>
                              {safeToFixed(team.occupationRate, 0)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Facturable</p>
                            <p className="text-2xl font-bold">
                              {safeToFixed(team.billableRate, 0)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Heures</p>
                            <p className="text-lg font-mono">
                              {safeToFixed(team.workedHours)}h
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Capacité</p>
                            <p className="text-lg font-mono">
                              {safeToFixed(team.capacity)}h
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center">
                    <Building className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Aucune équipe configurée</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Créez des équipes dans l'Organigramme pour voir les statistiques
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Workload Tab - P1: Charge de travail */}
          <TabsContent value="workload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Charge de travail par collaborateur
                </CardTitle>
                <CardDescription>Détection surcharge/sous-charge • Prévention burn-out</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-sm font-semibold">Collaborateur</th>
                        <th className="text-right p-3 text-sm font-semibold">Heures</th>
                        <th className="text-right p-3 text-sm font-semibold">Capacité</th>
                        <th className="text-center p-3 text-sm font-semibold">Occupation</th>
                        <th className="text-right p-3 text-sm font-semibold">Facturable</th>
                        <th className="text-center p-3 text-sm font-semibold">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpis?.userStats?.length > 0 ? (
                        kpis.userStats
                          .sort((a, b) => b.occupationRate - a.occupationRate)
                          .map((usr, idx) => {
                            const colors = getOccupationColor(usr.occupationRate);
                            const workload = getWorkloadStatus(usr.workedHours, usr.capacity);
                            return (
                              <tr key={idx} className={`border-b hover:bg-muted/50 ${workload.alert ? colors.bg : ''}`}>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold">
                                      {usr.first_name?.[0]}{usr.last_name?.[0]}
                                    </div>
                                    <div>
                                      <div className="font-medium">{usr.first_name} {usr.last_name}</div>
                                      <div className="text-xs text-muted-foreground capitalize">{usr.role}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 text-right font-mono font-bold">
                                  {safeToFixed(usr.workedHours)}h
                                </td>
                                <td className="p-3 text-right font-mono text-muted-foreground">
                                  {safeToFixed(usr.capacity)}h
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${colors.dot}`}
                                        style={{ width: `${Math.min(usr.occupationRate, 100)}%` }}
                                      />
                                    </div>
                                    <span className={`text-sm font-bold ${colors.text}`}>
                                      {safeToFixed(usr.occupationRate, 0)}%
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 text-right font-mono">
                                  {safeToFixed(usr.billableRate, 0)}%
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`text-sm font-medium ${workload.color}`}>
                                    {workload.alert && <AlertCircle className="h-3 w-3 inline mr-1" />}
                                    {workload.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            Aucune donnée disponible
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab - P2: Évolution dans le temps */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Évolution des heures dans le temps
                </CardTitle>
                <CardDescription>Tendances mensuelles des heures totales et facturables</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="monthLabel" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))">
                        <Label value="Heures" angle={-90} position="insideLeft" />
                      </YAxis>
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-card p-3 rounded-lg border shadow-lg">
                                <p className="font-medium mb-2">{label}</p>
                                {payload.map((p, i) => (
                                  <p key={i} className="text-sm">
                                    <span style={{ color: p.color }}>{p.name}:</span>{' '}
                                    <span className="font-bold">{safeToFixed(p.value)}h</span>
                                  </p>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        name="Heures totales"
                        fill="hsl(var(--accent))" 
                        fillOpacity={0.2}
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="billable" 
                        name="Heures facturables"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                    Pas assez de données pour afficher l'évolution
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
