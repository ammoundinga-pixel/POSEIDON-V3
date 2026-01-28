import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
  UserCheck
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

    // Build upward chain
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

const TeamCard = ({ team, users, isManager = false }) => {
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
          {isManager && (
            <Badge className="bg-green-100 text-green-700">
              Vous gérez cette équipe
            </Badge>
          )}
        </div>
        {team.description && (
          <CardDescription>{team.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manager */}
        {manager && (
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Manager de l'équipe</Label>
            <div className="mt-2 flex items-center gap-3 p-2 bg-secondary rounded-lg">
              <UserCheck className="h-5 w-5 text-accent" />
              <div>
                <p className="font-medium">{manager.first_name} {manager.last_name}</p>
                <p className="text-xs text-muted-foreground">{manager.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Members */}
        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            Membres ({teamMembers.length})
          </Label>
          <div className="mt-2 space-y-1">
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun membre</p>
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
            <div className="mt-4">
              <Button variant="outline" size="sm" className="border-yellow-600 text-yellow-700 hover:bg-yellow-100">
                <Mail className="mr-2 h-4 w-4" />
                Contacter l'administrateur
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function OrganizationPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, teamsRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/teams').catch(() => ({ data: [] })) // Teams might not exist yet
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

  // Find current user's manager
  const getMyManager = () => {
    // Direct manager
    if (user.manager_id) {
      return users.find(u => u.id === user.manager_id);
    }
    
    // Manager from team
    const myTeam = teams.find(t => t.member_ids?.includes(user.id));
    if (myTeam?.manager_id) {
      return users.find(u => u.id === myTeam.manager_id);
    }
    
    return null;
  };

  // Find current user's team
  const getMyTeam = () => {
    return teams.find(t => t.member_ids?.includes(user.id));
  };

  // Check if user manages any team
  const getTeamsIManage = () => {
    return teams.filter(t => t.manager_id === user.id);
  };

  const myManager = getMyManager();
  const myTeam = getMyTeam();
  const teamsIManage = getTeamsIManage();

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
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Organigramme</h1>
            <p className="text-muted-foreground">
              Structure organisationnelle et équipes
            </p>
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="teams">Équipes ({teams.length})</TabsTrigger>
              <TabsTrigger value="hierarchy">Hiérarchie</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Utilisateurs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{users.length}</div>
                    <p className="text-sm text-muted-foreground mt-1">Total</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Équipes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{teams.length}</div>
                    <p className="text-sm text-muted-foreground mt-1">Actives</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Managers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {users.filter(u => u.role === 'manager' || u.role === 'admin').length}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Total</p>
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
                            <span className="text-sm text-muted-foreground">{roleUsers.length} personne(s)</span>
                          </div>
                          <div className="space-y-1">
                            {roleUsers.map(u => (
                              <div key={u.id} className="text-sm p-2 hover:bg-secondary rounded">
                                {u.first_name} {u.last_name}
                              </div>
                            ))}
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
                <Card>
                  <CardContent className="py-12 text-center">
                    <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucune équipe créée</p>
                    <Button className="mt-4">
                      Créer une équipe
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map(team => (
                    <TeamCard key={team.id} team={team} users={users} />
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
                        
                        {/* Show their direct reports */}
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
        </div>
      </DashboardLayout>
    );
  }

  // Employee View - "Mon Organisation"
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Mon organisation</h1>
          <p className="text-muted-foreground">
            Votre manager, équipe et hiérarchie
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Manager */}
          {myManager ? (
            <UserCard 
              user={myManager} 
              title="Mon manager direct"
              showContact={true}
            />
          ) : (
            <NoManagerAssigned />
          )}

          {/* My Hierarchy */}
          <HierarchyChain currentUser={user} users={users} />
        </div>

        {/* My Team */}
        {myTeam && (
          <TeamCard team={myTeam} users={users} />
        )}

        {/* Teams I Manage (if manager) */}
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

        {/* No team assigned */}
        {!myTeam && myManager && (
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
