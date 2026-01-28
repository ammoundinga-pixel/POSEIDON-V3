import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Clock,
  CheckCircle2,
  XCircle,
  Edit3,
  AlertCircle,
  History,
  Eye,
  Lock,
  MoreHorizontal,
  Copy,
  Trash2,
  Undo2,
  FileText,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react';
import { DISCIPLINES, ACTIVITIES, SERVICE_TYPES, formatDate } from '../lib/utils';

// Status configuration with business rules
const getStatusConfig = (status, lastEditedBy = null) => {
  const isAdminModified = lastEditedBy !== null && lastEditedBy !== undefined;
  
  if (isAdminModified) {
    return {
      icon: Edit3,
      label: 'Modifiée par Admin',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      variant: 'secondary',
      locked: true
    };
  }
  
  const configs = {
    draft: {
      icon: Clock,
      label: 'Brouillon',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      variant: 'secondary',
      locked: false
    },
    submitted: {
      icon: AlertCircle,
      label: 'En attente',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      variant: 'default',
      locked: false
    },
    validated: {
      icon: CheckCircle2,
      label: 'Validée',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      variant: 'outline',
      locked: true
    },
    rejected: {
      icon: XCircle,
      label: 'Rejetée',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      variant: 'destructive',
      locked: false
    }
  };
  
  return configs[status] || configs.draft;
};

