import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Network, Users, Plus, Edit, Trash2, UserPlus, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function OrganizationPage() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: '',
    member_ids: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/teams')
      ]);
      setUsers(usersRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTeam = async (e) => {
    e.preventDefault();
    try {
      if (editingTeam) {
        await axios.put(`/teams/${editingTeam.id}`, formData);
        toast.success('Équipe modifiée avec succès');
      } else {
        await axios.post('/teams', formData);
        toast.success('Équipe créée avec succès');
      }
      setTeamDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save team', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      manager_id: team.manager_id || '',
      member_ids: team.member_ids || []
    });
    setTeamDialogOpen(true);
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) return;
    
    try {
      await axios.delete(`/teams/${teamId}`);
      toast.success('Équipe supprimée');
      fetchData();
    } catch (error) {
      console.error('Failed to delete team', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setEditingTeam(null);
    setFormData({
      name: '',
      description: '',
      manager_id: '',
      member_ids: []
    });
  };

  const toggleMember = (userId) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...prev.member_ids, userId]
    }));
  };

  const getUsersByRole = (role) => {
    return users.filter(u => u.role === role);
  };

  const getManager = (managerId) => {
    return users.find(u => u.id === managerId);
  };

  const getTeamMembers = (memberIds) => {
    return users.filter(u => memberIds?.includes(u.id));
  };

  const getUserTeam = (userId) => {
    return teams.find(t => t.member_ids?.includes(userId));
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
      <div data-testid="organization-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Organigramme</h1>
            <p className="text-muted-foreground">Structure hiérarchique et équipes</p>
          </div>
          {(isSuperAdmin || isAdmin) && (
            <Dialog open={teamDialogOpen} onOpenChange={(open) => {
              setTeamDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button data-testid="create-team-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle équipe
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTeam ? 'Modifier l\'équipe' : 'Nouvelle équipe'}</DialogTitle>
                  <DialogDescription>
                    {editingTeam ? 'Modifiez les informations de l\'équipe' : 'Créez une nouvelle équipe'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitTeam} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de l'équipe</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      data-testid="team-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      data-testid="team-description-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager">Manager</Label>
                    <Select
                      value={formData.manager_id}
                      onValueChange={(value) => setFormData({...formData, manager_id: value})}
                    >
                      <SelectTrigger data-testid="team-manager-select">
                        <SelectValue placeholder="Sélectionner un manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {getUsersByRole('manager').map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.first_name} {u.last_name}
                          </SelectItem>
                        ))}
                        {getUsersByRole('admin').map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.first_name} {u.last_name} (Admin)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Membres de l'équipe</Label>
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                      {users.filter(u => u.role === 'employee' || u.role === 'manager').map(u => (
                        <div key={u.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`member-${u.id}`}
                            checked={formData.member_ids.includes(u.id)}
                            onChange={() => toggleMember(u.id)}
                            className="rounded"
                          />
                          <label htmlFor={`member-${u.id}`} className="flex-1 cursor-pointer">
                            {u.first_name} {u.last_name}
                            <span className="text-xs text-muted-foreground ml-2">({getRoleLabel(u.role)})</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setTeamDialogOpen(false)} className="flex-1">
                      Annuler
                    </Button>
                    <Button type="submit" className="flex-1" data-testid="save-team-button">
                      {editingTeam ? 'Modifier' : 'Créer'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Hierarchy Tree */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Hiérarchie de l'organisation
            </CardTitle>
            <CardDescription>Structure hiérarchique complète</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Super Admins */}
            <div className="space-y-2">
              <div className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Super Administrateurs
              </div>
              <div className="space-y-2 pl-4 border-l-2 border-purple-500">
                {getUsersByRole('super_admin').map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {u.first_name[0]}{u.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{u.first_name} {u.last_name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    <Badge className={getRoleBadgeColor(u.role)}>
                      {getRoleLabel(u.role)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Admins */}
            <div className="space-y-2">
              <div className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ChevronRight className="h-4 w-4" />
                Administrateurs
              </div>
              <div className="space-y-2 pl-8 border-l-2 border-blue-500">
                {getUsersByRole('admin').map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {u.first_name[0]}{u.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{u.first_name} {u.last_name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    <Badge className={getRoleBadgeColor(u.role)}>
                      {getRoleLabel(u.role)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Managers */}
            <div className="space-y-2">
              <div className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ChevronRight className="h-4 w-4" />
                Managers
              </div>
              <div className="space-y-2 pl-12 border-l-2 border-green-500">
                {getUsersByRole('manager').map(u => {
                  const team = getUserTeam(u.id);
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold">
                        {u.first_name[0]}{u.last_name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{u.first_name} {u.last_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.email}
                          {team && <span className="ml-2">• Équipe: {team.name}</span>}
                        </div>
                      </div>
                      <Badge className={getRoleBadgeColor(u.role)}>
                        {getRoleLabel(u.role)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teams */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map(team => {
            const manager = getManager(team.manager_id);
            const members = getTeamMembers(team.member_ids);
            
            return (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent/10 rounded-lg">
                        <Users className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <CardDescription>{team.description}</CardDescription>
                      </div>
                    </div>
                    {(isSuperAdmin || isAdmin) && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditTeam(team)}
                          data-testid={`edit-team-${team.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTeam(team.id)}
                          data-testid={`delete-team-${team.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {manager && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Manager</p>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center text-white text-sm font-semibold">
                          {manager.first_name[0]}{manager.last_name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{manager.first_name} {manager.last_name}</div>
                          <div className="text-xs text-muted-foreground">{manager.email}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Membres ({members.length})</p>
                    <div className="space-y-1">
                      {members.map(member => (
                        <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center text-xs font-semibold">
                            {member.first_name[0]}{member.last_name[0]}
                          </div>
                          <div className="text-sm">{member.first_name} {member.last_name}</div>
                        </div>
                      ))}
                      {members.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Aucun membre</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {teams.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Aucune équipe</p>
              <p className="text-sm text-muted-foreground mb-4">Créez votre première équipe pour commencer</p>
              {(isSuperAdmin || isAdmin) && (
                <Button onClick={() => setTeamDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une équipe
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
