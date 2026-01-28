import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  CheckSquare, 
  X, 
  Edit, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  User, 
  Calendar,
  History,
  FileText,
  Filter,
  Download,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  ArrowRight,
  Users,
  FolderOpen
} from 'lucide-react';
import { DISCIPLINES, ACTIVITIES, SERVICE_TYPES, formatDate } from '../lib/utils';

export default function ValidationPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('validation');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [expandedUsers, setExpandedUsers] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [selectedEntries, setSelectedEntries] = useState(new Set());
  const [rejectReason, setRejectReason] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    user_id: '',
    project_id: '',
    status: 'submitted'
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    hours: '',
    project_id: '',
    discipline: '',
    activity: '',
    service_type: '',
    date: '',
    admin_reason: ''
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchAuditLog();
    }
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = { ...filters };
      if (!queryParams.user_id) delete queryParams.user_id;
      if (!queryParams.project_id) delete queryParams.project_id;
      if (!queryParams.status) delete queryParams.status;

      const [entriesRes, usersRes, projectsRes] = await Promise.all([
        axios.get('/time-entries', { params: queryParams }),
        axios.get('/users'),
        axios.get('/projects')
      ]);
      
      setEntries(entriesRes.data);
      setUsers(usersRes.data);
      setProjects(projectsRes.data);
      setSelectedEntries(new Set());
    } catch (error) {
      console.error('Failed to fetch validation data', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLog = async () => {
    try {
      const response = await axios.get('/audit-log', { 
        params: { entity_type: 'time_entry', limit: 200 }
      });
      setAuditLog(response.data);
    } catch (error) {
      console.error('Failed to fetch audit log', error);
    }
  };

  const handleValidate = async (entryIds) => {
    const ids = Array.isArray(entryIds) ? entryIds : [entryIds];
    try {
      await axios.post('/time-entries/validate', {
        time_entry_ids: ids,
        action: 'validate'
      });
      toast.success(`${ids.length} saisie(s) validée(s)`);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la validation');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Veuillez indiquer une raison');
      return;
    }

    const ids = editingEntry ? [editingEntry.id] : Array.from(selectedEntries);
    try {
      await axios.post('/time-entries/validate', {
        time_entry_ids: ids,
        action: 'reject',
        rejection_reason: rejectReason
      });
      toast.success(`${ids.length} saisie(s) rejetée(s)`);
      setRejectDialogOpen(false);
      setRejectReason('');
      setEditingEntry(null);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors du rejet');
    }
  };

  const handleEditClick = (entry) => {
    setEditingEntry(entry);
    setEditForm({
      hours: entry.hours.toString(),
      project_id: entry.project_id,
      discipline: entry.discipline,
      activity: entry.activity,
      service_type: entry.service_type,
      date: entry.date.split('T')[0],
      admin_reason: ''
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editForm.admin_reason.trim()) {
      toast.error('La raison de modification est obligatoire');
      return;
    }

    try {
      await axios.put(`/time-entries/${editingEntry.id}/admin-edit`, editForm);
      toast.success('Saisie modifiée');
      setEditDialogOpen(false);
      setEditingEntry(null);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };

  const handleDelete = async (entry) => {
    setEditingEntry(entry);
    const reason = prompt('Raison de la suppression (obligatoire pour audit):');
    if (!reason) {
      setEditingEntry(null);
      return;
    }

    try {
      await axios.delete(`/time-entries/${entry.id}/admin-delete?reason=${encodeURIComponent(reason)}`);
      toast.success('Saisie supprimée');
      setEditingEntry(null);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleViewDetail = (entry) => {
    setEditingEntry(entry);
    setDetailDialogOpen(true);
  };

  const getUserName = (userId) => {
    const u = users.find(x => x.id === userId);
    return u ? `${u.first_name} ${u.last_name}` : 'Inconnu';
  };

  const getProjectName = (projectId) => {
    const p = projects.find(x => x.id === projectId);
    return p ? p.name : 'Inconnu';
  };

  const toggleSelectEntry = (entryId) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const selectAllSubmitted = () => {
    const submittedIds = entries.filter(e => e.status === 'submitted').map(e => e.id);
    setSelectedEntries(new Set(submittedIds));
  };

  const clearSelection = () => {
    setSelectedEntries(new Set());
  };

  // Group entries by user -> project -> discipline
  const groupedEntries = () => {
    const grouped = {};
    
    entries.forEach(entry => {
      const userId = entry.user_id;
      const projectId = entry.project_id;
      
      if (!grouped[userId]) {
        grouped[userId] = { entries: [], byProject: {} };
      }
      
      grouped[userId].entries.push(entry);
      
      if (!grouped[userId].byProject[projectId]) {
        grouped[userId].byProject[projectId] = [];
      }
      grouped[userId].byProject[projectId].push(entry);
    });
    
    return grouped;
  };

  const getStatusBadge = (status, lastEditedBy) => {
    if (lastEditedBy) {
      return (
        <Badge className="bg-orange-100 text-orange-700">
          <Edit className="h-3 w-3 mr-1" />
          Modifié Admin
        </Badge>
      );
    }
    
    const configs = {
      draft: { className: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Brouillon' },
      submitted: { className: 'bg-yellow-100 text-yellow-700', icon: AlertCircle, label: 'Soumis' },
      validated: { className: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Validé' },
      rejected: { className: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejeté' }
    };
    
    const config = configs[status] || configs.draft;
    const Icon = config.icon;
    
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const toggleUser = (userId) => {
    setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const toggleProject = (key) => {
    setExpandedProjects(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const grouped = groupedEntries();
  const submittedCount = entries.filter(e => e.status === 'submitted').length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Validation des temps</h1>
            <p className="text-muted-foreground">
              Validez, corrigez ou rejetez les saisies de votre équipe
            </p>
          </div>
          {submittedCount > 0 && (
            <Badge variant="outline" className="text-lg px-4 py-2 bg-yellow-50 border-yellow-300">
              <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
              {submittedCount} en attente
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="validation" data-testid="tab-validation">
              <CheckSquare className="mr-2 h-4 w-4" />
              Validation
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="mr-2 h-4 w-4" />
              Historique d'audit
            </TabsTrigger>
          </TabsList>

          {/* Validation Tab */}
          <TabsContent value="validation" className="space-y-4 mt-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[150px]">
                    <Label>Utilisateur</Label>
                    <Select value={filters.user_id || 'all'} onValueChange={(v) => setFilters({...filters, user_id: v === 'all' ? '' : v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <Label>Projet</Label>
                    <Select value={filters.project_id || 'all'} onValueChange={(v) => setFilters({...filters, project_id: v === 'all' ? '' : v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <Label>Statut</Label>
                    <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({...filters, status: v === 'all' ? '' : v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="submitted">Soumis</SelectItem>
                        <SelectItem value="validated">Validé</SelectItem>
                        <SelectItem value="rejected">Rejeté</SelectItem>
                        <SelectItem value="draft">Brouillon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" onClick={fetchData}>
                    <Filter className="h-4 w-4 mr-2" />
                    Filtrer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedEntries.size > 0 && (
              <Card className="bg-accent/10 border-accent">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{selectedEntries.size} saisie(s) sélectionnée(s)</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={clearSelection}>
                        Désélectionner
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleValidate(Array.from(selectedEntries))}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Valider tout
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => setRejectDialogOpen(true)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeter tout
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Grouped Entries */}
            {entries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold">Aucune saisie à valider</h3>
                  <p className="text-muted-foreground">Toutes les saisies ont été traitées</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([userId, userData]) => (
                  <Card key={userId}>
                    <CardHeader 
                      className="cursor-pointer hover:bg-secondary/50"
                      onClick={() => toggleUser(userId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedUsers[userId] ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                          <User className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-lg">{getUserName(userId)}</CardTitle>
                          <Badge variant="outline">{userData.entries.length} saisie(s)</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {userData.entries.some(e => e.status === 'submitted') && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectAllSubmitted();
                              }}
                            >
                              Sélectionner soumis
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {expandedUsers[userId] && (
                      <CardContent className="pt-0">
                        {Object.entries(userData.byProject).map(([projectId, projectEntries]) => {
                          const projectKey = `${userId}-${projectId}`;
                          return (
                            <div key={projectId} className="mb-4 last:mb-0">
                              <div 
                                className="flex items-center gap-2 py-2 px-3 bg-secondary/30 rounded-lg cursor-pointer hover:bg-secondary/50"
                                onClick={() => toggleProject(projectKey)}
                              >
                                {expandedProjects[projectKey] ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <FolderOpen className="h-4 w-4 text-accent" />
                                <span className="font-medium">{getProjectName(projectId)}</span>
                                <Badge variant="secondary" className="ml-auto">
                                  {projectEntries.reduce((sum, e) => sum + e.hours, 0)}h
                                </Badge>
                              </div>
                              
                              {expandedProjects[projectKey] && (
                                <div className="mt-2 space-y-2 pl-6">
                                  {projectEntries.map(entry => (
                                    <div 
                                      key={entry.id}
                                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-secondary/20"
                                    >
                                      {entry.status === 'submitted' && (
                                        <Checkbox
                                          checked={selectedEntries.has(entry.id)}
                                          onCheckedChange={() => toggleSelectEntry(entry.id)}
                                        />
                                      )}
                                      
                                      <div className="flex-1 grid grid-cols-4 gap-4">
                                        <div>
                                          <span className="text-xs text-muted-foreground">Date</span>
                                          <p className="font-medium">{formatDate(entry.date)}</p>
                                        </div>
                                        <div>
                                          <span className="text-xs text-muted-foreground">Discipline</span>
                                          <p>{entry.discipline}</p>
                                        </div>
                                        <div>
                                          <span className="text-xs text-muted-foreground">Activité</span>
                                          <p>{entry.activity}</p>
                                        </div>
                                        <div>
                                          <span className="text-xs text-muted-foreground">Heures</span>
                                          <p className="font-bold text-lg">{entry.hours}h</p>
                                        </div>
                                      </div>
                                      
                                      {getStatusBadge(entry.status, entry.last_edited_by)}
                                      
                                      {/* Actions */}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleViewDetail(entry)}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Voir détail
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          {entry.status === 'submitted' && (
                                            <>
                                              <DropdownMenuItem onClick={() => handleValidate(entry.id)}>
                                                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                                                Valider
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => {
                                                setEditingEntry(entry);
                                                setRejectDialogOpen(true);
                                              }}>
                                                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                                Rejeter
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                            </>
                                          )}
                                          <DropdownMenuItem onClick={() => handleEditClick(entry)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Modifier
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={() => handleDelete(entry)}
                                            className="text-red-600"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Supprimer
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Historique d'audit</CardTitle>
                <CardDescription>Traçabilité complète des actions (qui, quand, quoi)</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLog.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune action enregistrée
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditLog.map((log, idx) => (
                      <div key={idx} className="flex gap-4 p-4 border rounded-lg">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          log.action === 'validated' ? 'bg-green-100' :
                          log.action === 'rejected' ? 'bg-red-100' :
                          log.action === 'admin_edit' ? 'bg-orange-100' :
                          log.action === 'admin_delete' ? 'bg-red-200' :
                          'bg-gray-100'
                        }`}>
                          {log.action === 'validated' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                          {log.action === 'rejected' && <XCircle className="h-5 w-5 text-red-600" />}
                          {log.action === 'admin_edit' && <Edit className="h-5 w-5 text-orange-600" />}
                          {log.action === 'admin_delete' && <Trash2 className="h-5 w-5 text-red-600" />}
                          {!['validated', 'rejected', 'admin_edit', 'admin_delete'].includes(log.action) && 
                            <FileText className="h-5 w-5 text-gray-600" />
                          }
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium capitalize">
                              {log.action === 'admin_edit' ? 'Modification admin' :
                               log.action === 'admin_delete' ? 'Suppression admin' :
                               log.action === 'validated' ? 'Validation' :
                               log.action === 'rejected' ? 'Rejet' :
                               log.action}
                            </span>
                            <span className="text-muted-foreground">par</span>
                            <span className="font-medium">{getUserName(log.performed_by)}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.performed_at).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          {log.reason && (
                            <p className="text-sm text-muted-foreground mt-1 italic">
                              "{log.reason}"
                            </p>
                          )}
                          {log.old_values && log.new_values && (
                            <div className="text-sm mt-2 flex items-center gap-2">
                              <span className="text-muted-foreground">Heures:</span>
                              <span className="line-through text-red-500">{log.old_values.hours}h</span>
                              <ArrowRight className="h-3 w-3" />
                              <span className="text-green-600 font-medium">{log.new_values.hours}h</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier la saisie</DialogTitle>
              <DialogDescription>
                Cette modification sera tracée dans l'historique d'audit
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} />
                </div>
                <div>
                  <Label>Heures</Label>
                  <Input type="number" step="0.5" value={editForm.hours} onChange={(e) => setEditForm({...editForm, hours: e.target.value})} />
                </div>
              </div>
              
              <div>
                <Label>Projet</Label>
                <Select value={editForm.project_id} onValueChange={(v) => setEditForm({...editForm, project_id: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Discipline</Label>
                  <Select value={editForm.discipline} onValueChange={(v) => setEditForm({...editForm, discipline: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DISCIPLINES.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Activité</Label>
                  <Select value={editForm.activity} onValueChange={(v) => setEditForm({...editForm, activity: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTIVITIES.map(a => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prestation</Label>
                  <Select value={editForm.service_type} onValueChange={(v) => setEditForm({...editForm, service_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label className="text-red-600">Raison de la modification *</Label>
                <Textarea 
                  value={editForm.admin_reason} 
                  onChange={(e) => setEditForm({...editForm, admin_reason: e.target.value})}
                  placeholder="Expliquez pourquoi vous modifiez cette saisie..."
                  className="mt-1"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleEditSubmit}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeter les saisies</DialogTitle>
              <DialogDescription>
                Cette raison sera visible par l'employé
              </DialogDescription>
            </DialogHeader>
            
            <div>
              <Label>Raison du rejet *</Label>
              <Textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez pourquoi ces saisies sont rejetées..."
                className="mt-2"
              />
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setRejectDialogOpen(false);
                setRejectReason('');
                setEditingEntry(null);
              }}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Rejeter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Détail de la saisie</DialogTitle>
            </DialogHeader>
            
            {editingEntry && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Utilisateur</Label>
                    <p className="font-medium">{getUserName(editingEntry.user_id)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date</Label>
                    <p className="font-medium">{formatDate(editingEntry.date)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Projet</Label>
                    <p className="font-medium">{getProjectName(editingEntry.project_id)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Heures</Label>
                    <p className="font-bold text-2xl">{editingEntry.hours}h</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Discipline</Label>
                    <p>{editingEntry.discipline}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Activité</Label>
                    <p>{editingEntry.activity}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Statut</Label>
                    <div className="mt-1">{getStatusBadge(editingEntry.status, editingEntry.last_edited_by)}</div>
                  </div>
                </div>
                
                {editingEntry.rejection_reason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <Label className="text-red-700">Raison du rejet</Label>
                    <p className="text-sm text-red-600 mt-1">{editingEntry.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
