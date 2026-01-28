import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Network, 
  Users, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Building,
  ChevronRight,
  AlertCircle,
  Shield,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  X,
  Check
} from 'lucide-react';

const getRoleBadge = (role) => {
  const configs = {
    super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700' },
    admin: { label: 'Admin', color: 'bg-blue-100 text-blue-700' },
    manager: { label: 'Manager', color: 'bg-green-100 text-green-700' },
    employee: { label: 'Employé', color: 'bg-gray-100 text-gray-700' }
  };
  const config = configs[role] || configs.employee;
  return (
    <Badge className={config.color}>
      {config.label}
    </Badge>
  );
};

const UserCard = ({ user, title, showContact = true }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
            <User className="h-8 w-8 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold">
              {user.first_name} {user.last_name}
            </h3>
            <div className="mt-1">
              {getRoleBadge(user.role)}
            </div>
          </div>
        </div>

        {showContact && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${user.email}`} className="text-accent hover:underline">
                {user.email}
              </a>
            </div>
            {user.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${user.phone}`} className="text-accent hover:underline">
                  {user.phone}
                </a>
              </div>
            )}
          </div>
        )}

        {showContact && (
          <Button className="w-full" variant="outline" asChild>
            <a href={`mailto:${user.email}`}>
              <Mail className="mr-2 h-4 w-4" />
              Contacter
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const HierarchyChain = ({ currentUser, users }) => {
  const buildChain = () => {
    const chain = [currentUser];
    let current = currentUser;

    while (current.manager_id) {
      const manager = users.find(u => u.id === current.manager_id);
      if (manager && !chain.find(c => c.id === manager.id)) {
        chain.push(manager);
        current = manager;
      } else {
        break;
      }
    }

    return chain;
  };

  const chain = buildChain();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Network className="h-5 w-5" />
          Ma hiérarchie
        </CardTitle>
        <CardDescription>
          Chaîne de management
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {chain.map((person, index) => (
            <div key={person.id}>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    {index === 0 ? (
                      <User className="h-6 w-6 text-accent" />
                    ) : (
                      <Shield className="h-6 w-6 text-accent" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {person.first_name} {person.last_name}
                    {index === 0 && <span className="text-muted-foreground ml-2">(Vous)</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleBadge(person.role)}
                    {index > 0 && (
                      <Badge variant="outline" className="text-xs">
                        N+{index}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {index < chain.length - 1 && (
                <div className="flex justify-center py-2">
                  <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const TeamCard = ({ team, users, isManager = false, onEdit, onDelete, canManage }) => {
  const teamMembers = users.filter(u => team.member_ids?.includes(u.id));
  const manager = users.find(u => u.id === team.manager_id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building className="h-5 w-5" />
            {team.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isManager && (
              <Badge className="bg-green-100 text-green-700">
                Vous gérez
              </Badge>
            )}
            {canManage && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(team)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(team.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        </div>
        {team.description && (
          <CardDescription>{team.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manager */}
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Manager de l'équipe</Label>
          {manager ? (
            <div className="mt-2 flex items-center gap-3 p-2 bg-secondary rounded-lg">
              <UserCheck className="h-5 w-5 text-accent" />
              <div>
                <p className="font-medium">{manager.first_name} {manager.last_name}</p>
                <p className="text-xs text-muted-foreground">{manager.email}</p>
              </div>
            </div>
          ) : (
            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Aucun manager assigné</span>
            </div>
          )}
        </div>

        {/* Members */}
        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            Membres ({teamMembers.length})
          </Label>
          <div className="mt-2 space-y-1">
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucun membre</p>
            ) : (
              teamMembers.map(member => (
                <div key={member.id} className="flex items-center gap-2 p-2 hover:bg-secondary rounded">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {member.first_name} {member.last_name}
                  </span>
                  <div className="ml-auto">
                    {getRoleBadge(member.role)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const NoManagerAssigned = () => {
  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-8 w-8 text-yellow-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
              Aucun manager assigné
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
              Vous n'avez pas encore de manager direct assigné. Contactez votre administrateur pour être rattaché à une équipe et un manager.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyTeamsState = ({ onCreateTeam }) => {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <Building className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucune équipe créée</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Les équipes permettent d'organiser vos collaborateurs et de définir les relations hiérarchiques pour la validation des heures.
        </p>
        <Button onClick={onCreateTeam} data-testid="create-team-cta">
          <Plus className="mr-2 h-4 w-4" />
          Créer une équipe
        </Button>
      </CardContent>
    </Card>
  );
};

export default function OrganizationPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Team dialog state
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    manager_id: '',
    member_ids: []
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, teamsRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/teams').catch(() => ({ data: [] }))
      ]);
      setUsers(usersRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Get eligible managers (manager or admin roles)
  const getEligibleManagers = () => {
    return users.filter(u => ['manager', 'admin', 'super_admin'].includes(u.role));
  };

  // Get eligible members (anyone except super_admin)
  const getEligibleMembers = () => {
    return users.filter(u => u.role !== 'super_admin');
  };

  // Open create dialog
  const handleOpenCreateDialog = () => {
    setEditingTeam(null);
    setTeamForm({
      name: '',
      description: '',
      manager_id: '',
      member_ids: []
    });
    setTeamDialogOpen(true);
  };

  // Open edit dialog
  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setTeamForm({
      name: team.name || '',
      description: team.description || '',
      manager_id: team.manager_id || '',
      member_ids: team.member_ids || []
    });
    setTeamDialogOpen(true);
  };

  // Save team
  const handleSaveTeam = async () => {
    // Validation
    if (!teamForm.name.trim()) {
      toast.error('Le nom de l\'équipe est obligatoire');
      return;
    }
    if (!teamForm.manager_id) {
      toast.error('Un manager doit être assigné à l\'équipe');
      return;
    }

    setSaving(true);
    try {
      const teamData = {
        name: teamForm.name.trim(),
        description: teamForm.description.trim(),
        manager_id: teamForm.manager_id,
        member_ids: teamForm.member_ids
      };

      let savedTeam;
      if (editingTeam) {
        // Update existing team
        const response = await axios.put(`/teams/${editingTeam.id}`, teamData);
        savedTeam = response.data;
        toast.success('Équipe modifiée avec succès');
      } else {
        // Create new team
        const response = await axios.post('/teams', teamData);
        savedTeam = response.data;
        toast.success('Équipe créée avec succès');
      }

      // Update member's team_id and manager_id
      const updatePromises = teamForm.member_ids.map(memberId => 
        axios.put(`/users/${memberId}`, {
          team_id: savedTeam.id,
          manager_id: teamForm.manager_id
        }).catch(err => {
          console.error(`Failed to update user ${memberId}`, err);
        })
      );
      await Promise.all(updatePromises);

      setTeamDialogOpen(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Failed to save team', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Delete team
  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette équipe ? Les membres ne seront pas supprimés.')) {
      return;
    }

    try {
      await axios.delete(`/teams/${teamId}`);
      toast.success('Équipe supprimée');
      fetchData();
    } catch (error) {
      console.error('Failed to delete team', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Toggle member selection
  const toggleMember = (userId) => {
    setTeamForm(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...prev.member_ids, userId]
    }));
  };

  // Find current user's manager
  const getMyManager = () => {
    if (user.manager_id) {
      return users.find(u => u.id === user.manager_id);
    }
    const myTeam = teams.find(t => t.member_ids?.includes(user.id));
    if (myTeam?.manager_id) {
      return users.find(u => u.id === myTeam.manager_id);
    }
    return null;
  };

  const getMyTeam = () => {
    return teams.find(t => t.member_ids?.includes(user.id) || t.manager_id === user.id);
  };

  const getTeamsIManage = () => {
    return teams.filter(t => t.manager_id === user.id);
  };

  const myManager = getMyManager();
  const myTeam = getMyTeam();
  const teamsIManage = getTeamsIManage();
  const canManageTeams = isAdmin || isSuperAdmin;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Admin/SuperAdmin View
  if (isAdmin || isSuperAdmin) {
    return (
      <DashboardLayout>
        <div data-testid="organization-page" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Organigramme</h1>
              <p className="text-muted-foreground">
                Structure organisationnelle et équipes
              </p>
            </div>
            <Button onClick={handleOpenCreateDialog} data-testid="create-team-btn">
              <Plus className="mr-2 h-4 w-4" />
              Créer une équipe
            </Button>
          </div>

          <Tabs defaultValue="teams">
            <TabsList>
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="teams">
                Équipes ({teams.length})
              </TabsTrigger>
              <TabsTrigger value="hierarchy">Hiérarchie</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Utilisateurs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{users.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Équipes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{teams.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Managers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {users.filter(u => u.role === 'manager').length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Sans équipe</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-600">
                      {users.filter(u => !u.team_id && u.role === 'employee').length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Organisation par rôle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['super_admin', 'admin', 'manager', 'employee'].map(role => {
                      const roleUsers = users.filter(u => u.role === role);
                      return roleUsers.length > 0 && (
                        <div key={role}>
                          <div className="flex items-center justify-between mb-2">
                            {getRoleBadge(role)}
                            <span className="text-sm text-muted-foreground">{roleUsers.length}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {roleUsers.map(u => {
                              const userTeam = teams.find(t => t.member_ids?.includes(u.id) || t.manager_id === u.id);
                              return (
                                <div key={u.id} className="text-sm p-2 bg-secondary rounded flex items-center justify-between">
                                  <span>{u.first_name} {u.last_name}</span>
                                  {userTeam && (
                                    <Badge variant="outline" className="text-xs">{userTeam.name}</Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="teams" className="space-y-6 mt-6">
              {teams.length === 0 ? (
                <EmptyTeamsState onCreateTeam={handleOpenCreateDialog} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map(team => (
                    <TeamCard 
                      key={team.id} 
                      team={team} 
                      users={users}
                      canManage={canManageTeams}
                      onEdit={handleEditTeam}
                      onDelete={handleDeleteTeam}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="hierarchy" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hiérarchie complète</CardTitle>
                  <CardDescription>
                    Vue de toute la structure organisationnelle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users.filter(u => u.role === 'super_admin').map(admin => (
                      <div key={admin.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <Shield className="h-6 w-6 text-purple-600" />
                          <div>
                            <p className="font-semibold">{admin.first_name} {admin.last_name}</p>
                            {getRoleBadge(admin.role)}
                          </div>
                        </div>
                        
                        {users.filter(u => u.manager_id === admin.id).length > 0 && (
                          <div className="ml-8 mt-2 space-y-2 border-l-2 border-accent pl-4">
                            {users.filter(u => u.manager_id === admin.id).map(report => (
                              <div key={report.id} className="flex items-center gap-2">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{report.first_name} {report.last_name}</span>
                                {getRoleBadge(report.role)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Create/Edit Team Dialog */}
          <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingTeam ? 'Modifier l\'équipe' : 'Créer une équipe'}
                </DialogTitle>
                <DialogDescription>
                  {editingTeam 
                    ? 'Modifiez les informations de l\'équipe'
                    : 'Créez une nouvelle équipe avec un manager et des membres'
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Team Name */}
                <div className="space-y-2">
                  <Label htmlFor="team-name">
                    Nom de l'équipe <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="team-name"
                    placeholder="Ex: Équipe Développement"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="team-name-input"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="team-description">Description</Label>
                  <Textarea
                    id="team-description"
                    placeholder="Description de l'équipe (optionnel)"
                    value={teamForm.description}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>

                {/* Manager Selection */}
                <div className="space-y-2">
                  <Label htmlFor="team-manager">
                    Manager <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={teamForm.manager_id} 
                    onValueChange={(value) => setTeamForm(prev => ({ ...prev, manager_id: value }))}
                  >
                    <SelectTrigger id="team-manager" data-testid="team-manager-select">
                      <SelectValue placeholder="Sélectionner un manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {getEligibleManagers().map(manager => (
                        <SelectItem key={manager.id} value={manager.id}>
                          <div className="flex items-center gap-2">
                            <span>{manager.first_name} {manager.last_name}</span>
                            <Badge variant="outline" className="text-xs ml-2">
                              {manager.role === 'super_admin' ? 'Super Admin' : 
                               manager.role === 'admin' ? 'Admin' : 'Manager'}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Seuls les utilisateurs avec le rôle Manager, Admin ou Super Admin peuvent gérer une équipe
                  </p>
                </div>

                {/* Members Selection */}
                <div className="space-y-2">
                  <Label>Membres ({teamForm.member_ids.length} sélectionné(s))</Label>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {getEligibleMembers().length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">Aucun membre disponible</p>
                    ) : (
                      getEligibleMembers()
                        .filter(u => u.id !== teamForm.manager_id) // Exclude manager from members
                        .map(member => {
                          const isSelected = teamForm.member_ids.includes(member.id);
                          return (
                            <div
                              key={member.id}
                              className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-secondary transition-colors ${
                                isSelected ? 'bg-accent/10' : ''
                              }`}
                              onClick={() => toggleMember(member.id)}
                            >
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                isSelected ? 'bg-accent border-accent' : 'border-border'
                              }`}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <span className="flex-1 text-sm">{member.first_name} {member.last_name}</span>
                              {getRoleBadge(member.role)}
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleSaveTeam} 
                  disabled={saving || !teamForm.name.trim() || !teamForm.manager_id}
                  data-testid="save-team-btn"
                >
                  {saving ? 'Enregistrement...' : (editingTeam ? 'Enregistrer' : 'Créer l\'équipe')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    );
  }

  // Employee View - "Mon Organisation"
  return (
    <DashboardLayout>
      <div data-testid="organization-page" className="space-y-6">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Mon organisation</h1>
          <p className="text-muted-foreground">
            Votre manager, équipe et hiérarchie
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {myManager ? (
            <UserCard 
              user={myManager} 
              title="Mon manager direct"
              showContact={true}
            />
          ) : (
            <NoManagerAssigned />
          )}

          <HierarchyChain currentUser={user} users={users} />
        </div>

        {myTeam && (
          <TeamCard team={myTeam} users={users} isManager={myTeam.manager_id === user.id} />
        )}

        {teamsIManage.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Équipes que je gère</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamsIManage.map(team => (
                <TeamCard key={team.id} team={team} users={users} isManager={true} />
              ))}
            </div>
          </div>
        )}

        {!myTeam && !teamsIManage.length && myManager && (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Vous n'êtes pas encore assigné à une équipe spécifique
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
