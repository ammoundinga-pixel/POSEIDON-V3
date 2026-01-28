import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Plus, Edit, Trash2, Users, ChevronLeft, ChevronRight, Briefcase, Clock } from 'lucide-react';
import { formatDate } from '../lib/utils';

export default function PlanningPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [view, setView] = useState('week'); // 'week' or 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [formData, setFormData] = useState({
    user_id: '',
    project_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    allocation_percentage: 100,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [currentDate, view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignmentsRes, usersRes, projectsRes] = await Promise.all([
        axios.get('/planning/assignments', {
          params: {
            start_date: getStartDate().toISOString().split('T')[0],
            end_date: getEndDate().toISOString().split('T')[0]
          }
        }),
        axios.get('/users'),
        axios.get('/projects')
      ]);
      
      setAssignments(assignmentsRes.data);
      setUsers(usersRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Failed to fetch planning data', error);
      toast.error('Erreur lors du chargement du planning');
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const date = new Date(currentDate);
    if (view === 'week') {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
      return new Date(date.setDate(diff));
    } else {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }
  };

  const getEndDate = () => {
    const date = new Date(currentDate);
    if (view === 'week') {
      const start = getStartDate();
      return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000); // +6 days
    } else {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }
  };

  const getDaysInRange = () => {
    const start = getStartDate();
    const end = getEndDate();
    const days = [];
    const current = new Date(start);
    
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const previousPeriod = () => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const nextPeriod = () => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.user_id || !formData.start_date) {
      toast.error('Utilisateur et date de début sont obligatoires');
      return;
    }

    try {
      if (editingAssignment) {
        await axios.put(`/planning/assignments/${editingAssignment.id}`, formData);
        toast.success('Affectation modifiée avec succès');
      } else {
        await axios.post('/planning/assignments', formData);
        toast.success('Affectation créée avec succès');
      }
      
      setDialogOpen(false);
      setEditingAssignment(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save assignment', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      user_id: assignment.user_id,
      project_id: assignment.project_id || '',
      start_date: assignment.start_date ? assignment.start_date.split('T')[0] : '',
      end_date: assignment.end_date ? assignment.end_date.split('T')[0] : '',
      allocation_percentage: assignment.allocation_percentage || 100,
      notes: assignment.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (assignmentId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette affectation ?')) {
      return;
    }

    try {
      await axios.delete(`/planning/assignments/${assignmentId}`);
      toast.success('Affectation supprimée');
      fetchData();
    } catch (error) {
      console.error('Failed to delete assignment', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      project_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      allocation_percentage: 100,
      notes: ''
    });
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : userId;
  };

  const getProjectName = (projectId) => {
    if (!projectId) return 'Aucun projet';
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : projectId;
  };

  const getAssignmentsForUserAndDate = (userId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    return assignments.filter(a => {
      const start = new Date(a.start_date).toISOString().split('T')[0];
      const end = a.end_date ? new Date(a.end_date).toISOString().split('T')[0] : '9999-12-31';
      return a.user_id === userId && dateStr >= start && dateStr <= end;
    });
  };

  const canManageUser = (targetUserId) => {
    if (user.role === 'super_admin') return true;
    if (user.role === 'admin') {
      const targetUser = users.find(u => u.id === targetUserId);
      return targetUser && ['employee', 'manager'].includes(targetUser.role);
    }
    if (user.role === 'manager') {
      const targetUser = users.find(u => u.id === targetUserId);
      return targetUser && targetUser.role === 'employee';
    }
    return false;
  };

  const getManageableUsers = () => {
    if (user.role === 'super_admin') return users;
    if (user.role === 'admin') {
      return users.filter(u => ['employee', 'manager'].includes(u.role));
    }
    if (user.role === 'manager') {
      return users.filter(u => u.role === 'employee');
    }
    return [];
  };

  const days = getDaysInRange();
  const manageableUsers = getManageableUsers();

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
            <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Planning des affectations</h1>
            <p className="text-muted-foreground">
              Planifiez les tâches et projets pour votre équipe
            </p>
          </div>
          <Button onClick={() => { resetForm(); setEditingAssignment(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle affectation
          </Button>
        </div>

        {/* View Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Tabs value={view} onValueChange={setView}>
                  <TabsList>
                    <TabsTrigger value="week">Semaine</TabsTrigger>
                    <TabsTrigger value="month">Mois</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={previousPeriod}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[200px] text-center">
                    {view === 'week' 
                      ? `${formatDate(getStartDate())} - ${formatDate(getEndDate())}`
                      : currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                    }
                  </span>
                  <Button variant="outline" size="sm" onClick={nextPeriod}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                    Aujourd'hui
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{manageableUsers.length} utilisateur(s)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planning Grid */}
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2 bg-secondary text-left sticky left-0 z-10 min-w-[150px]">
                      Utilisateur
                    </th>
                    {days.map(day => (
                      <th key={day.toISOString()} className="border p-2 bg-secondary text-center min-w-[120px]">
                        <div className="text-xs font-normal text-muted-foreground">
                          {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                        </div>
                        <div className="text-sm font-medium">
                          {day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {manageableUsers.map(usr => (
                    <tr key={usr.id} className="hover:bg-secondary/50">
                      <td className="border p-2 sticky left-0 bg-background z-10">
                        <div>
                          <div className="font-medium text-sm">
                            {usr.first_name} {usr.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">{usr.role}</div>
                        </div>
                      </td>
                      {days.map(day => {
                        const dayAssignments = getAssignmentsForUserAndDate(usr.id, day);
                        return (
                          <td key={day.toISOString()} className="border p-1">
                            {dayAssignments.length > 0 ? (
                              <div className="space-y-1">
                                {dayAssignments.map(assignment => (
                                  <div
                                    key={assignment.id}
                                    className="text-xs bg-accent/10 border border-accent/20 rounded p-1 cursor-pointer hover:bg-accent/20"
                                    onClick={() => handleEdit(assignment)}
                                  >
                                    <div className="font-medium truncate" title={getProjectName(assignment.project_id)}>
                                      {getProjectName(assignment.project_id)}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {assignment.allocation_percentage}%
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center text-muted-foreground opacity-30">-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* List View */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des affectations</CardTitle>
            <CardDescription>
              {assignments.length} affectation(s) pour la période sélectionnée
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assignments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune affectation pour cette période
                </p>
              ) : (
                assignments.map(assignment => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{getUserName(assignment.user_id)}</span>
                        <span className="text-muted-foreground">→</span>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{getProjectName(assignment.project_id)}</span>
                        <Badge variant="outline">{assignment.allocation_percentage}%</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground ml-7">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{formatDate(assignment.start_date)}</span>
                        {assignment.end_date && (
                          <>
                            <span>→</span>
                            <span>{formatDate(assignment.end_date)}</span>
                          </>
                        )}
                      </div>
                      {assignment.notes && (
                        <p className="text-sm text-muted-foreground mt-1 ml-7">{assignment.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(assignment)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(assignment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Assignment Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAssignment ? 'Modifier l\'affectation' : 'Nouvelle affectation'}
              </DialogTitle>
              <DialogDescription>
                Affectez un utilisateur à un projet pour une période donnée
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user_id">Utilisateur *</Label>
                <Select
                  value={formData.user_id}
                  onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                >
                  <SelectTrigger id="user_id">
                    <SelectValue placeholder="Sélectionner un utilisateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {manageableUsers.map(usr => (
                      <SelectItem key={usr.id} value={usr.id}>
                        {usr.first_name} {usr.last_name} ({usr.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_id">Projet</Label>
                <Select
                  value={formData.project_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger id="project_id">
                    <SelectValue placeholder="Sélectionner un projet (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun projet</SelectItem>
                    {projects.filter(p => p.status !== 'archived').map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} ({project.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              <div className="space-y-2">
                <Label htmlFor="allocation_percentage">
                  Allocation (%) - Actuellement: {formData.allocation_percentage}%
                </Label>
                <Input
                  id="allocation_percentage"
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={formData.allocation_percentage}
                  onChange={(e) => setFormData({ ...formData, allocation_percentage: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  placeholder="Notes ou commentaires..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  {editingAssignment ? 'Enregistrer' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