// Status Badge Component
const StatusBadge = ({ status, lastEditedBy, size = 'default' }) => {
  const config = getStatusConfig(status, lastEditedBy);
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-3 py-1'
  };
  
  return (
    <Badge variant={config.variant} className={`${config.bgColor} ${config.color} ${sizeClasses[size]} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Timeline Event for History
const TimelineEvent = ({ event, users }) => {
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : 'Système';
  };

  const getActionConfig = (action) => {
    const configs = {
      'created': { label: 'Créée', icon: FileText, color: 'bg-blue-500' },
      'submitted': { label: 'Soumise', icon: Send, color: 'bg-yellow-500' },
      'validated': { label: 'Validée', icon: CheckCircle2, color: 'bg-green-500' },
      'rejected': { label: 'Rejetée', icon: XCircle, color: 'bg-red-500' },
      'admin_edit': { label: 'Modifiée par Admin', icon: Edit3, color: 'bg-orange-500' },
      'admin_delete': { label: 'Supprimée par Admin', icon: Trash2, color: 'bg-red-600' },
      'updated': { label: 'Modifiée', icon: Edit3, color: 'bg-blue-400' }
    };
    return configs[action] || { label: action, icon: Clock, color: 'bg-gray-400' };
  };

  const config = getActionConfig(event.action);
  const Icon = config.icon;

  return (
    <div className="flex gap-4 pb-4">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="w-0.5 h-full bg-border mt-2"></div>
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{config.label}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(event.performed_at).toLocaleString('fr-FR')}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Par {getUserName(event.performed_by)}
        </p>
        {event.reason && (
          <p className="text-sm text-muted-foreground italic mt-1 bg-secondary/50 p-2 rounded">
            "{event.reason}"
          </p>
        )}
        {event.old_values && event.new_values && (
          <div className="mt-2 text-sm bg-secondary/30 p-2 rounded">
            {event.old_values.hours !== event.new_values.hours && (
              <p className="flex items-center gap-2">
                <span className="text-muted-foreground">Heures:</span>
                <span className="line-through text-red-500">{event.old_values.hours}h</span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium text-green-600">{event.new_values.hours}h</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function TimeEntryPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('saisie');
  const [myHistory, setMyHistory] = useState([]);
  
  // Dialog states
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryTimeline, setEntryTimeline] = useState([]);
  
  // Undo deletion state
  const [pendingDeletion, setPendingDeletion] = useState(null);
  const undoTimeoutRef = useRef(null);
  
  // Week submission state
  const [weekStatus, setWeekStatus] = useState('draft'); // draft, submitted, partial
  const [submittingWeek, setSubmittingWeek] = useState(false);

  useEffect(() => {
    fetchData();
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, [currentDate]);

  useEffect(() => {
    if (activeTab === 'historique') {
      fetchMyHistory();
    }
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const [entriesRes, projectsRes] = await Promise.all([
        axios.get('/time-entries', {
          params: {
            user_id: user.id,
            start_date: weekStart.toISOString().split('T')[0],
            end_date: weekEnd.toISOString().split('T')[0]
          }
        }),
        axios.get('/projects')
      ]);

      // Fetch users for admins/managers
      try {
        if (user.role !== 'employee') {
          const usersRes = await axios.get('/users');
          setUsers(usersRes.data);
        }
      } catch (e) {
        console.log('Users list not available');
      }

      const availableProjects = projectsRes.data.filter(p => p.status !== 'archived');
      setProjects(availableProjects);
      
      const grouped = groupEntries(entriesRes.data);
      setTimeEntries(grouped);
      
      // Calculate week status
      calculateWeekStatus(entriesRes.data);
      
      if (grouped.length === 0 && availableProjects.length > 0) {
        setTimeEntries([createEmptyEntry()]);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyHistory = async () => {
    try {
      const response = await axios.get('/time-entries', {
        params: { user_id: user.id }
      });
      // Sort by date descending
      const sorted = response.data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setMyHistory(sorted);
    } catch (error) {
      console.error('Failed to fetch history', error);
    }
  };

  const fetchEntryTimeline = async (entryId) => {
    try {
      const response = await axios.get('/audit-log', {
        params: {
          entity_type: 'time_entry',
          entity_id: entryId
        }
      });
      setEntryTimeline(response.data);
    } catch (error) {
      // Audit log may not be accessible for employees
      setEntryTimeline([]);
    }
  };

  const createEmptyEntry = () => ({
    project_id: '',
    discipline: '',
    activity: '',
    service_type: '',
    isNew: true,
    hours: {},
    entryIds: {},
    statuses: {},
    lastEditedBy: {},
    rejectionReasons: {}
  });

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getWeekDates = () => {
    const start = getWeekStart(currentDate);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const groupEntries = (entries) => {
    const grouped = [];
    const seen = new Set();

    entries.forEach(entry => {
      const key = `${entry.project_id}-${entry.discipline}-${entry.activity}-${entry.service_type}`;
      if (!seen.has(key)) {
        seen.add(key);
        grouped.push({
          project_id: entry.project_id,
          discipline: entry.discipline,
          activity: entry.activity,
          service_type: entry.service_type,
          isNew: false,
          hours: {},
          entryIds: {},
          statuses: {},
          lastEditedBy: {},
          rejectionReasons: {}
        });
      }
    });

    entries.forEach(entry => {
      const dateKey = entry.date.split('T')[0];
      const groupIndex = grouped.findIndex(g => 
        g.project_id === entry.project_id &&
        g.discipline === entry.discipline &&
        g.activity === entry.activity &&
        g.service_type === entry.service_type
      );

      if (groupIndex !== -1) {
        grouped[groupIndex].hours[dateKey] = entry.hours;
        grouped[groupIndex].entryIds[dateKey] = entry.id;
        grouped[groupIndex].statuses[dateKey] = entry.status;
        grouped[groupIndex].lastEditedBy[dateKey] = entry.last_edited_by;
        grouped[groupIndex].rejectionReasons[dateKey] = entry.rejection_reason;
      }
    });

    return grouped;
  };

  const calculateWeekStatus = (entries) => {
    if (entries.length === 0) {
      setWeekStatus('draft');
      return;
    }
    
    const hasSubmitted = entries.some(e => e.status === 'submitted');
    const hasDraft = entries.some(e => e.status === 'draft');
    const allValidated = entries.every(e => e.status === 'validated');
    
    if (allValidated) {
      setWeekStatus('validated');
    } else if (hasSubmitted && hasDraft) {
      setWeekStatus('partial');
    } else if (hasSubmitted) {
      setWeekStatus('submitted');
    } else {
      setWeekStatus('draft');
    }
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : projectId;
  };

  const getProjectDisciplines = (projectId) => {
    if (!projectId) return [];
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.disciplines || project.disciplines.length === 0) {
      return DISCIPLINES.map(d => d.value);
    }
    return project.disciplines;
  };

  const handleHoursChange = (index, dateStr, value) => {
    const newEntries = [...timeEntries];
    newEntries[index].hours[dateStr] = value;
    setTimeEntries(newEntries);
  };

  const handleFieldChange = (index, field, value) => {
    const newEntries = [...timeEntries];
    newEntries[index][field] = value;
    
    // Reset dependent fields
    if (field === 'project_id') {
      newEntries[index].discipline = '';
      newEntries[index].activity = '';
      newEntries[index].service_type = '';
    } else if (field === 'discipline') {
      newEntries[index].activity = '';
      newEntries[index].service_type = '';
    } else if (field === 'activity') {
      newEntries[index].service_type = '';
    }
    
    setTimeEntries(newEntries);
  };

  const validateEntry = (entry) => {
    if (!entry.project_id) return 'Veuillez sélectionner un projet';
    if (!entry.discipline) return 'Veuillez sélectionner une discipline';
    if (!entry.activity) return 'Veuillez sélectionner une activité';
    if (!entry.service_type) return 'Veuillez sélectionner une prestation';
    return null;
  };

  const handleSaveCell = async (entry, dateStr) => {
    const hours = parseFloat(entry.hours[dateStr]);
    if (isNaN(hours) || hours < 0) {
      toast.error('Heures invalides');
      return;
    }

    // Validate entry fields
    const error = validateEntry(entry);
    if (error) {
      toast.error(error);
      return;
    }

    // Check lock status
    const config = getStatusConfig(entry.statuses?.[dateStr], entry.lastEditedBy?.[dateStr]);
    if (config.locked) {
      toast.error(config.locked ? 'Cette saisie est verrouillée' : 'Modification impossible');
      return;
    }

    try {
      const entryData = {
        project_id: entry.project_id,
        discipline: entry.discipline,
        activity: entry.activity,
        service_type: entry.service_type,
        date: dateStr,
        hours: hours,
        task_description: '',
        day_type: 'présentiel'
      };

      if (entry.entryIds[dateStr]) {
        await axios.put(`/time-entries/${entry.entryIds[dateStr]}`, entryData);
        toast.success('Modifié');
      } else if (hours > 0) {
        const response = await axios.post('/time-entries', entryData);
        const newEntries = [...timeEntries];
        const index = timeEntries.indexOf(entry);
        newEntries[index].entryIds[dateStr] = response.data.id;
        newEntries[index].statuses[dateStr] = 'draft';
        newEntries[index].isNew = false;
        setTimeEntries(newEntries);
        toast.success('Enregistré');
      }
    } catch (error) {
      const msg = error.response?.data?.detail || 'Erreur de sauvegarde';
      toast.error(msg);
    }
  };

  const handleDuplicateLine = (entry) => {
    const newEntry = {
      ...createEmptyEntry(),
      project_id: entry.project_id,
      discipline: entry.discipline,
      activity: entry.activity,
      service_type: entry.service_type
    };
    setTimeEntries([...timeEntries, newEntry]);
    toast.success('Ligne dupliquée');
  };

  const handleDeleteLine = (index) => {
    const entry = timeEntries[index];
    const entryIds = Object.values(entry.entryIds).filter(Boolean);
    
    // Check if any entries are locked
    const hasLocked = Object.keys(entry.statuses).some(dateStr => {
      const config = getStatusConfig(entry.statuses[dateStr], entry.lastEditedBy?.[dateStr]);
      return config.locked;
    });
    
    if (hasLocked) {
      toast.error('Impossible de supprimer une ligne avec des saisies validées');
      return;
    }

    // Store for undo
    const deletedEntry = { ...entry, index };
    const newEntries = timeEntries.filter((_, i) => i !== index);
    setTimeEntries(newEntries);
    
    // Set pending deletion
    setPendingDeletion({ entry: deletedEntry, entryIds });
    
    // Show undo toast
    toast.success(
      <div className="flex items-center gap-3">
        <span>Ligne supprimée</span>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => handleUndoDelete(deletedEntry, newEntries)}
          className="h-7"
        >
          <Undo2 className="h-3 w-3 mr-1" />
          Annuler
        </Button>
      </div>,
      { duration: 10000 }
    );
    
    // Set timeout for permanent deletion
    undoTimeoutRef.current = setTimeout(async () => {
      if (entryIds.length > 0) {
        try {
          await Promise.all(entryIds.map(id => axios.delete(`/time-entries/${id}`)));
        } catch (error) {
          console.error('Failed to delete entries', error);
        }
      }
      setPendingDeletion(null);
    }, 10000);
  };

  const handleUndoDelete = (deletedEntry, currentEntries) => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    
    const newEntries = [...currentEntries];
    newEntries.splice(deletedEntry.index, 0, deletedEntry);
    setTimeEntries(newEntries);
    setPendingDeletion(null);
    toast.success('Suppression annulée');
  };

  const handleSubmitWeek = async () => {
    setSubmittingWeek(true);
    try {
      // Collect all draft entry IDs
      const draftIds = [];
      timeEntries.forEach(entry => {
        Object.keys(entry.entryIds).forEach(dateStr => {
          if (entry.statuses[dateStr] === 'draft' || entry.statuses[dateStr] === 'rejected') {
            draftIds.push(entry.entryIds[dateStr]);
          }
        });
      });

      if (draftIds.length === 0) {
        toast.info('Aucune saisie à soumettre');
        return;
      }

      await axios.post('/time-entries/submit', { entry_ids: draftIds });
      toast.success(`${draftIds.length} saisie(s) soumise(s) pour validation`);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la soumission');
    } finally {
      setSubmittingWeek(false);
    }
  };

  const handleCancelSubmission = async () => {
    // This would require a backend endpoint to cancel submission
    toast.info('Fonctionnalité à venir');
  };

  const handleViewDetails = async (entry, dateStr) => {
    const entryId = entry.entryIds?.[dateStr];
    if (!entryId) return;

    const fullEntry = {
      ...entry,
      id: entryId,
      date: dateStr,
      currentHours: entry.hours[dateStr],
      status: entry.statuses?.[dateStr],
      last_edited_by: entry.lastEditedBy?.[dateStr],
      rejection_reason: entry.rejectionReasons?.[dateStr]
    };

    setSelectedEntry(fullEntry);
    await fetchEntryTimeline(entryId);
    setDetailDialogOpen(true);
  };

  const addNewLine = () => {
    if (projects.length === 0) {
      toast.error('Aucun projet disponible');
      return;
    }
    setTimeEntries([...timeEntries, createEmptyEntry()]);
  };

  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const weekDates = getWeekDates();
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  // Calculate week totals
  const weekTotal = timeEntries.reduce((total, entry) => {
    return total + Object.values(entry.hours).reduce((sum, h) => sum + (parseFloat(h) || 0), 0);
  }, 0);

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
            <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Saisie du temps</h1>
            <p className="text-muted-foreground">
              Enregistrez vos heures de travail hebdomadaires
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              {weekTotal.toFixed(1)}h cette semaine
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="saisie" data-testid="tab-saisie">
              <Calendar className="mr-2 h-4 w-4" />
              Grille de saisie
            </TabsTrigger>
            <TabsTrigger value="historique" data-testid="tab-historique">
              <History className="mr-2 h-4 w-4" />
              Mon historique
            </TabsTrigger>
          </TabsList>

          {/* Saisie Tab */}
          <TabsContent value="saisie" className="space-y-4 mt-6">
            {/* Week Navigation */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={previousWeek} data-testid="prev-week-btn">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Semaine précédente
                  </Button>
                  <div className="text-center">
                    <p className="text-lg font-semibold">
                      {formatDate(weekStart)} - {formatDate(weekEnd)}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      {weekStatus === 'validated' && (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Semaine validée
                        </Badge>
                      )}
                      {weekStatus === 'submitted' && (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          En attente de validation
                        </Badge>
                      )}
                      {weekStatus === 'partial' && (
                        <Badge className="bg-orange-100 text-orange-700">
                          <Clock className="h-3 w-3 mr-1" />
                          Partiellement soumise
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" onClick={nextWeek} data-testid="next-week-btn">
                    Semaine suivante
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span>Brouillon</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>En attente</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Validée</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Rejetée</span>
              </div>
              <div className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-muted-foreground" />
                <span>Verrouillée</span>
              </div>
            </div>

            {/* Time Entry Grid */}
            <Card>
              <CardContent className="pt-6">
                {projects.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucun projet disponible</h3>
                    <p className="text-muted-foreground">Contactez votre administrateur.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse" data-testid="time-entry-grid">
                        <thead>
                          <tr>
                            <th className="border p-2 bg-secondary text-left min-w-[140px]">Projet</th>
                            <th className="border p-2 bg-secondary text-left min-w-[100px]">Discipline</th>
                            <th className="border p-2 bg-secondary text-left min-w-[90px]">Activité</th>
                            <th className="border p-2 bg-secondary text-left min-w-[110px]">Prestation</th>
                            {weekDates.map(date => (
                              <th key={date.toISOString()} className="border p-2 bg-secondary text-center min-w-[80px]">
                                <div className="text-xs text-muted-foreground">
                                  {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                                </div>
                                <div className="text-sm font-medium">
                                  {date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                </div>
                              </th>
                            ))}
                            <th className="border p-2 bg-secondary w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {timeEntries.map((entry, index) => (
                            <tr key={index} className="hover:bg-secondary/30">
                              {/* Project */}
                              <td className="border p-2">
                                {entry.isNew ? (
                                  <Select
                                    value={entry.project_id}
                                    onValueChange={(val) => handleFieldChange(index, 'project_id', val)}
                                  >
                                    <SelectTrigger className="h-8" data-testid={`project-select-${index}`}>
                                      <SelectValue placeholder="Projet" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-sm font-medium">{getProjectName(entry.project_id)}</span>
                                )}
                              </td>
                              
                              {/* Discipline */}
                              <td className="border p-2">
                                {entry.isNew ? (
                                  <Select
                                    value={entry.discipline}
                                    onValueChange={(val) => handleFieldChange(index, 'discipline', val)}
                                    disabled={!entry.project_id}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder={entry.project_id ? "Discipline" : "..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getProjectDisciplines(entry.project_id).map(d => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-sm">{entry.discipline}</span>
                                )}
                              </td>
                              
                              {/* Activity */}
                              <td className="border p-2">
                                {entry.isNew ? (
                                  <Select
                                    value={entry.activity}
                                    onValueChange={(val) => handleFieldChange(index, 'activity', val)}
                                    disabled={!entry.discipline}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder={entry.discipline ? "Activité" : "..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ACTIVITIES.map(a => (
                                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-sm">{entry.activity}</span>
                                )}
                              </td>
                              
                              {/* Service Type */}
                              <td className="border p-2">
                                {entry.isNew ? (
                                  <Select
                                    value={entry.service_type}
                                    onValueChange={(val) => handleFieldChange(index, 'service_type', val)}
                                    disabled={!entry.activity}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder={entry.activity ? "Prestation" : "..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {SERVICE_TYPES.map(s => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-sm">{entry.service_type}</span>
                                )}
                              </td>
                              
                              {/* Hours cells */}
                              {weekDates.map(date => {
                                const dateStr = date.toISOString().split('T')[0];
                                const hours = entry.hours[dateStr] || '';
                                const status = entry.statuses?.[dateStr];
                                const lastEditedBy = entry.lastEditedBy?.[dateStr];
                                const config = getStatusConfig(status, lastEditedBy);
                                const isLocked = config.locked;

                                return (
                                  <td key={date.toISOString()} className="border p-1">
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="24"
                                        value={hours}
                                        onChange={(e) => handleHoursChange(index, dateStr, e.target.value)}
                                        onBlur={() => handleSaveCell(entry, dateStr)}
                                        disabled={isLocked}
                                        className={`h-9 text-center pr-6 ${
                                          isLocked ? 'bg-secondary cursor-not-allowed' : ''
                                        } ${status === 'validated' ? 'border-green-300' : ''} 
                                        ${status === 'rejected' ? 'border-red-300' : ''}
                                        ${status === 'submitted' ? 'border-yellow-300' : ''}`}
                                        placeholder="0"
                                        data-testid={`hours-input-${index}-${dateStr}`}
                                      />
                                      {/* Status indicator */}
                                      <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                        {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                                        {status === 'validated' && !isLocked && (
                                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        )}
                                        {status === 'rejected' && (
                                          <XCircle className="h-3 w-3 text-red-500" />
                                        )}
                                        {status === 'submitted' && (
                                          <AlertCircle className="h-3 w-3 text-yellow-500" />
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                              
                              {/* Actions menu */}
                              <td className="border p-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`row-menu-${index}`}>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {/* Show different options based on entry status */}
                                    {!entry.isNew && (
                                      <>
                                        <DropdownMenuItem onClick={() => handleViewDetails(entry, Object.keys(entry.entryIds)[0])}>
                                          <Eye className="h-4 w-4 mr-2" />
                                          Voir le détail
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleViewDetails(entry, Object.keys(entry.entryIds)[0])}>
                                          <History className="h-4 w-4 mr-2" />
                                          Historique
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                      </>
                                    )}
                                    <DropdownMenuItem onClick={() => handleDuplicateLine(entry)}>
                                      <Copy className="h-4 w-4 mr-2" />
                                      Dupliquer la ligne
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteLine(index)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Supprimer la ligne
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <Button onClick={addNewLine} variant="outline" data-testid="add-line-btn">
                        + Ajouter une ligne
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        {weekStatus === 'submitted' && (
                          <Button variant="outline" onClick={handleCancelSubmission}>
                            Annuler la soumission
                          </Button>
                        )}
                        {(weekStatus === 'draft' || weekStatus === 'partial') && (
                          <Button 
                            onClick={handleSubmitWeek} 
                            disabled={submittingWeek}
                            data-testid="submit-week-btn"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {submittingWeek ? 'Envoi...' : 'Soumettre la semaine'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Historique Tab */}
          <TabsContent value="historique" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Mon historique de saisies</CardTitle>
                <CardDescription>Consultez toutes vos saisies et leur statut</CardDescription>
              </CardHeader>
              <CardContent>
                {myHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune saisie trouvée
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myHistory.map(entry => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/30 transition-colors"
                        data-testid={`history-entry-${entry.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-medium">{getProjectName(entry.project_id)}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">
                              {entry.discipline} / {entry.activity}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-2xl font-bold">{entry.hours}h</span>
                            <StatusBadge status={entry.status} lastEditedBy={entry.last_edited_by} />
                            <span className="text-sm text-muted-foreground">
                              {formatDate(entry.date)}
                            </span>
                          </div>
                          {entry.rejection_reason && (
                            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                              Raison du rejet: {entry.rejection_reason}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEntry(entry);
                            fetchEntryTimeline(entry.id);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Détails
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails de la saisie</DialogTitle>
              <DialogDescription>Informations et historique des modifications</DialogDescription>
            </DialogHeader>

            {selectedEntry && (
              <div className="space-y-6">
                {/* Entry Info */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Projet</Label>
                        <p className="font-medium">{getProjectName(selectedEntry.project_id)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Date</Label>
                        <p className="font-medium">{formatDate(selectedEntry.date)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Discipline / Activité</Label>
                        <p>{selectedEntry.discipline} / {selectedEntry.activity}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Heures</Label>
                        <p className="text-2xl font-bold">{selectedEntry.currentHours || selectedEntry.hours}h</p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-muted-foreground">Statut</Label>
                        <div className="mt-1">
                          <StatusBadge 
                            status={selectedEntry.status} 
                            lastEditedBy={selectedEntry.last_edited_by}
                          />
                        </div>
                      </div>
                    </div>

                    {selectedEntry.rejection_reason && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <Label className="text-red-700">Raison du rejet</Label>
                        <p className="text-sm text-red-600 mt-1">{selectedEntry.rejection_reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Historique</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {entryTimeline.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun historique disponible
                      </p>
                    ) : (
                      <div>
                        {entryTimeline.map((event, idx) => (
                          <TimelineEvent key={idx} event={event} users={users} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
