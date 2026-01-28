import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Tags, Plus, Edit, DollarSign, Layers, ListTodo } from 'lucide-react';

export default function AdminBookingCodesPage() {
  const [activeTab, setActiveTab] = useState('booking-codes');
  const [bookingCodes, setBookingCodes] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bcRes, discRes, actRes] = await Promise.all([
        axios.get('/booking-codes'),
        axios.get('/disciplines'),
        axios.get('/activities')
      ]);
      setBookingCodes(bcRes.data || []);
      setDisciplines(discRes.data || []);
      setActivities(actRes.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (type, item = null) => {
    setEditingItem(item ? { ...item, type } : { type });
    if (item) {
      setFormData({ ...item });
    } else {
      setFormData(type === 'booking-codes' 
        ? { code: '', name: '', is_billable: false, color: '#3B82F6' }
        : type === 'disciplines'
        ? { code: '', name: '', color: '#3B82F6' }
        : { code: '', name: '' }
      );
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const type = editingItem?.type || activeTab;
    const endpoint = type === 'booking-codes' ? '/booking-codes' : type === 'disciplines' ? '/disciplines' : '/activities';
    
    try {
      if (editingItem?.id) {
        await axios.put(`${endpoint}/${editingItem.id}`, formData);
        toast.success('Modifié avec succès');
      } else {
        await axios.post(endpoint, formData);
        toast.success('Créé avec succès');
      }
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
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

  const billableCount = bookingCodes.filter(bc => bc.is_billable).length;
  const nonBillableCount = bookingCodes.length - billableCount;

  return (
    <DashboardLayout>
      <div data-testid="admin-booking-codes-page" className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold">Configuration métier</h1>
          <p className="text-muted-foreground">Gérer les prestations, disciplines et activités</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="booking-codes" className="gap-2">
              <Tags className="h-4 w-4" /> Prestations ({bookingCodes.length})
            </TabsTrigger>
            <TabsTrigger value="disciplines" className="gap-2">
              <Layers className="h-4 w-4" /> Disciplines ({disciplines.length})
            </TabsTrigger>
            <TabsTrigger value="activities" className="gap-2">
              <ListTodo className="h-4 w-4" /> Activités ({activities.length})
            </TabsTrigger>
          </TabsList>

          {/* Booking Codes (Prestations) */}
          <TabsContent value="booking-codes" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-4 text-sm">
                <Badge className="bg-emerald-100 text-emerald-700">€ Facturables: {billableCount}</Badge>
                <Badge className="bg-slate-100 text-slate-600">Non facturables: {nonBillableCount}</Badge>
              </div>
              <Button onClick={() => openDialog('booking-codes')}>
                <Plus className="h-4 w-4 mr-2" /> Ajouter
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Billable */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                    <DollarSign className="h-4 w-4" /> Facturables
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {bookingCodes.filter(bc => bc.is_billable).map(bc => (
                    <div key={bc.id} className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded">
                      <div>
                        <span className="font-mono text-xs text-emerald-600">{bc.code}</span>
                        <span className="ml-2 text-sm">{bc.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => openDialog('booking-codes', bc)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
              
              {/* Non-Billable */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-600">Non facturables</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {bookingCodes.filter(bc => !bc.is_billable).map(bc => (
                    <div key={bc.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                      <div>
                        <span className="font-mono text-xs text-slate-500">{bc.code}</span>
                        <span className="ml-2 text-sm">{bc.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => openDialog('booking-codes', bc)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Disciplines */}
          <TabsContent value="disciplines" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openDialog('disciplines')}>
                <Plus className="h-4 w-4 mr-2" /> Ajouter
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {disciplines.map(d => (
                <Card key={d.id} className="cursor-pointer hover:border-accent" onClick={() => openDialog('disciplines', d)}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: d.color }}></div>
                    <div>
                      <div className="font-mono text-sm font-bold">{d.code}</div>
                      <div className="text-xs text-muted-foreground">{d.name}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Activities */}
          <TabsContent value="activities" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openDialog('activities')}>
                <Plus className="h-4 w-4 mr-2" /> Ajouter
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {activities.map(a => (
                <Card key={a.id} className="cursor-pointer hover:border-accent" onClick={() => openDialog('activities', a)}>
                  <CardContent className="p-4">
                    <div className="font-mono text-xs text-muted-foreground">{a.code}</div>
                    <div className="text-sm font-medium">{a.name}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem?.id ? 'Modifier' : 'Ajouter'} {
                  editingItem?.type === 'booking-codes' ? 'une prestation' :
                  editingItem?.type === 'disciplines' ? 'une discipline' : 'une activité'
                }
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Code *</Label>
                <Input 
                  value={formData.code || ''} 
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="Ex: BIM-COORD"
                />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input 
                  value={formData.name || ''} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: BIM Coordination"
                />
              </div>
              {(editingItem?.type === 'booking-codes' || editingItem?.type === 'disciplines') && (
                <div>
                  <Label>Couleur</Label>
                  <Input 
                    type="color" 
                    value={formData.color || '#3B82F6'} 
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="h-10 w-20"
                  />
                </div>
              )}
              {editingItem?.type === 'booking-codes' && (
                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div>
                    <Label>Facturable</Label>
                    <p className="text-xs text-muted-foreground">Cette prestation génère de la facturation client</p>
                  </div>
                  <Switch 
                    checked={formData.is_billable || false}
                    onCheckedChange={(v) => setFormData({...formData, is_billable: v})}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSave}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
