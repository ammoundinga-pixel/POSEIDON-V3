import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Activity, MapPin, Home, Plane, Coffee, Calendar, Clock, 
  Search, Users, Briefcase, AlertCircle, Building2, Monitor
} from 'lucide-react';
import { formatDate } from '../lib/utils';

// Présence codes from Planning RH
const PRESENCE_CODES = {
  'M': { label: 'Monaco', color: 'bg-blue-500', textColor: 'text-white', icon: Building2 },
  'N': { label: 'Nice', color: 'bg-emerald-500', textColor: 'text-white', icon: Building2 },
  'P': { label: 'Paris', color: 'bg-violet-500', textColor: 'text-white', icon: Building2 },
  'T': { label: 'Télétravail', color: 'bg-amber-400', textColor: 'text-black', icon: Monitor },
  'C': { label: 'Client', color: 'bg-pink-500', textColor: 'text-white', icon: Users },
  'D': { label: 'Déplacement', color: 'bg-teal-500', textColor: 'text-white', icon: Plane },
  'E': { label: 'École', color: 'bg-indigo-500', textColor: 'text-white', icon: Calendar },
  'A': { label: 'Congés', color: 'bg-red-500', textColor: 'text-white', icon: Coffee },
  'F': { label: 'Férié', color: 'bg-slate-500', textColor: 'text-white', icon: Calendar },
  'W': { label: 'Week-end', color: 'bg-slate-300', textColor: 'text-slate-700', icon: Calendar },
};

// Day types from time entry (Saisie du temps)
const DAY_TYPE_LABELS = {
  'présentiel': 'Bureau',
  'télétravail': 'Télétravail',
  'déplacement': 'Déplacement',
  'congé': 'Congé',
  'absence': 'Absence'
};

