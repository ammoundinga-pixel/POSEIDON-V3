import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label as FormLabel } from '../components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Label } from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  const fetchAnalytics = async () => {
    try {
      const params = {};
      if (startDate) params.start_date = new Date(startDate).toISOString();
      if (endDate) params.end_date = new Date(endDate).toISOString();

      const response = await axios.get('/analytics/project-hours', { params });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
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

  const projectChartData = analytics?.slice(0, 10).map(p => ({
    name: p.project_name.length > 20 ? p.project_name.substring(0, 20) + '...' : p.project_name,
    fullName: p.project_name,
    heures: p.total_hours
  })) || [];

  const allServiceTypes = {};
  analytics?.forEach(project => {
    Object.entries(project.by_service_type).forEach(([type, hours]) => {
      allServiceTypes[type] = (allServiceTypes[type] || 0) + hours;
    });
  });

  const serviceTypeData = Object.entries(allServiceTypes).map(([name, value]) => ({
    name: name.length > 20 ? name.substring(0, 20) + '...' : name,
    value
  }));

  const totalHours = analytics?.reduce((sum, p) => sum + p.total_hours, 0) || 0;

  return (
    <DashboardLayout>
      <div data-testid="analytics-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Analytique</h1>
            <p className="text-muted-foreground">Analyse détaillée des heures par projet et type de prestation</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtres</CardTitle>
            <CardDescription>Filtrez les données par période</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel htmlFor="start-date">Date de début</FormLabel>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="analytics-start-date"
                />
              </div>
              <div className="space-y-2">
                <FormLabel htmlFor="end-date">Date de fin</FormLabel>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="analytics-end-date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Heures totales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold">{totalHours.toFixed(1)}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Projets actifs</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold">{analytics?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Types de prestation</CardTitle>
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold">{serviceTypeData.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Heures par projet</CardTitle>
              <CardDescription>Top 10 projets par volume d'heures</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={projectChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--foreground))" 
                    fontSize={12}
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

          <Card>
            <CardHeader>
              <CardTitle>Répartition par type de prestation</CardTitle>
              <CardDescription>Distribution globale des heures</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={serviceTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {serviceTypeData.map((entry, index) => (
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

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle>Détail par projet</CardTitle>
            <CardDescription>Répartition des heures par projet et type de prestation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-sm font-semibold">Projet</th>
                    <th className="text-right p-3 text-sm font-semibold">Total heures</th>
                    <th className="text-left p-3 text-sm font-semibold">Répartition</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.map((project, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3 font-medium">{project.project_name}</td>
                      <td className="p-3 text-right font-mono font-bold">{project.total_hours.toFixed(1)}h</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(project.by_service_type).map(([type, hours]) => (
                            <div key={type} className="text-xs">
                              <span className="text-muted-foreground">{type}:</span>{' '}
                              <span className="font-mono font-medium">{hours.toFixed(1)}h</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}