import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/fr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from '../lib/axios';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { formatDateTime } from '../lib/utils';

moment.locale('fr');
const localizer = momentLocalizer(moment);

const DISCIPLINE_COLORS = {
  'STR': '#3B82F6',
  'CVC': '#10B981',
  'Électricité': '#F59E0B',
  'BIM': '#8B5CF6',
  'Environnement': '#10B981',
  'Management': '#6366F1',
  'Support': '#64748B'
};

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [projects, setProjects] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [entriesRes, projectsRes] = await Promise.all([
        axios.get('/time-entries'),
        axios.get('/projects')
      ]);

      const projectMap = {};
      projectsRes.data.forEach(p => {
        projectMap[p.id] = p;
      });
      setProjects(projectMap);
      setTimeEntries(entriesRes.data);

      const calendarEvents = entriesRes.data.map(entry => ({
        id: entry.id,
        title: `${projectMap[entry.project_id]?.name || 'Projet'} - ${entry.hours}h`,
        start: new Date(entry.date),
        end: new Date(entry.date),
        resource: entry,
        color: DISCIPLINE_COLORS[entry.discipline] || '#3B82F6'
      }));

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to fetch calendar data', error);
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'validated':
        return 'default';
      case 'submitted':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'validated':
        return 'Validé';
      case 'submitted':
        return 'Soumis';
      case 'rejected':
        return 'Rejeté';
      default:
        return 'Brouillon';
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
      <div data-testid="calendar-page" className="space-y-6">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Calendrier</h1>
          <p className="text-muted-foreground">Vue d'ensemble de vos activités</p>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-6" style={{ height: 'calc(100vh - 240px)' }}>
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            messages={{
              next: 'Suivant',
              previous: 'Précédent',
              today: "Aujourd'hui",
              month: 'Mois',
              week: 'Semaine',
              day: 'Jour',
              agenda: 'Agenda',
              date: 'Date',
              time: 'Heure',
              event: 'Événement',
              noEventsInRange: 'Aucun événement dans cette période'
            }}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          {Object.entries(DISCIPLINE_COLORS).map(([discipline, color]) => (
            <div key={discipline} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: color }}></div>
              <span className="text-sm font-medium">{discipline}</span>
            </div>
          ))}
        </div>

        {/* Event Detail Dialog */}
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent data-testid="event-detail-dialog">
            <DialogHeader>
              <DialogTitle>Détail de l'activité</DialogTitle>
              <DialogDescription>{formatDateTime(selectedEvent?.start)}</DialogDescription>
            </DialogHeader>
            {selectedEvent?.resource && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Projet</p>
                  <p className="text-base font-semibold">{projects[selectedEvent.resource.project_id]?.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Discipline</p>
                    <Badge variant="outline">{selectedEvent.resource.discipline}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Activité</p>
                    <Badge variant="outline">{selectedEvent.resource.activity}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type de prestation</p>
                  <p className="text-base">{selectedEvent.resource.service_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Heures</p>
                  <p className="text-2xl font-heading font-bold">{selectedEvent.resource.hours}h</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Statut</p>
                  <Badge variant={getStatusBadgeVariant(selectedEvent.resource.status)}>
                    {getStatusLabel(selectedEvent.resource.status)}
                  </Badge>
                </div>
                {selectedEvent.resource.task_description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm">{selectedEvent.resource.task_description}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}