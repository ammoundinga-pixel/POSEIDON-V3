import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Archive, Briefcase, Calendar, Search, Users, AlertTriangle, MoreHorizontal, Pause, Play, CheckCircle2 } from 'lucide-react';
import { DISCIPLINES, formatDate } from '../lib/utils';

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmData, setDeleteConfirmData] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('');
  
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

  useEffect(() => {
    filterProjects();
  }, [projects, activeTab, searchTerm, clientFilter, disciplineFilter]);

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

  const filterProjects = () => {
    let filtered = projects;

    // Filter by status tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(p => p.status === activeTab);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by client
    if (clientFilter) {
      filtered = filtered.filter(p => p.client === clientFilter);
    }

    // Filter by discipline
    if (disciplineFilter) {
      filtered = filtered.filter(p => 
        p.disciplines && p.disciplines.includes(disciplineFilter)
      );
    }

    setFilteredProjects(filtered);
  };

  const getUniqueClients = () => {
    const clients = [...new Set(projects.map(p => p.client).filter(Boolean))];
    return clients.sort();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code) {
      toast.error('Nom et code du projet sont obligatoires');
      return;
    }

    try {
      if (editingProject) {
        await axios.put(`/projects/${editingProject.id}`, formData);
        toast.success('Projet modifié avec succès');
      } else {
        await axios.post('/projects', formData);
        toast.success('Projet créé avec succès');
      }
      
      setDialogOpen(false);
      setEditingProject(null);
      resetForm();
      fetchProjects();
    } catch (error) {
      console.error('Failed to save project', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description || '',
      client: project.client || '',
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      end_date: project.end_date ? project.end_date.split('T')[0] : '',
      budget_hours: project.budget_hours || '',
      status: project.status,
      disciplines: project.disciplines || []
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = async (project) => {
    try {
      // Check if project can be deleted
      const response = await axios.delete(`/projects/${project.id}`);
      
      if (response.data.can_delete === false) {
        // Project has time entries, show confirmation dialog
        setDeleteConfirmData({
          project,
          ...response.data
        });
        setDeleteDialogOpen(true);
      } else {
        // Project deleted successfully
        toast.success('Projet supprimé avec succès');
        fetchProjects();
      }
    } catch (error) {
      console.error('Failed to delete project', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleArchive = async (project) => {
    try {
      await axios.put(`/projects/${project.id}/archive`);
      toast.success('Projet archivé avec succès');
      setDeleteDialogOpen(false);
      setDeleteConfirmData(null);
      fetchProjects();
    } catch (error) {
      console.error('Failed to archive project', error);
      toast.error('Erreur lors de l\'archivage');
    }
  };

  const handleStatusChange = async (project, newStatus) => {
    try {
      await axios.put(`/projects/${project.id}`, { ...project, status: newStatus });
      toast.success(`Projet ${newStatus === 'paused' ? 'mis en pause' : newStatus === 'active' ? 'réactivé' : 'modifié'}`);
      fetchProjects();
    } catch (error) {
      console.error('Failed to update project status', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleForceDelete = async (project) => {
    try {
      await axios.delete(`/projects/${project.id}?force=true`);
      toast.success('Projet et saisies associées supprimés');
      setDeleteDialogOpen(false);
      setDeleteConfirmData(null);
      fetchProjects();
    } catch (error) {
      console.error('Failed to force delete project', error);
      toast.error('Erreur lors de la suppression forcée');
    }
  };

  const resetForm = () => {
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

  const getStatusBadge = (status) => {
    const variants = {
      active: 'default',
      planned: 'secondary',
      completed: 'outline',
      paused: 'destructive',
      archived: 'outline'
    };
    
    const labels = {
      active: 'Actif',
      planned: 'Planifié',
      completed: 'Terminé',
      paused: 'En pause',
      archived: 'Archivé'
    };
    
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getProjectCounts = () => {
    return {
      all: projects.length,
      active: projects.filter(p => p.status === 'active').length,
      planned: projects.filter(p => p.status === 'planned').length,
      completed: projects.filter(p => p.status === 'completed').length,
      paused: projects.filter(p => p.status === 'paused').length,
      archived: projects.filter(p => p.status === 'archived').length
    };
  };

  const counts = getProjectCounts();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Gestion des projets</h1>
            <p className="text-muted-foreground">Gérez vos projets par statut et équipe</p>
          </div>
          <Button onClick={() => { resetForm(); setEditingProject(null); setDialogOpen(true); }} data-testid="new-project-btn">
            <Plus className="mr-2 h-4 w-4" /> Nouveau projet
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Rechercher</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nom ou code du projet..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div>
                <Label>Client</Label>
                <Select value={clientFilter || 'all'} onValueChange={(val) => setClientFilter(val === 'all' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les clients</SelectItem>
                    {getUniqueClients().map(client => (
                      <SelectItem key={client} value={client}>{client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Discipline</Label>
                <Select value={disciplineFilter || 'all'} onValueChange={(val) => setDisciplineFilter(val === 'all' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les disciplines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les disciplines</SelectItem>
                    {DISCIPLINES.map(disc => (
                      <SelectItem key={disc.value} value={disc.value}>{disc.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs by Status */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">Tous ({counts.all})</TabsTrigger>
            <TabsTrigger value="active">Actifs ({counts.active})</TabsTrigger>
            <TabsTrigger value="planned">Planifiés ({counts.planned})</TabsTrigger>
            <TabsTrigger value="completed">Terminés ({counts.completed})</TabsTrigger>
            <TabsTrigger value="paused">En pause ({counts.paused})</TabsTrigger>
            <TabsTrigger value="archived">Archivés ({counts.archived})</TabsTrigger>
          </TabsList>

          {/* Projects Grid */}
          <div className="mt-6">
            {filteredProjects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun projet trouvé</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow" data-testid={`project-card-${project.code}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <CardDescription className="mt-1">
                            <code className="text-xs bg-secondary px-2 py-1 rounded">{project.code}</code>
                          </CardDescription>
                        </div>
                        {getStatusBadge(project.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {project.client && (
                          <div className="flex items-center text-sm">
                            <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{project.client}</span>
                          </div>
                        )}
                        
                        {project.start_date && (
                          <div className="flex items-center text-sm">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(project.start_date)}</span>
                            {project.end_date && <span className="mx-2">→</span>}
                            {project.end_date && <span>{formatDate(project.end_date)}</span>}
                          </div>
                        )}

                        {project.disciplines && project.disciplines.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {project.disciplines.map(disc => (
                              <Badge key={disc} variant="outline" className="text-xs">{disc}</Badge>
                            ))}
                          </div>
                        )}

                        {project.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                            {project.description}
                          </p>
                        )}

                        <div className="flex gap-2 mt-4 pt-4 border-t justify-between items-center">
                          <div className="text-xs text-muted-foreground">
                            {project.budget_hours && `Budget: ${project.budget_hours}h`}
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" data-testid={`project-menu-${project.code}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(project)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              {project.status === 'active' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(project, 'paused')}>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Mettre en pause
                                </DropdownMenuItem>
                              )}
                              
                              {project.status === 'paused' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(project, 'active')}>
                                  <Play className="mr-2 h-4 w-4" />
                                  Réactiver
                                </DropdownMenuItem>
                              )}
                              
                              {project.status === 'active' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(project, 'completed')}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Terminer
                                </DropdownMenuItem>
                              )}
                              
                              {project.status !== 'archived' && (
                                <DropdownMenuItem onClick={() => handleArchive(project)}>
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archiver
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(project)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Tabs>

        {/* Create/Edit Project Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Modifier le projet' : 'Nouveau projet'}</DialogTitle>
              <DialogDescription>
                {editingProject ? 'Modifiez les informations du projet' : 'Créez un nouveau projet pour votre bureau d\'études'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du projet *</Label>
                  <Input
                    id="name"
                    placeholder="Nom du projet"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Code projet *</Label>
                  <Input
                    id="code"
                    placeholder="Code unique du projet"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Input
                  id="client"
                  placeholder="Nom du client"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Description du projet"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Date de début *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Date de fin</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget_hours">Budget (heures)</Label>
                  <Input
                    id="budget_hours"
                    type="number"
                    placeholder="Budget en heures"
                    value={formData.budget_hours}
                    onChange={(e) => setFormData({ ...formData, budget_hours: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="planned">Planifié</SelectItem>
                      <SelectItem value="paused">En pause</SelectItem>
                      <SelectItem value="completed">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Disciplines</Label>
                <div className="flex flex-wrap gap-2">
                  {DISCIPLINES.map((discipline) => (
                    <Button
                      key={discipline.value}
                      type="button"
                      variant={formData.disciplines.includes(discipline.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleDiscipline(discipline.value)}
                    >
                      {discipline.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingProject ? 'Enregistrer' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Suppression du projet
              </DialogTitle>
              <DialogDescription>
                {deleteConfirmData && (
                  <div className="space-y-4 mt-4">
                    <p className="font-medium">{deleteConfirmData.message}</p>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Ce projet contient <strong>{deleteConfirmData.time_entries_count} saisie(s) de temps</strong>.
                      </p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-2">
                        L'archivage est recommandé pour préserver l'historique.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Que souhaitez-vous faire ?</p>
                      <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                        <li><strong>Archiver</strong> : Le projet reste visible dans l'onglet "Archivés" avec son historique</li>
                        <li><strong>Supprimer définitivement</strong> : Le projet ET toutes les saisies de temps seront supprimés</li>
                      </ul>
                    </div>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeleteConfirmData(null);
                }}
              >
                Annuler
              </Button>
              
              <Button
                variant="secondary"
                onClick={() => handleArchive(deleteConfirmData.project)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archiver (recommandé)
              </Button>
              
              <Button
                variant="destructive"
                onClick={() => handleForceDelete(deleteConfirmData.project)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer définitivement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
