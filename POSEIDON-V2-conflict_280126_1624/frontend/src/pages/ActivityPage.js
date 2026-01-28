import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Activity, MapPin, Home, Plane, Coffee, Calendar, Clock } from 'lucide-react';
import { formatDate } from '../lib/utils';

const DAY_TYPE_ICONS = {
  'présentiel': <Home className="h-4 w-4" />,
  'télétravail': <Home className="h-4 w-4 text-blue-500" />,
  'déplacement': <Plane className="h-4 w-4 text-purple-500" />,
  'congé': <Coffee className="h-4 w-4 text-green-500" />,
  'absence': <Calendar className="h-4 w-4 text-gray-500" />
};

const DAY_TYPE_LABELS = {
  'présentiel': 'Au bureau',
  'télétravail': 'Télétravail',
  'déplacement': 'Déplacement',
  'congé': 'Congé',
  'absence': 'Absence'
};

const DAY_TYPE_COLORS = {
  'présentiel': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'télétravail': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'déplacement': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'congé': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'absence': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
};

export default function ActivityPage() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState({});
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [locationFilter, setLocationFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const fetchData = async () => {
    try {
      const [usersRes, projectsRes, entriesRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/projects'),
        axios.get('/time-entries', {
          params: {
            start_date: dateFilter + 'T00:00:00Z',
            end_date: dateFilter + 'T23:59:59Z'
          }
        })
      ]);

      const projectMap = {};
      projectsRes.data.forEach(p => {
        projectMap[p.id] = p;
      });

      setUsers(usersRes.data);
      setProjects(projectMap);
      setTimeEntries(entriesRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const getUserEntries = (userId) => {
    return timeEntries.filter(e => e.user_id === userId);
  };

  const getTotalHours = (entries) => {
    return entries.reduce((sum, e) => sum + (e.status !== 'rejected' ? e.hours : 0), 0);
  };

  const getDayType = (entries) => {
    if (entries.length === 0) return null;
    return entries[0].day_type;
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'manager': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      default: return 'Employé';
    }
  };

  const filteredUsers = users.filter(user => {
    const entries = getUserEntries(user.id);
    const dayType = getDayType(entries);
    
    if (locationFilter === 'all') return true;
    if (!dayType && locationFilter !== 'inactive') return false;
    return dayType === locationFilter;
  });

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
      <div data-testid="activity-page" className="space-y-6">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Activité quotidienne</h1>
          <p className="text-muted-foreground">Vue en temps réel des activités de tous les collaborateurs</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  data-testid="date-filter"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Localisation</label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger data-testid="location-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="présentiel">Au bureau</SelectItem>
                    <SelectItem value="télétravail">Télétravail</SelectItem>
                    <SelectItem value="déplacement">Déplacement</SelectItem>
                    <SelectItem value="congé">Congé</SelectItem>
                    <SelectItem value="absence">Absence</SelectItem>
                    <SelectItem value="inactive">Sans activité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(DAY_TYPE_LABELS).map(([type, label]) => {
            const count = users.filter(u => getDayType(getUserEntries(u.id)) === type).length;
            return (
              <Card key={type}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-2xl font-heading font-bold">{count}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${DAY_TYPE_COLORS[type]}`}>
                      {DAY_TYPE_ICONS[type]}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* User Activity List */}
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const entries = getUserEntries(user.id);
            const totalHours = getTotalHours(entries);
            const dayType = getDayType(entries);
            const projectsWorked = [...new Set(entries.map(e => e.project_id))];

            return (
              <Card key={user.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* User Info */}
                    <div className="md:col-span-3 flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center text-white font-semibold text-lg">
                        {user.first_name[0]}{user.last_name[0]}
                      </div>
                      <div>
                        <div className="font-medium">{user.first_name} {user.last_name}</div>
                        <Badge className={getRoleBadgeColor(user.role)} variant="outline">
                          {getRoleLabel(user.role)}
                        </Badge>
                      </div>
                    </div>

                    {/* Location Status */}
                    <div className="md:col-span-2 flex items-center">
                      {dayType ? (
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${DAY_TYPE_COLORS[dayType]}`}>
                            {DAY_TYPE_ICONS[dayType]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{DAY_TYPE_LABELS[dayType]}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(dateFilter)}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground italic">Aucune activité</div>
                      )}
                    </div>

                    {/* Hours */}
                    <div className="md:col-span-2 flex items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Heures travaillées</p>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-lg font-mono font-bold">{totalHours.toFixed(1)}h</span>
                          <span className="text-xs text-muted-foreground">/ {user.capacity_hours_per_day}h</span>
                        </div>
                      </div>
                    </div>

                    {/* Projects */}
                    <div className="md:col-span-5">
                      <p className="text-sm text-muted-foreground mb-2">Projets ({projectsWorked.length})</p>
                      {entries.length > 0 ? (
                        <div className="space-y-2">
                          {projectsWorked.map(projectId => {
                            const projectEntries = entries.filter(e => e.project_id === projectId);
                            const projectHours = getTotalHours(projectEntries);
                            const project = projects[projectId];
                            
                            return (
                              <div key={projectId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{project?.name || 'Projet inconnu'}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {projectEntries.map(e => e.service_type).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                                  </div>
                                </div>
                                <div className="text-sm font-mono font-medium">{projectHours.toFixed(1)}h</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Aucun projet</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Aucune activité</p>
              <p className="text-sm text-muted-foreground">Aucun collaborateur ne correspond aux filtres sélectionnés</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
