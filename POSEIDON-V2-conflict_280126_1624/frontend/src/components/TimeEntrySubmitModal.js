import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, Calendar, Briefcase } from 'lucide-react';

export const TimeEntrySubmitModal = ({ open, onClose, entries, projects, onConfirm, weekDates }) => {
  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : projectId;
  };

  const getTotalHours = () => {
    return entries.reduce((total, entry) => {
      const entryTotal = Object.values(entry.hours || {}).reduce((sum, h) => sum + parseFloat(h || 0), 0);
      return total + entryTotal;
    }, 0);
  };

  const getProjectSummary = () => {
    const summary = {};
    entries.forEach(entry => {
      const projectName = getProjectName(entry.project_id);
      if (!summary[projectName]) {
        summary[projectName] = {
          hours: 0,
          disciplines: new Set(),
          activities: new Set()
        };
      }
      const entryHours = Object.values(entry.hours || {}).reduce((sum, h) => sum + parseFloat(h || 0), 0);
      summary[projectName].hours += entryHours;
      summary[projectName].disciplines.add(entry.discipline);
      summary[projectName].activities.add(entry.activity);
    });
    return summary;
  };

  const projectSummary = getProjectSummary();
  const totalHours = getTotalHours();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Récapitulatif avant soumission
          </DialogTitle>
          <DialogDescription>
            Vérifiez vos saisies de temps avant de les soumettre pour validation.
            Semaine du {weekDates[0]?.toLocaleDateString('fr-FR')} au {weekDates[6]?.toLocaleDateString('fr-FR')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary by Project */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Résumé par projet
              </h3>
              <div className="space-y-3">
                {Object.entries(projectSummary).map(([projectName, data]) => (
                  <div key={projectName} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{projectName}</p>
                      <div className="flex gap-2 mt-1">
                        {Array.from(data.disciplines).map(d => (
                          <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-accent">{data.hours.toFixed(1)}h</p>
                      <p className="text-xs text-muted-foreground">
                        {Array.from(data.activities).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Entries */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4">Détail des saisies ({entries.length} ligne{entries.length > 1 ? 's' : ''})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {entries.map((entry, index) => {
                  const entryTotal = Object.values(entry.hours || {}).reduce((sum, h) => sum + parseFloat(h || 0), 0);
                  return (
                    <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div className="flex-1">
                        <span className="font-medium">{getProjectName(entry.project_id)}</span>
                        <span className="text-muted-foreground mx-2">•</span>
                        <span className="text-muted-foreground">{entry.discipline} / {entry.activity}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{entryTotal.toFixed(1)}h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Total */}
          <div className="bg-accent/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                <span className="text-lg font-semibold">Total de la semaine</span>
              </div>
              <span className="text-3xl font-bold text-accent">{totalHours.toFixed(1)}h</span>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Une fois soumises, vos saisies seront envoyées pour validation. 
              Vous ne pourrez plus les modifier sans l'aide d'un administrateur.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => { onConfirm(); onClose(); }} className="bg-accent">
            Confirmer et soumettre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
