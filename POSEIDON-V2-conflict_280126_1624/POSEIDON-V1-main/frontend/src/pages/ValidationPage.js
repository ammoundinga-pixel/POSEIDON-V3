import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDate } from '../lib/utils';

export default function ValidationPage() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [projects, setProjects] = useState({});
  const [users, setUsers] = useState({});
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [entriesRes, projectsRes, usersRes] = await Promise.all([
        axios.get('/time-entries', { params: { status: 'submitted' } }),
        axios.get('/projects'),
        axios.get('/users')
      ]);

      const projectMap = {};
      projectsRes.data.forEach(p => {
        projectMap[p.id] = p;
      });

      const userMap = {};
      usersRes.data.forEach(u => {
        userMap[u.id] = u;
      });

      setProjects(projectMap);
      setUsers(userMap);
      setTimeEntries(entriesRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEntry = (entryId) => {
    setSelectedEntries(prev => 
      prev.includes(entryId)
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEntries.length === timeEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(timeEntries.map(e => e.id));
    }
  };

  const handleValidate = async () => {
    if (selectedEntries.length === 0) {
      toast.info('Aucune saisie sélectionnée');
      return;
    }

    try {
      await axios.post('/time-entries/validate', {
        time_entry_ids: selectedEntries,
        action: 'validate'
      });
      toast.success(`${selectedEntries.length} saisie(s) validée(s)`);
      setSelectedEntries([]);
      fetchData();
    } catch (error) {
      console.error('Failed to validate entries', error);
      toast.error('Erreur lors de la validation');
    }
  };

  const handleReject = async () => {
    if (selectedEntries.length === 0) {
      toast.info('Aucune saisie sélectionnée');
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error('Veuillez indiquer un motif de rejet');
      return;
    }

    try {
      await axios.post('/time-entries/validate', {
        time_entry_ids: selectedEntries,
        action: 'reject',
        rejection_reason: rejectionReason
      });
      toast.success(`${selectedEntries.length} saisie(s) rejetée(s)`);
      setSelectedEntries([]);
      setRejectionReason('');
      setRejectDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to reject entries', error);
      toast.error('Erreur lors du rejet');
    }
  };

  const groupByUser = () => {
    const grouped = {};
    timeEntries.forEach(entry => {
      if (!grouped[entry.user_id]) {
        grouped[entry.user_id] = [];
      }
      grouped[entry.user_id].push(entry);
    });
    return grouped;
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

  const groupedEntries = groupByUser();

  return (
    <DashboardLayout>
      <div data-testid="validation-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Validation des temps</h1>
            <p className="text-muted-foreground">{timeEntries.length} saisie(s) en attente de validation</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(true)}
              disabled={selectedEntries.length === 0}
              data-testid="reject-button"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeter ({selectedEntries.length})
            </Button>
            <Button
              onClick={handleValidate}
              disabled={selectedEntries.length === 0}
              data-testid="validate-button"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Valider ({selectedEntries.length})
            </Button>
          </div>
        </div>

        {timeEntries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Aucune saisie en attente</p>
              <p className="text-sm text-muted-foreground">Toutes les saisies ont été traitées</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedEntries).map(([userId, entries]) => {
              const user = users[userId];
              const userSelectedCount = entries.filter(e => selectedEntries.includes(e.id)).length;
              const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

              return (
                <Card key={userId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={userSelectedCount === entries.length}
                          onCheckedChange={() => {
                            const entryIds = entries.map(e => e.id);
                            if (userSelectedCount === entries.length) {
                              setSelectedEntries(prev => prev.filter(id => !entryIds.includes(id)));
                            } else {
                              setSelectedEntries(prev => [...new Set([...prev, ...entryIds])]);
                            }
                          }}
                          data-testid={`select-user-${userId}`}
                        />
                        <div>
                          <CardTitle className="text-lg">
                            {user?.first_name} {user?.last_name}
                          </CardTitle>
                          <CardDescription>
                            {entries.length} saisie(s) - {totalHours.toFixed(1)}h au total
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {userSelectedCount}/{entries.length} sélectionnée(s)
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border text-sm">
                            <th className="text-left p-2 w-12"></th>
                            <th className="text-left p-2">Date</th>
                            <th className="text-left p-2">Projet</th>
                            <th className="text-left p-2">Discipline</th>
                            <th className="text-left p-2">Activité</th>
                            <th className="text-left p-2">Type</th>
                            <th className="text-right p-2">Heures</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((entry) => (
                            <tr key={entry.id} className="border-b border-border hover:bg-muted/50">
                              <td className="p-2">
                                <Checkbox
                                  checked={selectedEntries.includes(entry.id)}
                                  onCheckedChange={() => handleSelectEntry(entry.id)}
                                  data-testid={`select-entry-${entry.id}`}
                                />
                              </td>
                              <td className="p-2 text-sm">{formatDate(entry.date)}</td>
                              <td className="p-2 text-sm font-medium">{projects[entry.project_id]?.name}</td>
                              <td className="p-2">
                                <Badge variant="outline" className="text-xs">{entry.discipline}</Badge>
                              </td>
                              <td className="p-2 text-sm">{entry.activity}</td>
                              <td className="p-2 text-sm text-muted-foreground">{entry.service_type}</td>
                              <td className="p-2 text-right font-mono font-medium">{entry.hours}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeter les saisies</DialogTitle>
              <DialogDescription>
                Indiquez le motif du rejet pour {selectedEntries.length} saisie(s)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="Motif du rejet (requis)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                data-testid="rejection-reason-input"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="flex-1">
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                className="flex-1"
                data-testid="confirm-reject-button"
              >
                Confirmer le rejet
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}