export default function ActivityPage() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState({});
  const [timeEntries, setTimeEntries] = useState([]);
  const [presenceData, setPresenceData] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [presenceFilter, setPresenceFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateObj = new Date(dateFilter);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1;

      const [usersRes, projectsRes, entriesRes, teamsRes, calendarRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/projects'),
        axios.get('/time-entries', {
          params: {
            start_date: dateFilter + 'T00:00:00Z',
            end_date: dateFilter + 'T23:59:59Z'
          }
        }),
        axios.get('/teams').catch(() => ({ data: [] })),
        axios.get('/employee-calendar/month', { params: { year, month } }).catch(() => ({ data: { calendar_data: {} } }))
      ]);

      const projectMap = {};
      projectsRes.data.forEach(p => {
        projectMap[p.id] = p;
      });

      // Build presence data by user for the selected date
      const presenceByUser = {};
      const calendarData = calendarRes.data?.calendar_data || {};
      Object.entries(calendarData).forEach(([userId, dates]) => {
        if (dates[dateFilter]) {
          presenceByUser[userId] = dates[dateFilter];
        }
      });

      setUsers(usersRes.data);
      setProjects(projectMap);
      setTimeEntries(entriesRes.data);
      setTeams(teamsRes.data || []);
      setPresenceData(presenceByUser);
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
    return entries.reduce((sum, e) => sum + (e.status !== 'rejected' ? (Number(e.hours) || 0) : 0), 0);
  };

  const getUserPresence = (userId) => {
    return presenceData[userId] || null;
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

  // Apply all filters
  const filteredUsers = users.filter(user => {
    // Search filter
    if (searchQuery) {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      if (!fullName.includes(searchQuery.toLowerCase())) return false;
    }

    // Presence filter
    if (presenceFilter !== 'all') {
      const presence = getUserPresence(user.id);
      if (presenceFilter === 'none') {
        if (presence) return false;
      } else {
        if (!presence || presence.code !== presenceFilter) return false;
      }
    }

    // Team filter
    if (teamFilter !== 'all') {
      if (user.team_id !== teamFilter) return false;
    }

    // Project filter
    if (projectFilter !== 'all') {
      const entries = getUserEntries(user.id);
      if (!entries.some(e => e.project_id === projectFilter)) return false;
    }

    return true;
  });

  // Stats calculations
  const getPresenceStats = () => {
    const stats = { total: users.length, withPresence: 0, withHours: 0, byCode: {} };
    
    users.forEach(user => {
      const presence = getUserPresence(user.id);
      const entries = getUserEntries(user.id);
      
      if (presence) {
        stats.withPresence++;
        stats.byCode[presence.code] = (stats.byCode[presence.code] || 0) + 1;
      }
      
      if (entries.length > 0 && getTotalHours(entries) > 0) {
        stats.withHours++;
      }
    });
    
    return stats;
  };

  const stats = getPresenceStats();

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
        {/* Header */}
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Activité quotidienne</h1>
          <p className="text-muted-foreground">
            Vue consolidée de la présence et des heures travaillées pour le{' '}
            <span className="font-semibold text-foreground">{formatDate(dateFilter)}</span>
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span>Présence = Planning RH</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Heures = Saisie du temps</span>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Date */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  data-testid="date-filter"
                  className="h-9"
                />
              </div>
              
              {/* Search */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Recherche</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Nom..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                    data-testid="search-filter"
                  />
                </div>
              </div>

              {/* Presence Status */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Statut de présence</label>
                <Select value={presenceFilter} onValueChange={setPresenceFilter}>
                  <SelectTrigger data-testid="presence-filter" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="none">Non renseigné</SelectItem>
                    {Object.entries(PRESENCE_CODES).filter(([code]) => !['W', 'F'].includes(code)).map(([code, info]) => (
                      <SelectItem key={code} value={code}>
                        <span className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded ${info.color}`}></span>
                          {info.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team */}
              {teams.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Équipe</label>
                  <Select value={teamFilter} onValueChange={setTeamFilter}>
                    <SelectTrigger data-testid="team-filter" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les équipes</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Project */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Projet</label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger data-testid="project-filter" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les projets</SelectItem>
                    {Object.values(projects).filter(p => p.status !== 'archived').map(project => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats - Two Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Block A: Présence (Planning RH) */}
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-base">Présence</CardTitle>
              </div>
              <CardDescription className="text-xs">Source : Planning RH</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">{stats.withPresence}</div>
                  <div className="text-xs text-muted-foreground">Renseigné</div>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">{stats.total - stats.withPresence}</div>
                  <div className="text-xs text-muted-foreground">Non renseigné</div>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
              {/* Mini legend */}
              <div className="flex flex-wrap gap-2 mt-4">
                {Object.entries(stats.byCode).map(([code, count]) => {
                  const info = PRESENCE_CODES[code];
                  if (!info) return null;
                  return (
                    <Badge key={code} variant="outline" className="text-xs">
                      <span className={`w-2 h-2 rounded mr-1.5 ${info.color}`}></span>
                      {info.label}: {count}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Block B: Heures & Projets (Saisie du temps) */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Heures & Projets</CardTitle>
              </div>
              <CardDescription className="text-xs">Source : Saisie du temps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.withHours}</div>
                  <div className="text-xs text-muted-foreground">Avec heures</div>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="text-2xl font-bold">
                    {timeEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0).toFixed(1)}h
                  </div>
                  <div className="text-xs text-muted-foreground">Heures totales</div>
                </div>
                <div className="text-center p-3 bg-violet-50 dark:bg-violet-950 rounded-lg">
                  <div className="text-2xl font-bold text-violet-600">
                    {[...new Set(timeEntries.map(e => e.project_id))].length}
                  </div>
                  <div className="text-xs text-muted-foreground">Projets actifs</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Activity List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Détail par collaborateur
            </CardTitle>
            <CardDescription>{filteredUsers.length} collaborateur(s) affiché(s)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredUsers.map((user) => {
                const entries = getUserEntries(user.id);
                const totalHours = getTotalHours(entries);
                const presence = getUserPresence(user.id);
                const projectsWorked = [...new Set(entries.map(e => e.project_id))];
                const presenceInfo = presence?.code ? PRESENCE_CODES[presence.code] : null;

                return (
                  <div key={user.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* User Info */}
                      <div className="lg:col-span-3 flex items-center gap-3">
                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center text-white font-semibold">
                          {user.first_name[0]}{user.last_name[0]}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{user.first_name} {user.last_name}</div>
                          <Badge className={`${getRoleBadgeColor(user.role)} text-[10px]`} variant="outline">
                            {getRoleLabel(user.role)}
                          </Badge>
                        </div>
                      </div>

                      {/* Block A: Présence (Planning RH) */}
                      <div className="lg:col-span-3">
                        <div className="flex items-center gap-1 mb-1">
                          <MapPin className="h-3 w-3 text-emerald-500" />
                          <span className="text-[10px] font-medium text-emerald-600 uppercase">Présence RH</span>
                        </div>
                        {presenceInfo ? (
                          <div className="flex items-center gap-2">
                            <Badge className={`${presenceInfo.color} ${presenceInfo.textColor} font-bold`}>
                              {presence.code}
                            </Badge>
                            <span className="text-sm">{presenceInfo.label}</span>
                            {presence.half_day && (
                              <Badge variant="outline" className="text-[10px]">½ journée</Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Non renseigné
                          </Badge>
                        )}
                      </div>

                      {/* Block B: Heures (Saisie du temps) */}
                      <div className="lg:col-span-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="h-3 w-3 text-blue-500" />
                          <span className="text-[10px] font-medium text-blue-600 uppercase">Heures</span>
                        </div>
                        {entries.length > 0 ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold font-mono">{totalHours.toFixed(1)}</span>
                            <span className="text-sm text-muted-foreground">/ {user.capacity_hours_per_day || 7}h</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
                            Aucune saisie
                          </Badge>
                        )}
                      </div>

                      {/* Block B: Projets (Saisie du temps) */}
                      <div className="lg:col-span-4">
                        <div className="flex items-center gap-1 mb-1">
                          <Briefcase className="h-3 w-3 text-blue-500" />
                          <span className="text-[10px] font-medium text-blue-600 uppercase">
                            Projets ({projectsWorked.length})
                          </span>
                        </div>
                        {projectsWorked.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {projectsWorked.slice(0, 3).map(projectId => {
                              const projectEntries = entries.filter(e => e.project_id === projectId);
                              const projectHours = getTotalHours(projectEntries);
                              const project = projects[projectId];
                              
                              return (
                                <Badge 
                                  key={projectId} 
                                  variant="secondary"
                                  className="text-xs font-normal"
                                  title={project?.name || 'Projet inconnu'}
                                >
                                  {(project?.name || 'Projet').substring(0, 15)}
                                  {(project?.name || '').length > 15 && '...'}
                                  <span className="ml-1 font-mono font-semibold">{projectHours.toFixed(1)}h</span>
                                </Badge>
                              );
                            })}
                            {projectsWorked.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{projectsWorked.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Aucun résultat</p>
              <p className="text-sm text-muted-foreground">Aucun collaborateur ne correspond aux filtres sélectionnés</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
