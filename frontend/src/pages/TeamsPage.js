import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Users, Plus, Edit, Trash2, UserCheck, Building } from 'lucide-react';

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', manager_id: '', member_ids: [] });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamsRes, usersRes] = await Promise.all([
        axios.get('/teams'),
        axios.get('/users')
      ]);
      setTeams(teamsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getEligibleManagers = () => users.filter(u => ['manager', 'admin', 'super_admin'].includes(u.role));

  const openCreateDialog = () => {
    setEditingTeam(null);
    setFormData({ name: '', description: '', manager_id: '', member_ids: [] });
    setDialogOpen(true);
  };

  const openEditDialog = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name || '',
      description: team.description || '',
      manager_id: team.manager_id || '',
      member_ids: team.member_ids || []
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('Nom obligatoire'); return; }
    if (!formData.manager_id) { toast.error('Manager obligatoire'); return; }

    try {
      if (editingTeam) {
        await axios.put(`/teams/${editingTeam.id}`, formData);
        toast.success('Équipe modifiée');
      } else {
        await axios.post('/teams', formData);
        toast.success('Équipe créée');
      }
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (teamId) => {
    if (!window.confirm('Supprimer cette équipe ?')) return;
    try {
      await axios.delete(`/teams/${teamId}`);
      toast.success('Équipe supprimée');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleMember = (userId) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...prev.member_ids, userId]
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="teams-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">Équipes</h1>
            <p className="text-muted-foreground">Gestion des équipes et affectations</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle équipe
          </Button>
        </div>

        {teams.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Building className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune équipe</h3>
              <p className="text-muted-foreground mb-4">Créez votre première équipe</p>
              <Button onClick={openCreateDialog}>Créer une équipe</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => {
              const manager = users.find(u => u.id === team.manager_id);
              const members = users.filter(u => team.member_ids?.includes(u.id));
              return (
                <Card key={team.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(team)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(team.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {team.description && <CardDescription>{team.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Manager</Label>
                      {manager ? (
                        <div className="flex items-center gap-2 mt-1">
                          <UserCheck className="h-4 w-4 text-accent" />
                          <span className="text-sm font-medium">{manager.first_name} {manager.last_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-amber-600">Non assigné</span>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Membres ({members.length})</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {members.slice(0, 5).map(m => (
                          <Badge key={m.id} variant="secondary" className="text-xs">
                            {m.first_name} {m.last_name?.[0]}.
                          </Badge>
                        ))}
                        {members.length > 5 && <Badge variant="outline">+{members.length - 5}</Badge>}
                        {members.length === 0 && <span className="text-xs text-muted-foreground">Aucun membre</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTeam ? 'Modifier l\'équipe' : 'Nouvelle équipe'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
              <div>
                <Label>Manager *</Label>
                <Select value={formData.manager_id} onValueChange={(v) => setFormData({...formData, manager_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {getEligibleManagers().map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Membres ({formData.member_ids.length})</Label>
                <div className="border rounded-lg max-h-40 overflow-y-auto mt-1">
                  {users.filter(u => u.id !== formData.manager_id).map(u => (
                    <div 
                      key={u.id}
                      className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-secondary ${formData.member_ids.includes(u.id) ? 'bg-accent/10' : ''}`}
                      onClick={() => toggleMember(u.id)}
                    >
                      <input type="checkbox" checked={formData.member_ids.includes(u.id)} readOnly className="rounded" />
                      <span className="text-sm">{u.first_name} {u.last_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSave}>{editingTeam ? 'Enregistrer' : 'Créer'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
