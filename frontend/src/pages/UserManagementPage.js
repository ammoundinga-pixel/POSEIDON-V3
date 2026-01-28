import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, UserPlus, Key } from 'lucide-react';
import { ROLES } from '../lib/utils';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'employee',
    department: '',
    temporary_password: '',
    capacity_hours_per_day: 7.0
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`/users/${editingUser.id}`, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          department: formData.department,
          capacity_hours_per_day: parseFloat(formData.capacity_hours_per_day)
        });
        toast.success('Utilisateur modifié avec succès');
      } else {
        await axios.post('/users', formData);
        toast.success('Utilisateur créé avec succès');
      }
      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Failed to save user', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      department: user.department || '',
      temporary_password: '',
      capacity_hours_per_day: user.capacity_hours_per_day
    });
    setDialogOpen(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir désactiver cet utilisateur ?')) return;
    
    try {
      await axios.delete(`/users/${userId}`);
      toast.success('Utilisateur désactivé');
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleResetPassword = async (user) => {
    setSelectedUser(user);
    try {
      const response = await axios.post(`/users/${user.id}/reset-password`);
      setNewPassword(response.data.new_password);
      setPasswordDialogOpen(true);
      toast.success('Mot de passe régénéré');
      fetchUsers();
    } catch (error) {
      console.error('Failed to reset password', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la régénération');
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      role: 'employee',
      department: '',
      temporary_password: '',
      capacity_hours_per_day: 7.0
    });
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'super_admin': return 'default';
      case 'admin': return 'secondary';
      case 'manager': return 'outline';
      default: return 'outline';
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
      <div data-testid="user-management-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Gestion des utilisateurs</h1>
            <p className="text-muted-foreground">Créer et gérer les comptes utilisateurs</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button data-testid="create-user-button">
                <UserPlus className="h-4 w-4 mr-2" />
                Nouvel utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</DialogTitle>
                <DialogDescription>
                  {editingUser ? 'Modifiez les informations de l\'utilisateur' : 'Créez un nouveau compte utilisateur'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      data-testid="user-email-input"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Prénom</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      required
                      data-testid="user-firstname-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nom</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      required
                      data-testid="user-lastname-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rôle</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                    <SelectTrigger data-testid="user-role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Département</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    data-testid="user-department-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacité journalière (heures)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    step="0.5"
                    value={formData.capacity_hours_per_day}
                    onChange={(e) => setFormData({...formData, capacity_hours_per_day: e.target.value})}
                    data-testid="user-capacity-input"
                  />
                </div>
                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe temporaire</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.temporary_password}
                      onChange={(e) => setFormData({...formData, temporary_password: e.target.value})}
                      required
                      data-testid="user-password-input"
                    />
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button type="submit" className="flex-1" data-testid="save-user-button">
                    {editingUser ? 'Modifier' : 'Créer'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des utilisateurs</CardTitle>
            <CardDescription>{users.length} utilisateur(s) actif(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-sm font-semibold">Nom</th>
                    <th className="text-left p-3 text-sm font-semibold">Email</th>
                    <th className="text-left p-3 text-sm font-semibold">Rôle</th>
                    <th className="text-left p-3 text-sm font-semibold">Département</th>
                    <th className="text-left p-3 text-sm font-semibold">Capacité</th>
                    <th className="text-right p-3 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3">
                        <div className="font-medium">{user.first_name} {user.last_name}</div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{user.email}</td>
                      <td className="p-3">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {ROLES.find(r => r.value === user.role)?.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">{user.department || '-'}</td>
                      <td className="p-3 text-sm font-mono">{user.capacity_hours_per_day}h</td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                            data-testid={`edit-user-${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {/* Only super admin can reset passwords */}
                          {user.role !== 'super_admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResetPassword(user)}
                              data-testid={`reset-password-${user.id}`}
                              title="Régénérer le mot de passe"
                            >
                              <Key className="h-4 w-4 text-amber-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(user.id)}
                            data-testid={`delete-user-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Password Reset Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau mot de passe généré</DialogTitle>
              <DialogDescription>
                Mot de passe temporaire pour {selectedUser?.first_name} {selectedUser?.last_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm font-medium mb-2">Mot de passe temporaire :</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-white dark:bg-slate-900 rounded border text-lg font-mono font-bold">
                    {newPassword}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword);
                      toast.success('Mot de passe copié');
                    }}
                  >
                    Copier
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>⚠️ <strong>Important :</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Communiquez ce mot de passe à l'utilisateur de manière sécurisée</li>
                  <li>L'utilisateur devra le changer à sa prochaine connexion</li>
                  <li>Ce mot de passe ne sera plus affiché après la fermeture de cette fenêtre</li>
                </ul>
              </div>
            </div>
            <Button onClick={() => setPasswordDialogOpen(false)} className="w-full">
              J'ai noté le mot de passe
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}