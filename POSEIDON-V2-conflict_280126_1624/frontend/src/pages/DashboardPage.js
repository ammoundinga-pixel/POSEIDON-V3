import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import axios from '../lib/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Label } from 'recharts';
import { Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const CustomBarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-3 rounded-lg border border-border shadow-lg">
        <p className="font-medium">{payload[0].payload.fullName}</p>
        <p className="text-accent text-lg font-bold">{payload[0].value.toFixed(1)}h</p>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-3 rounded-lg border border-border shadow-lg">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-accent text-lg font-bold">{payload[0].value.toFixed(1)}h</p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    try {
      let endpoint = '/dashboard/personal';
      if (user.role === 'manager') {
        endpoint = '/dashboard/team';
      } else if (user.role === 'super_admin' || user.role === 'admin') {
        endpoint = '/dashboard/global';
      }

      const [dashboardRes, projectsRes] = await Promise.all([
        axios.get(endpoint),
        axios.get('/projects')
      ]);
      
      const projectMap = {};
      projectsRes.data.forEach(p => {
        projectMap[p.id] = p;
      });
      
      setDashboard(dashboardRes.data);
      setProjects(projectMap);
    } catch (error) {
      console.error('Failed to fetch dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="dashboard-page" className="space-y-8">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground">
            Bienvenue, {user.first_name}. Voici un aperçu de votre activité.
          </p>
        </div>

        {/* Employee Dashboard */}
        {user.role === 'employee' && dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Stats Cards */}
            <div className="col-span-12 lg:col-span-4">
              <Card data-testid="week-hours-card">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Heures cette semaine</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-heading font-bold">{dashboard.week_hours.toFixed(1)}</span>
                    <span className="text-muted-foreground">/ {(dashboard.capacity_per_day * 5).toFixed(1)}h</span>
                  </div>
                  <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${Math.min((dashboard.week_hours / (dashboard.capacity_per_day * 5)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="col-span-12 lg:col-span-4">
              <Card data-testid="month-hours-card">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Heures ce mois</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-heading font-bold">{dashboard.month_hours.toFixed(1)}h</div>
                </CardContent>
              </Card>
            </div>

            <div className="col-span-12 lg:col-span-4">
              <Card data-testid="pending-entries-card">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Saisies en brouillon</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                    <span className="text-4xl font-heading font-bold">{dashboard.pending_entries}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="col-span-12 lg:col-span-8">
              <Card data-testid="project-hours-chart">
                <CardHeader>
                  <CardTitle>Répartition par projet</CardTitle>
                  <CardDescription>Heures travaillées par projet ce mois</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Array.isArray(dashboard.project_hours) 
                        ? dashboard.project_hours.map(item => ({
                            name: item.project_name || 'Projet inconnu',
                            fullName: item.project_name || item.project_id,
                            heures: item.hours
                          }))
                        : Object.entries(dashboard.project_hours).map(([projectId, hours]) => ({
                            name: projects[projectId]?.name || 'Projet inconnu',
                            fullName: projects[projectId]?.name || projectId,
                            heures: hours
                          }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--foreground))"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis stroke="hsl(var(--foreground))">
                        <Label value="Heures" angle={-90} position="insideLeft" />
                      </YAxis>
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar dataKey="heures" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="col-span-12 lg:col-span-4">
              <Card data-testid="service-distribution-chart">
                <CardHeader>
                  <CardTitle>Type de prestation</CardTitle>
                  <CardDescription>Distribution des heures</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(dashboard.service_hours).map(([key, value]) => ({
                          name: key,
                          value: value
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(dashboard.service_hours).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Manager/Admin Dashboard */}
        {(user.role === 'manager' || user.role === 'admin' || user.role === 'super_admin') && dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-3">
              <Card data-testid="team-size-card">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {user.role === 'manager' ? 'Membres de l\'équipe' : 'Utilisateurs actifs'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-heading font-bold">
                    {dashboard.team_size || dashboard.active_users || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {dashboard.pending_validation !== undefined && (
              <div className="col-span-12 lg:col-span-3">
                <Card data-testid="pending-validation-card">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">À valider</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-8 w-8 text-amber-500" />
                      <span className="text-4xl font-heading font-bold">{dashboard.pending_validation}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {dashboard.total_hours !== undefined && (
              <>
                <div className="col-span-12 lg:col-span-3">
                  <Card data-testid="total-hours-card">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">Heures totales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-heading font-bold">{dashboard.total_hours.toFixed(1)}h</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="col-span-12 lg:col-span-3">
                  <Card data-testid="active-projects-card">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">Projets actifs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-heading font-bold">{dashboard.active_projects}</div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Charts for admins */}
            {dashboard.project_hours && (
              <div className="col-span-12 lg:col-span-8">
                <Card data-testid="global-project-hours-chart">
                  <CardHeader>
                    <CardTitle>Heures par projet</CardTitle>
                    <CardDescription>Distribution globale ce mois</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart
                        data={Object.entries(dashboard.project_hours)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 10)
                          .map(([projectId, hours]) => ({
                            name: projects[projectId]?.name || 'Projet inconnu',
                            fullName: projects[projectId]?.name || projectId,
                            heures: hours
                          }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="name" 
                          stroke="hsl(var(--foreground))"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          interval={0}
                        />
                        <YAxis stroke="hsl(var(--foreground))">
                          <Label value="Heures" angle={-90} position="insideLeft" />
                        </YAxis>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-card p-3 rounded-lg border border-border shadow-lg">
                                  <p className="font-medium">{payload[0].payload.fullName}</p>
                                  <p className="text-accent text-lg font-bold">{payload[0].value.toFixed(1)}h</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="heures" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {dashboard.service_hours && (
              <div className="col-span-12 lg:col-span-4">
                <Card data-testid="global-service-distribution-chart">
                  <CardHeader>
                    <CardTitle>Type de prestation</CardTitle>
                    <CardDescription>Répartition globale</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={Object.entries(dashboard.service_hours).map(([key, value]) => ({
                            name: key,
                            value: value
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(dashboard.service_hours).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-card p-3 rounded-lg border border-border shadow-lg">
                                  <p className="font-medium">{payload[0].name}</p>
                                  <p className="text-accent text-lg font-bold">{payload[0].value.toFixed(1)}h</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}