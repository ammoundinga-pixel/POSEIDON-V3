import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

export default function ProfilePage() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    const result = await changePassword(oldPassword, newPassword);

    if (result.success) {
      toast.success('Mot de passe modifié avec succès');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div data-testid="profile-page" className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Profil</h1>
          <p className="text-muted-foreground">Gérez vos informations personnelles</p>
        </div>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
            <CardDescription>Vos informations de compte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Prénom</Label>
                <p className="text-lg font-medium">{user?.first_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Nom</Label>
                <p className="text-lg font-medium">{user?.last_name}</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-lg font-medium">{user?.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Rôle</Label>
              <p className="text-lg font-medium capitalize">{user?.role.replace('_', ' ')}</p>
            </div>
            {user?.department && (
              <div>
                <Label className="text-muted-foreground">Département</Label>
                <p className="text-lg font-medium">{user.department}</p>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Capacité journalière</Label>
              <p className="text-lg font-medium">{user?.capacity_hours_per_day}h</p>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Changer le mot de passe
            </CardTitle>
            <CardDescription>Modifiez votre mot de passe</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old-password">Mot de passe actuel</Label>
                <Input
                  id="old-password"
                  data-testid="old-password-input"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  data-testid="new-password-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
                <Input
                  id="confirm-password"
                  data-testid="confirm-password-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                data-testid="change-password-button"
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Modification...' : 'Modifier le mot de passe'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}