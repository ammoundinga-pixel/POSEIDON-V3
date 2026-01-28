import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Briefcase, Calendar } from 'lucide-react';
import { DISCIPLINES, formatDate } from '../lib/utils';

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    client: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget_hours: '',
    status: 'active',
    disciplines: []
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects', error);
      toast.error('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        budget_hours: formData.budget_hours ? parseFloat(formData.budget_hours) : null
      };

      if (editingProject) {
        await axios.put(`/projects/${editingProject.id}`, payload);
        toast.success('Projet modifié avec succès');
      } else {
        await axios.post('/projects', payload);
        toast.success('Projet créé avec succès');
      }
      setDialogOpen(false);
      resetForm();
      fetchProjects();
    } catch (error) {
      console.error('Failed to save project', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description || '',
      client: project.client || '',
      start_date: new Date(project.start_date).toISOString().split('T')[0],
      end_date: project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '',
      budget_hours: project.budget_hours || '',
      status: project.status,
      disciplines: project.disciplines || []
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      client: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      budget_hours: '',
      status: 'active',
      disciplines: []
    });
  };

  const toggleDiscipline = (discipline) => {
    setFormData(prev => ({
      ...prev,
      disciplines: prev.disciplines.includes(discipline)
        ? prev.disciplines.filter(d => d !== discipline)
        : [...prev.disciplines, discipline]
    }));
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'active': return 'default';
      case 'planned': return 'secondary';
      case 'on_hold': return 'outline';
      case 'completed': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'planned': return 'Planifié';
      case 'on_hold': return 'En pause';
      case 'completed': return 'Terminé';
      default: return status;
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
      <div data-testid="project-management-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Gestion des projets</h1>
            <p className="text-muted-foreground">Créer et gérer les projets</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button data-testid="create-project-button">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau projet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Modifier le projet' : 'Nouveau projet'}</DialogTitle>
                <DialogDescription>
                  {editingProject ? 'Modifiez les informations du projet' : 'Créez un nouveau projet'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du projet</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      data-testid="project-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Code projet</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      required
                      data-testid="project-code-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Input
                    id="client"
                    value={formData.client}
                    onChange={(e) => setFormData({...formData, client: e.target.value})}
                    data-testid="project-client-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    data-testid="project-description-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Date de début</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      required
                      data-testid="project-start-date-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">Date de fin</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      data-testid="project-end-date-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget (heures)</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={formData.budget_hours}
                      onChange={(e) => setFormData({...formData, budget_hours: e.target.value})}
                      data-testid="project-budget-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Statut</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger data-testid="project-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planifié</SelectItem>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="on_hold">En pause</SelectItem>
                        <SelectItem value="completed">Terminé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Disciplines</Label>
                  <div className="flex flex-wrap gap-2">
                    {DISCIPLINES.map(d => (
                      <Button
                        key={d.value}
                        type="button"
                        variant={formData.disciplines.includes(d.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleDiscipline(d.value)}
                        data-testid={`discipline-${d.value}`}
                      >
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button type="submit" className="flex-1" data-testid="save-project-button">
                    {editingProject ? 'Modifier' : 'Créer'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <Briefcase className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription className="font-mono text-xs">{project.code}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(project)}
                    data-testid={`edit-project-${project.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Badge variant={getStatusBadgeVariant(project.status)}>
                    {getStatusLabel(project.status)}
                  </Badge>
                </div>
                {project.client && (
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="text-sm font-medium">{project.client}</p>
                  </div>
                )}
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(project.start_date)}
                  {project.end_date && ` - ${formatDate(project.end_date)}`}
                </div>
                {project.budget_hours && (
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="text-sm font-mono font-medium">{project.budget_hours}h</p>
                  </div>
                )}
                {project.disciplines && project.disciplines.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.disciplines.map(d => (
                      <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {projects.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Aucun projet</p>
              <p className="text-sm text-muted-foreground mb-4">Créez votre premier projet pour commencer</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un projet
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}