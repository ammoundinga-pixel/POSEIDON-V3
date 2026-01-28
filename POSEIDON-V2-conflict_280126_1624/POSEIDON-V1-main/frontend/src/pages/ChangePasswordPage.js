import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Lock, AlertCircle } from 'lucide-react';

export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
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
      navigate('/dashboard');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Lock className="h-6 w-6 text-accent" />
            </div>
            <div>
              <CardTitle>Changement de mot de passe requis</CardTitle>
              <CardDescription className="mt-1">
                Pour des raisons de sécurité, vous devez changer votre mot de passe temporaire
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6" data-testid="change-password-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="old-password">Mot de passe temporaire</Label>
              <Input
                id="old-password"
                data-testid="old-password-input"
                type="password"
                placeholder="Entrez votre mot de passe temporaire"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                data-testid="new-password-input"
                type="password"
                placeholder="Minimum 6 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirm-password"
                data-testid="confirm-password-input"
                type="password"
                placeholder="Retapez votre nouveau mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <Button
              data-testid="submit-change-password-button"
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base font-medium"
            >
              {loading ? 'Changement en cours...' : 'Changer le mot de passe'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Critères de mot de passe :</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Au moins 6 caractères</li>
                <li>Combinez lettres et chiffres pour plus de sécurité</li>
              </ul>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
