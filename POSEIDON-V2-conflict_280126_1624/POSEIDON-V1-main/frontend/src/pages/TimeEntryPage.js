import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, Save, Send, Trash2 } from 'lucide-react';
import { DISCIPLINES, ACTIVITIES, SERVICE_TYPES, DAY_TYPES, getWeekDates, formatDate } from '../lib/utils';

export default function TimeEntryPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dates = getWeekDates(currentDate);
    setWeekDates(dates);
    fetchProjects();
    fetchTimeEntries(dates[0], dates[6]);
  }, [currentDate]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects', error);
    }
  };

  const fetchTimeEntries = async (startDate, endDate) => {
    try {
      const response = await axios.get('/time-entries', {
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }
      });
      
      // Group entries by project+discipline+activity+service_type
      const groupedEntries = {};
      response.data.forEach(entry => {
        const key = `${entry.project_id}-${entry.discipline}-${entry.activity}-${entry.service_type}`;
        if (!groupedEntries[key]) {
          groupedEntries[key] = {
            id: key,
            project_id: entry.project_id,
            discipline: entry.discipline,
            activity: entry.activity,
            service_type: entry.service_type,
            task_description: entry.task_description,
            day_type: entry.day_type,
            status: entry.status,
            hours: {},
            isNew: false,
            entryIds: []
          };
        }
        
        // Add hours for this date
        const dateStr = entry.date.split('T')[0];
        groupedEntries[key].hours[dateStr] = entry.hours;
        groupedEntries[key].entryIds.push(entry.id);
      });
      
      setTimeEntries(Object.values(groupedEntries));
    } catch (error) {
      console.error('Failed to fetch time entries', error);
    }
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

  const addRow = () => {
    const newEntry = {
      id: `temp-${Date.now()}`,
      project_id: '',
      discipline: '',
      activity: '',
      service_type: '',
      task_description: '',
      hours: {},
      isNew: true
    };
    setTimeEntries([...timeEntries, newEntry]);
  };

  const updateEntry = (entryId, field, value) => {
    setTimeEntries(entries =>
      entries.map(entry =>
        entry.id === entryId ? { ...entry, [field]: value } : entry
      )
    );
  };

  const updateHours = (entryId, dateStr, hours) => {
    setTimeEntries(entries =>
      entries.map(entry => {
        if (entry.id === entryId) {
          return {
            ...entry,
            hours: {
              ...entry.hours,
              [dateStr]: hours
            }
          };
        }
        return entry;
      })
    );
  };

  const saveEntry = async (entry) => {
    try {
      // Validation
      if (!entry.project_id || !entry.discipline || !entry.activity || !entry.service_type) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      // Check if there are hours to save
      const hasHours = Object.values(entry.hours || {}).some(h => h && parseFloat(h) > 0);
      if (!hasHours) {
        toast.error('Veuillez saisir au moins une heure');
        return;
      }

      setLoading(true);
      
      // Save each day's hours as separate entries
      const promises = [];
      Object.entries(entry.hours).forEach(([dateStr, hours]) => {
        if (hours && parseFloat(hours) > 0) {
          const payload = {
            project_id: entry.project_id,
            date: dateStr + 'T00:00:00Z',
            discipline: entry.discipline,
            activity: entry.activity,
            service_type: entry.service_type,
            task_description: entry.task_description || '',
            hours: parseFloat(hours),
            day_type: entry.day_type || 'présentiel'
          };

          promises.push(axios.post('/time-entries', payload));
        }
      });

      await Promise.all(promises);
      toast.success(`${promises.length} saisie(s) enregistrée(s)`);
      
      // Refresh the time entries
      fetchTimeEntries(weekDates[0], weekDates[6]);
    } catch (error) {
      console.error('Failed to save entry', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (entryId) => {
    try {
      const entry = timeEntries.find(e => e.id === entryId);
      
      // If it's a new entry (not saved yet), just remove it from the list
      if (entry?.isNew || entryId.startsWith('temp-')) {
        setTimeEntries(entries => entries.filter(e => e.id !== entryId));
        toast.success('Ligne supprimée');
        return;
      }
      
      // If it has saved entries, delete all of them
      if (entry?.entryIds && entry.entryIds.length > 0) {
        await Promise.all(entry.entryIds.map(id => axios.delete(`/time-entries/${id}`)));
        toast.success(`${entry.entryIds.length} entrée(s) supprimée(s)`);
      }
      
      setTimeEntries(entries => entries.filter(e => e.id !== entryId));
    } catch (error) {
      console.error('Failed to delete entry', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const submitEntries = async () => {
    try {
      // Refresh data first to get the latest entries
      await fetchTimeEntries(weekDates[0], weekDates[6]);
      
      // Get all draft entries from the current week
      const draftEntries = await axios.get('/time-entries', {
        params: {
          start_date: weekDates[0].toISOString(),
          end_date: weekDates[6].toISOString(),
          status: 'draft'
        }
      });

      const draftIds = draftEntries.data.map(e => e.id);

      if (draftIds.length === 0) {
        toast.info('Aucune saisie à soumettre. Enregistrez vos heures d\'abord.');
        return;
      }

      await axios.post('/time-entries/submit', draftIds);
      toast.success(`${draftIds.length} saisie(s) soumise(s) pour validation`);
      fetchTimeEntries(weekDates[0], weekDates[6]);
    } catch (error) {
      console.error('Failed to submit entries', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la soumission');
    }
  };

  const getTotalHoursForDay = (dateStr) => {
    return timeEntries.reduce((total, entry) => {
      const hours = entry.hours?.[dateStr] || 0;
      return total + parseFloat(hours || 0);
    }, 0);
  };

  return (
    <DashboardLayout>
      <div data-testid="time-entry-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Saisie du temps</h1>
            <p className="text-muted-foreground">Grille hebdomadaire de saisie</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={previousWeek} data-testid="previous-week-button">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm font-medium px-4">
              Semaine du {formatDate(weekDates[0])} au {formatDate(weekDates[6])}
            </span>
            <Button variant="outline" size="icon" onClick={nextWeek} data-testid="next-week-button">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Grille de saisie</CardTitle>
                <CardDescription>Saisissez vos heures par projet et par jour</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={addRow} variant="outline" data-testid="add-row-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une ligne
                </Button>
                <Button onClick={submitEntries} data-testid="submit-entries-button">
                  <Send className="h-4 w-4 mr-2" />
                  Soumettre
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 text-xs font-semibold uppercase tracking-wider">Projet</th>
                    <th className="text-left p-2 text-xs font-semibold uppercase tracking-wider">Discipline</th>
                    <th className="text-left p-2 text-xs font-semibold uppercase tracking-wider">Activité</th>
                    <th className="text-left p-2 text-xs font-semibold uppercase tracking-wider">Prestation</th>
                    {weekDates.slice(0, 5).map((date, idx) => (
                      <th key={idx} className="text-center p-2 text-xs font-semibold uppercase tracking-wider">
                        <div>{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                        <div className="text-muted-foreground font-normal">{date.getDate()}</div>
                      </th>
                    ))}
                    <th className="text-center p-2 text-xs font-semibold uppercase tracking-wider">Total</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map((entry, idx) => {
                    const rowTotal = Object.values(entry.hours || {}).reduce((sum, h) => sum + parseFloat(h || 0), 0);
                    return (
                      <tr key={entry.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-2">
                          <Select
                            value={entry.project_id}
                            onValueChange={(value) => updateEntry(entry.id, 'project_id', value)}
                          >
                            <SelectTrigger className="w-full" data-testid={`project-select-${idx}`}>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Select
                            value={entry.discipline}
                            onValueChange={(value) => updateEntry(entry.id, 'discipline', value)}
                          >
                            <SelectTrigger className="w-full" data-testid={`discipline-select-${idx}`}>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {DISCIPLINES.map(d => (
                                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Select
                            value={entry.activity}
                            onValueChange={(value) => updateEntry(entry.id, 'activity', value)}
                          >
                            <SelectTrigger className="w-full" data-testid={`activity-select-${idx}`}>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {ACTIVITIES.map(a => (
                                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Select
                            value={entry.service_type}
                            onValueChange={(value) => updateEntry(entry.id, 'service_type', value)}
                          >
                            <SelectTrigger className="w-full" data-testid={`service-type-select-${idx}`}>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {SERVICE_TYPES.map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        {weekDates.slice(0, 5).map((date) => {
                          const dateStr = date.toISOString().split('T')[0];
                          return (
                            <td key={dateStr} className="p-2">
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                className="w-20 text-center font-mono"
                                value={entry.hours?.[dateStr] || ''}
                                onChange={(e) => updateHours(entry.id, dateStr, e.target.value)}
                                data-testid={`hours-input-${idx}-${dateStr}`}
                              />
                            </td>
                          );
                        })}
                        <td className="p-2 text-center font-mono font-bold">{rowTotal.toFixed(1)}h</td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => saveEntry(entry)}
                              disabled={loading}
                              data-testid={`save-entry-${idx}`}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteEntry(entry.id)}
                              data-testid={`delete-entry-${idx}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td colSpan="4" className="p-2 text-sm font-semibold">Total par jour</td>
                    {weekDates.slice(0, 5).map((date) => {
                      const dateStr = date.toISOString().split('T')[0];
                      const total = getTotalHoursForDay(dateStr);
                      return (
                        <td key={dateStr} className="p-2 text-center font-mono font-bold">
                          {total.toFixed(1)}h
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-mono font-bold">
                      {weekDates.slice(0, 5).reduce((sum, date) => {
                        const dateStr = date.toISOString().split('T')[0];
                        return sum + getTotalHoursForDay(dateStr);
                      }, 0).toFixed(1)}h
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}