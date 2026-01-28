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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
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
  Plus,
  Trash2,
  Lock,
  DollarSign,
  DollarSignIcon,
  Briefcase,
  Users,
  FileText,
  Info,
  Save
} from 'lucide-react';
import { formatDate } from '../lib/utils';

// Billable Badge Component
const BillableBadge = ({ isBillable, size = 'default' }) => {
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`${sizeClasses} ${
              isBillable 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' 
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {isBillable ? '€ Facturable' : 'Non facturable'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-[200px] text-xs">
            {isBillable 
              ? 'Ces heures seront facturées au client' 
              : 'Heures internes (formation, admin, management...)'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const configs = {
    draft: { icon: Clock, label: 'Brouillon', className: 'bg-gray-100 text-gray-600' },
    submitted: { icon: AlertCircle, label: 'En attente', className: 'bg-yellow-100 text-yellow-700' },
    validated: { icon: CheckCircle2, label: 'Validée', className: 'bg-emerald-100 text-emerald-700' },
    rejected: { icon: XCircle, label: 'Rejetée', className: 'bg-red-100 text-red-700' }
  };
  const config = configs[status] || configs.draft;
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.className} text-xs flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Week days helper
const getWeekDays = (date) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
};

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function TimeEntryPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  
  // Master data
  const [projects, setProjects] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [bookingCodes, setBookingCodes] = useState([]);
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Time entries (rows)
  const [rows, setRows] = useState([]);
  
  // Week status
  const [weekStatus, setWeekStatus] = useState('draft');
  const [submitting, setSubmitting] = useState(false);
  
  // Dialog
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  const weekDays = getWeekDays(currentDate);
  
  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const weekStart = weekDays[0].toISOString().split('T')[0];
      const weekEnd = weekDays[6].toISOString().split('T')[0];
      
      const [
        disciplinesRes,
        bookingCodesRes,
        activitiesRes,
        projectsRes,
        entriesRes
      ] = await Promise.all([
        axios.get('/disciplines'),
        axios.get('/booking-codes'),
        axios.get('/activities'),
        axios.get('/project-assignments/my-projects'),
        axios.get('/time-entries', {
          params: {
            user_id: user.id,
            start_date: weekStart,
            end_date: weekEnd
          }
        })
      ]);
      
      setDisciplines(disciplinesRes.data || []);
      setBookingCodes(bookingCodesRes.data || []);
      setActivities(activitiesRes.data || []);
      setProjects(projectsRes.data || []);
      
      // Fetch users for managers
      if (user.role !== 'employee') {
        try {
          const usersRes = await axios.get('/users');
          setUsers(usersRes.data || []);
        } catch (e) {}
      }
      
      // Group entries into rows
      const entries = entriesRes.data || [];
      const grouped = groupEntriesIntoRows(entries, weekDays);
      
      if (grouped.length === 0) {
        // Add one empty row
        grouped.push(createEmptyRow());
      }
      
      setRows(grouped);
      
      // Calculate week status
      const allSubmitted = entries.length > 0 && entries.every(e => e.status === 'submitted' || e.status === 'validated');
      const anySubmitted = entries.some(e => e.status === 'submitted' || e.status === 'validated');
      setWeekStatus(allSubmitted ? 'submitted' : anySubmitted ? 'partial' : 'draft');
      
    } catch (error) {
      console.error('Failed to fetch data', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const groupEntriesIntoRows = (entries, days) => {
    // Group by project+discipline+bookingCode+activity
    const grouped = {};
    
    entries.forEach(entry => {
      const key = `${entry.project_id}|${entry.discipline_id || ''}|${entry.booking_code_id || ''}|${entry.activity_id || ''}`;
      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          project_id: entry.project_id,
          discipline_id: entry.discipline_id,
          booking_code_id: entry.booking_code_id,
          activity_id: entry.activity_id,
          days: {},
          isLocked: false
        };
      }
      
      const dateKey = entry.date.split('T')[0];
      grouped[key].days[dateKey] = {
        entry_id: entry.id,
        hours: entry.hours,
        status: entry.status,
        comment: entry.comment
      };
      
      // Check if any day is locked
      if (entry.status === 'validated' || entry.last_edited_by) {
        grouped[key].isLocked = true;
      }
    });
    
    return Object.values(grouped);
  };

  const createEmptyRow = () => ({
    id: `new-${Date.now()}`,
    project_id: '',
    discipline_id: '',
    booking_code_id: '',
    activity_id: '',
    days: {},
    isNew: true,
    isLocked: false
  });

  // Navigation
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  // Add new row
  const addRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  // Update row field
  const updateRowField = (rowIndex, field, value) => {
    const newRows = [...rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [field]: value };
    setRows(newRows);
  };

  // Update hours for a day
  const updateDayHours = (rowIndex, dateKey, hours) => {
    const newRows = [...rows];
    const row = { ...newRows[rowIndex] };
    row.days = { ...row.days };
    
    if (!row.days[dateKey]) {
      row.days[dateKey] = { hours: 0 };
    }
    row.days[dateKey] = { ...row.days[dateKey], hours: parseFloat(hours) || 0 };
    
    newRows[rowIndex] = row;
    setRows(newRows);
  };

  // Delete row
  const deleteRow = (rowIndex) => {
    if (rows.length <= 1) {
      toast.error('Vous devez garder au moins une ligne');
      return;
    }
    const newRows = rows.filter((_, i) => i !== rowIndex);
    setRows(newRows);
  };

  // Save entries
  const saveEntries = async () => {
    // Validate rows
    for (const row of rows) {
      const hasHours = Object.values(row.days).some(d => d.hours > 0);
      if (hasHours) {
        if (!row.project_id) {
          toast.error('Projet obligatoire pour chaque ligne avec des heures');
          return;
        }
        if (!row.discipline_id) {
          toast.error('Discipline obligatoire pour chaque ligne avec des heures');
          return;
        }
        if (!row.booking_code_id) {
          toast.error('Prestation (Booking Code) obligatoire pour chaque ligne avec des heures');
          return;
        }
        if (!row.activity_id) {
          toast.error('Activité obligatoire pour chaque ligne avec des heures');
          return;
        }
      }
    }
    
    try {
      // Get booking code info for billable flag
      const bookingCodeMap = {};
      bookingCodes.forEach(bc => { bookingCodeMap[bc.id] = bc; });
      
      // Build entries to save
      const entriesToSave = [];
      
      for (const row of rows) {
        for (const [dateKey, dayData] of Object.entries(row.days)) {
          if (dayData.hours > 0 && row.project_id) {
            const bookingCode = bookingCodeMap[row.booking_code_id];
            
            entriesToSave.push({
              id: dayData.entry_id,
              project_id: row.project_id,
              discipline_id: row.discipline_id,
              booking_code_id: row.booking_code_id,
              activity_id: row.activity_id,
              date: dateKey,
              hours: dayData.hours,
              is_billable: bookingCode?.is_billable || false,
              status: dayData.status || 'draft'
            });
          }
        }
      }
      
      // Send to backend
      await axios.post('/time-entries/bulk', { entries: entriesToSave });
      toast.success('Saisies enregistrées');
      fetchData();
    } catch (error) {
      console.error('Save failed', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  // Submit week
  const submitWeek = async () => {
    setSubmitting(true);
    try {
      const weekStart = weekDays[0].toISOString().split('T')[0];
      const weekEnd = weekDays[6].toISOString().split('T')[0];
      
      await axios.post('/time-entries/submit', {
        user_id: user.id,
        start_date: weekStart,
        end_date: weekEnd
      });
      
      toast.success('Semaine soumise pour validation');
      fetchData();
    } catch (error) {
      console.error('Submit failed', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate totals
  const getRowTotal = (row) => {
    return Object.values(row.days).reduce((sum, d) => sum + (d.hours || 0), 0);
  };

  const getDayTotal = (dateKey) => {
    return rows.reduce((sum, row) => sum + (row.days[dateKey]?.hours || 0), 0);
  };

  const getWeekTotal = () => {
    return rows.reduce((sum, row) => sum + getRowTotal(row), 0);
  };

  const getBillableTotal = () => {
    const bookingCodeMap = {};
    bookingCodes.forEach(bc => { bookingCodeMap[bc.id] = bc; });
    
    return rows.reduce((sum, row) => {
      const bookingCode = bookingCodeMap[row.booking_code_id];
      if (bookingCode?.is_billable) {
        return sum + getRowTotal(row);
      }
      return sum;
    }, 0);
  };

  // Get project name
  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || project?.code || '';
  };

  // Get discipline name
  const getDisciplineName = (disciplineId) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    return disc?.code || disc?.name || '';
  };

  // Get booking code
  const getBookingCode = (bookingCodeId) => {
    return bookingCodes.find(bc => bc.id === bookingCodeId);
  };

  // Get activity name
  const getActivityName = (activityId) => {
    const act = activities.find(a => a.id === activityId);
    return act?.name || '';
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

  const weekTotal = getWeekTotal();
  const billableTotal = getBillableTotal();
  const billablePercent = weekTotal > 0 ? (billableTotal / weekTotal) * 100 : 0;

  return (
    <DashboardLayout>
      <div data-testid="time-entry-page" className="space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Saisie du temps</h1>
            <p className="text-muted-foreground text-sm">
              Booking Code = Facturation • Remplissez tous les champs obligatoires
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setInfoDialogOpen(true)}>
              <Info className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Week Navigator + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Week Navigation */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="text-center">
                  <div className="font-semibold">
                    Semaine du {formatDate(weekDays[0])} au {formatDate(weekDays[6])}
                  </div>
                  <Button variant="link" size="sm" onClick={goToCurrentWeek} className="text-xs">
                    Semaine actuelle
                  </Button>
                </div>
                
                <Button variant="outline" size="icon" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Week Stats */}
          <Card>
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <div className="text-sm text-muted-foreground">Total semaine</div>
              <div className="text-3xl font-bold font-mono">{weekTotal.toFixed(1)}h</div>
              <div className="text-xs text-muted-foreground">/ {7 * (user.capacity_hours_per_day || 7)}h capacité</div>
            </CardContent>
          </Card>

          {/* Billable Stats */}
          <Card className={billablePercent >= 70 ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20'}>
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Facturable
              </div>
              <div className="text-3xl font-bold font-mono">{billablePercent.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">{billableTotal.toFixed(1)}h sur {weekTotal.toFixed(1)}h</div>
            </CardContent>
          </Card>
        </div>

        {/* Time Entry Grid */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Grille de saisie</CardTitle>
                <CardDescription>
                  Projet → Discipline → Prestation (Booking Code) → Activité → Heures
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addRow}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ligne
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="p-2 text-left text-xs font-semibold min-w-[150px]">Projet *</th>
                    <th className="p-2 text-left text-xs font-semibold min-w-[100px]">Discipline *</th>
                    <th className="p-2 text-left text-xs font-semibold min-w-[180px]">
                      Prestation *
                      <span className="block text-[10px] font-normal text-muted-foreground">(Booking Code)</span>
                    </th>
                    <th className="p-2 text-left text-xs font-semibold min-w-[120px]">Activité *</th>
                    {weekDays.map((day, i) => {
                      const isWeekend = i >= 5;
                      const isToday = day.toDateString() === new Date().toDateString();
                      return (
                        <th 
                          key={i} 
                          className={`p-2 text-center text-xs font-semibold min-w-[60px] ${
                            isWeekend ? 'bg-slate-100 dark:bg-slate-800' : ''
                          } ${isToday ? 'ring-2 ring-accent ring-inset' : ''}`}
                        >
                          <div>{DAY_NAMES[i]}</div>
                          <div className="font-normal text-muted-foreground">{day.getDate()}</div>
                        </th>
                      );
                    })}
                    <th className="p-2 text-center text-xs font-semibold min-w-[60px] bg-accent/10">Total</th>
                    <th className="p-2 w-[40px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => {
                    const bookingCode = getBookingCode(row.booking_code_id);
                    const rowTotal = getRowTotal(row);
                    
                    return (
                      <tr key={row.id} className="border-b hover:bg-muted/20">
                        {/* Project */}
                        <td className="p-1">
                          <Select 
                            value={row.project_id} 
                            onValueChange={(v) => updateRowField(rowIndex, 'project_id', v)}
                            disabled={row.isLocked}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Projet..." />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  <span className="font-mono text-xs">{p.code}</span>
                                  <span className="ml-1 text-xs">{p.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        
                        {/* Discipline */}
                        <td className="p-1">
                          <Select 
                            value={row.discipline_id} 
                            onValueChange={(v) => updateRowField(rowIndex, 'discipline_id', v)}
                            disabled={row.isLocked}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Disc..." />
                            </SelectTrigger>
                            <SelectContent>
                              {disciplines.filter(d => d.is_active).map(d => (
                                <SelectItem key={d.id} value={d.id}>
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                                    {d.code}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        
                        {/* Booking Code (Prestation) */}
                        <td className="p-1">
                          <Select 
                            value={row.booking_code_id} 
                            onValueChange={(v) => updateRowField(rowIndex, 'booking_code_id', v)}
                            disabled={row.isLocked}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Prestation..." />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="px-2 py-1 text-xs font-semibold text-emerald-600 bg-emerald-50">
                                € FACTURABLE
                              </div>
                              {bookingCodes.filter(bc => bc.is_active && bc.is_billable).map(bc => (
                                <SelectItem key={bc.id} value={bc.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="font-mono text-[10px]">{bc.code}</span>
                                    <span className="text-xs truncate max-w-[100px]">{bc.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                              <div className="px-2 py-1 text-xs font-semibold text-slate-600 bg-slate-50 mt-1">
                                NON FACTURABLE
                              </div>
                              {bookingCodes.filter(bc => bc.is_active && !bc.is_billable).map(bc => (
                                <SelectItem key={bc.id} value={bc.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                    <span className="font-mono text-[10px]">{bc.code}</span>
                                    <span className="text-xs truncate max-w-[100px]">{bc.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {bookingCode && (
                            <div className="mt-0.5">
                              <BillableBadge isBillable={bookingCode.is_billable} size="sm" />
                            </div>
                          )}
                        </td>
                        
                        {/* Activity */}
                        <td className="p-1">
                          <Select 
                            value={row.activity_id} 
                            onValueChange={(v) => updateRowField(rowIndex, 'activity_id', v)}
                            disabled={row.isLocked}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Activité..." />
                            </SelectTrigger>
                            <SelectContent>
                              {activities.filter(a => a.is_active).map(a => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        
                        {/* Day columns */}
                        {weekDays.map((day, dayIndex) => {
                          const dateKey = day.toISOString().split('T')[0];
                          const dayData = row.days[dateKey] || {};
                          const isWeekend = dayIndex >= 5;
                          const isLocked = dayData.status === 'validated' || row.isLocked;
                          
                          return (
                            <td 
                              key={dayIndex} 
                              className={`p-1 text-center ${isWeekend ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                            >
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                value={dayData.hours || ''}
                                onChange={(e) => updateDayHours(rowIndex, dateKey, e.target.value)}
                                disabled={isLocked}
                                className={`h-8 w-14 text-center text-xs font-mono ${
                                  isLocked ? 'bg-muted' : ''
                                } ${dayData.hours > 0 ? 'font-bold' : ''}`}
                                placeholder="0"
                              />
                              {dayData.status && dayData.status !== 'draft' && (
                                <div className="mt-0.5">
                                  <StatusBadge status={dayData.status} />
                                </div>
                              )}
                            </td>
                          );
                        })}
                        
                        {/* Row total */}
                        <td className="p-1 text-center bg-accent/5">
                          <span className={`font-mono font-bold ${rowTotal > 0 ? 'text-accent' : 'text-muted-foreground'}`}>
                            {rowTotal.toFixed(1)}h
                          </span>
                        </td>
                        
                        {/* Delete */}
                        <td className="p-1">
                          {!row.isLocked && rows.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => deleteRow(rowIndex)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          )}
                          {row.isLocked && (
                            <Lock className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Totals row */}
                  <tr className="bg-muted/50 font-semibold">
                    <td colSpan={4} className="p-2 text-right text-sm">Total journalier</td>
                    {weekDays.map((day, dayIndex) => {
                      const dateKey = day.toISOString().split('T')[0];
                      const dayTotal = getDayTotal(dateKey);
                      const isWeekend = dayIndex >= 5;
                      
                      return (
                        <td 
                          key={dayIndex} 
                          className={`p-2 text-center ${isWeekend ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                        >
                          <span className={`font-mono ${dayTotal > 0 ? 'text-accent' : 'text-muted-foreground'}`}>
                            {dayTotal.toFixed(1)}h
                          </span>
                        </td>
                      );
                    })}
                    <td className="p-2 text-center bg-accent/10">
                      <span className="font-mono text-lg text-accent">{weekTotal.toFixed(1)}h</span>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span>Facturable: {billableTotal.toFixed(1)}h ({billablePercent.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-400"></div>
              <span>Non facturable: {(weekTotal - billableTotal).toFixed(1)}h</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveEntries} disabled={weekStatus === 'submitted'}>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
            <Button 
              onClick={submitWeek} 
              disabled={submitting || weekStatus === 'submitted' || weekTotal === 0}
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Envoi...' : 'Soumettre la semaine'}
            </Button>
          </div>
        </div>

        {/* Info Dialog */}
        <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Guide de saisie du temps</DialogTitle>
              <DialogDescription>
                Comprendre le système de booking POSÉIDON
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  Règle centrale
                </h4>
                <p className="text-muted-foreground">
                  Une heure est <strong>facturable</strong> si et seulement si la <strong>prestation (Booking Code)</strong> associée est facturable.
                  Le projet ne détermine pas la facturation.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Champs obligatoires</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li><strong>Projet</strong> - Sur quel projet travaillez-vous</li>
                  <li><strong>Discipline</strong> - Votre domaine (BIM, CALCUL, DESIGN...)</li>
                  <li><strong>Prestation</strong> - Type de travail (détermine la facturation)</li>
                  <li><strong>Activité</strong> - Tâche spécifique réalisée</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-emerald-600">Prestations facturables</h4>
                <div className="flex flex-wrap gap-1">
                  {bookingCodes.filter(bc => bc.is_billable).map(bc => (
                    <Badge key={bc.id} variant="outline" className="text-xs bg-emerald-50 text-emerald-700">
                      {bc.code}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-slate-600">Prestations non facturables</h4>
                <div className="flex flex-wrap gap-1">
                  {bookingCodes.filter(bc => !bc.is_billable).map(bc => (
                    <Badge key={bc.id} variant="outline" className="text-xs bg-slate-50 text-slate-600">
                      {bc.code}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                <h4 className="font-semibold mb-1 text-amber-700">Attention aux réunions</h4>
                <p className="text-xs text-amber-600">
                  • <strong>CLIENT MEETING</strong> = Facturable<br/>
                  • <strong>INTERNAL MEETING</strong> = Non facturable
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
