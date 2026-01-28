import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import axios from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Download, Printer, Filter, X } from 'lucide-react';

// Presence codes with colors
const PRESENCE_CODES = {
  'M': { label: 'Monaco', color: '#3B82F6', textColor: '#FFFFFF' },
  'N': { label: 'Nice', color: '#10B981', textColor: '#FFFFFF' },
  'P': { label: 'Paris', color: '#8B5CF6', textColor: '#FFFFFF' },
  'T': { label: 'Télétravail', color: '#F59E0B', textColor: '#000000' },
  'C': { label: 'Client', color: '#EC4899', textColor: '#FFFFFF' },
  'D': { label: 'Déplacement', color: '#14B8A6', textColor: '#FFFFFF' },
  'E': { label: 'École', color: '#6366F1', textColor: '#FFFFFF' },
  'A': { label: 'Congés', color: '#EF4444', textColor: '#FFFFFF' },
  'F': { label: 'Férié', color: '#64748B', textColor: '#FFFFFF' },
  'W': { label: 'Week-end', color: '#CBD5E1', textColor: '#475569' },
  '½': { label: 'Demi-journée', color: '#FBBF24', textColor: '#000000' }
};

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function EmployeeCalendarPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [users, setUsers] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [teams, setTeams] = useState([]);
  
  // Filters
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterTeam, setFilterTeam] = useState('all');
  
  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [selectedCode, setSelectedCode] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [comment, setComment] = useState('');
  
  // Multi-select (drag)
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectedCells, setSelectedCells] = useState([]);
  const tableRef = useRef(null);

  const isAdmin = ['super_admin', 'admin', 'manager'].includes(user?.role);

  // Get days in month
  const getDaysInMonth = useCallback(() => {
    const date = new Date(currentYear, currentMonth - 1, 1);
    const days = [];
    while (date.getMonth() === currentMonth - 1) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentYear, currentMonth]);

  // Get week number
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // Group days by week
  const groupByWeek = useCallback((days) => {
    const weeks = {};
    days.forEach(day => {
      const weekNum = getWeekNumber(day);
      if (!weeks[weekNum]) {
        weeks[weekNum] = [];
      }
      weeks[weekNum].push(day);
    });
    return weeks;
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { year: currentYear, month: currentMonth };
      if (filterDepartment !== 'all') params.department = filterDepartment;
      if (filterTeam !== 'all') params.team_id = filterTeam;
      
      const response = await axios.get('/employee-calendar/month', { params });
      setUsers(response.data.users || []);
      setCalendarData(response.data.calendar_data || {});
      setHolidays(response.data.holidays || []);
      setTeams(response.data.teams || []);
    } catch (error) {
      console.error('Failed to fetch calendar data', error);
      toast.error('Erreur lors du chargement du calendrier');
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, filterDepartment, filterTeam]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigation
  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Get cell data
  const getCellData = (userId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    const userData = calendarData[userId];
    if (userData && userData[dateStr]) {
      return userData[dateStr];
    }
    
    // Auto-fill weekends
    if (date.getDay() === 0 || date.getDay() === 6) {
      return { code: 'W', auto: true };
    }
    
    // Auto-fill holidays
    if (holidays.includes(dateStr)) {
      return { code: 'F', auto: true };
    }
    
    return null;
  };

  // Handle cell click
  const handleCellClick = (userId, date, event) => {
    if (!isAdmin && userId !== user?.id) return;
    
    const dateStr = date.toISOString().split('T')[0];
    const cellData = getCellData(userId, date);
    
    // Don't allow editing auto-generated W/F cells
    if (cellData?.auto && (cellData.code === 'W' || cellData.code === 'F')) {
      return;
    }
    
    setEditingCell({ userId, date: dateStr, existing: cellData });
    setSelectedCode(cellData?.code || '');
    setIsHalfDay(cellData?.half_day || false);
    setComment(cellData?.comment || '');
    setEditDialogOpen(true);
  };

  // Handle drag selection
  const handleMouseDown = (userId, date, event) => {
    if (!isAdmin) return;
    event.preventDefault();
    
    const dateStr = date.toISOString().split('T')[0];
    const cellData = getCellData(userId, date);
    if (cellData?.auto) return;
    
    setIsSelecting(true);
    setSelectionStart({ userId, date: dateStr });
    setSelectedCells([{ userId, date: dateStr }]);
  };

  const handleMouseEnter = (userId, date) => {
    if (!isSelecting || !selectionStart) return;
    if (userId !== selectionStart.userId) return; // Only horizontal selection
    
    const dateStr = date.toISOString().split('T')[0];
    const startDate = new Date(selectionStart.date);
    const currentDate = new Date(dateStr);
    
    const cells = [];
    const start = startDate < currentDate ? startDate : currentDate;
    const end = startDate > currentDate ? startDate : currentDate;
    
    const current = new Date(start);
    while (current <= end) {
      const cellDate = current.toISOString().split('T')[0];
      const cellData = getCellData(userId, current);
      if (!cellData?.auto) {
        cells.push({ userId, date: cellDate });
      }
      current.setDate(current.getDate() + 1);
    }
    
    setSelectedCells(cells);
  };

  const handleMouseUp = () => {
    if (isSelecting && selectedCells.length > 1) {
      // Open bulk edit dialog
      setEditingCell(null);
      setSelectedCode('');
      setIsHalfDay(false);
      setComment('');
      setEditDialogOpen(true);
    }
    setIsSelecting(false);
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [isSelecting, selectedCells]);

  // Save entry
  const handleSave = async () => {
    if (!selectedCode) {
      toast.error('Veuillez sélectionner un code');
      return;
    }
    
    try {
      if (selectedCells.length > 1) {
        // Bulk save
        await axios.post('/employee-calendar/bulk-entry', {
          user_id: selectedCells[0].userId,
          dates: selectedCells.map(c => c.date),
          code: selectedCode,
          half_day: isHalfDay,
          comment
        });
        toast.success(`${selectedCells.length} jours mis à jour`);
      } else if (editingCell) {
        // Single save
        await axios.post('/employee-calendar/entry', {
          user_id: editingCell.userId,
          date: editingCell.date,
          code: selectedCode,
          half_day: isHalfDay,
          comment
        });
        toast.success('Calendrier mis à jour');
      }
      
      setEditDialogOpen(false);
      setSelectedCells([]);
      setEditingCell(null);
      fetchData();
    } catch (error) {
      console.error('Failed to save', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  // Delete entry
  const handleDelete = async () => {
    if (!editingCell?.existing?.id) return;
    
    try {
      await axios.delete(`/employee-calendar/entry/${editingCell.existing.id}`);
      toast.success('Entrée supprimée');
      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const days = getDaysInMonth();
    let csv = 'Employé,' + days.map(d => d.getDate()).join(',') + '\n';
    
    users.forEach(u => {
      const row = [`${u.first_name} ${u.last_name}`];
      days.forEach(day => {
        const cellData = getCellData(u.id, day);
        row.push(cellData?.code || '');
      });
      csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `planning_${currentYear}_${currentMonth}.csv`;
    link.click();
    toast.success('Export CSV téléchargé');
  };

  const days = getDaysInMonth();
  const weekGroups = groupByWeek(days);
  
  // Get unique departments
  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];

  // Filter users by view mode
  const filteredUsers = user?.role === 'employee' 
    ? users.filter(u => u.id === user.id)
    : users;

  // Group users by department/team
  const groupedUsers = filteredUsers.reduce((acc, u) => {
    const group = u.department || 'Sans département';
    if (!acc[group]) acc[group] = [];
    acc[group].push(u);
    return acc;
  }, {});

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="employee-calendar-page" className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Planning des employés</h1>
            <p className="text-muted-foreground text-sm">Vue mensuelle type Excel RH</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Imprimer
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-card border rounded-lg p-3 overflow-x-auto">
          <div className="flex flex-wrap gap-2 min-w-max">
            {Object.entries(PRESENCE_CODES).map(([code, info]) => (
              <div
                key={code}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: info.color, color: info.textColor }}
              >
                <span className="font-bold">{code}</span>
                <span>{info.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border rounded-lg p-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Select value={String(currentMonth)} onValueChange={(v) => setCurrentMonth(parseInt(v))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_FR.map((month, idx) => (
                    <SelectItem key={idx} value={String(idx + 1)}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={String(currentYear)} onValueChange={(v) => setCurrentYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              
              {departments.length > 0 && (
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Département" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {teams.length > 0 && (
                <Select value={filterTeam} onValueChange={setFilterTeam}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Équipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        {/* Calendar Table */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="overflow-x-auto" ref={tableRef}>
            <table className="w-full border-collapse" style={{ minWidth: `${180 + days.length * 40}px` }}>
              <thead>
                {/* Day headers */}
                <tr className="bg-secondary/50">
                  <th className="sticky left-0 z-20 bg-secondary/50 border-r border-b p-2 min-w-[180px] text-left text-xs font-semibold">
                    Employé
                  </th>
                  {days.map(day => {
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const isHoliday = holidays.includes(day.toISOString().split('T')[0]);
                    const isToday = day.toDateString() === new Date().toDateString();
                    
                    return (
                      <th
                        key={day.toISOString()}
                        className={`border-b border-r p-1 text-center w-[40px] ${
                          isWeekend ? 'bg-slate-200 dark:bg-slate-700' : 
                          isHoliday ? 'bg-gray-200 dark:bg-gray-700' : ''
                        } ${isToday ? 'ring-2 ring-accent ring-inset' : ''}`}
                      >
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {DAYS_FR[day.getDay()]}
                        </div>
                        <div className="text-xs font-semibold">
                          {day.getDate()}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedUsers).map(([group, groupUsers]) => (
                  <React.Fragment key={group}>
                    {/* Group header */}
                    {Object.keys(groupedUsers).length > 1 && (
                      <tr className="bg-muted/30">
                        <td
                          colSpan={days.length + 1}
                          className="sticky left-0 z-10 p-2 text-xs font-semibold text-muted-foreground border-b"
                        >
                          {group}
                        </td>
                      </tr>
                    )}
                    {/* User rows */}
                    {groupUsers.map(usr => (
                      <tr key={usr.id} className="hover:bg-muted/20 group">
                        <td className="sticky left-0 z-10 bg-background group-hover:bg-muted/20 border-r border-b p-2 min-w-[180px]">
                          <div className="truncate">
                            <span className="font-medium text-sm">{usr.first_name} {usr.last_name}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {usr.department || usr.role}
                          </div>
                        </td>
                        {days.map(day => {
                          const cellData = getCellData(usr.id, day);
                          const codeInfo = cellData?.code ? PRESENCE_CODES[cellData.code] : null;
                          const isSelected = selectedCells.some(
                            c => c.userId === usr.id && c.date === day.toISOString().split('T')[0]
                          );
                          const canEdit = isAdmin || usr.id === user?.id;
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                          
                          return (
                            <td
                              key={day.toISOString()}
                              data-testid={`cell-${usr.id}-${day.getDate()}`}
                              className={`border-b border-r p-0 text-center cursor-pointer select-none transition-all w-[40px] h-[44px] ${
                                isSelected ? 'ring-2 ring-accent ring-inset' : ''
                              } ${!canEdit ? 'cursor-default' : 'hover:opacity-80'} ${
                                isWeekend && !cellData ? 'bg-slate-100 dark:bg-slate-800' : ''
                              }`}
                              style={{
                                backgroundColor: codeInfo?.color || undefined,
                              }}
                              onClick={(e) => handleCellClick(usr.id, day, e)}
                              onMouseDown={(e) => handleMouseDown(usr.id, day, e)}
                              onMouseEnter={() => handleMouseEnter(usr.id, day)}
                            >
                              {cellData?.code && (
                                <div
                                  className="font-bold text-sm h-full flex items-center justify-center"
                                  style={{ color: codeInfo?.textColor || '#000' }}
                                  title={`${codeInfo?.label || cellData.code}${cellData.half_day ? ' (½)' : ''}${cellData.comment ? ` - ${cellData.comment}` : ''}`}
                                >
                                  {cellData.code}
                                  {cellData.half_day && <span className="text-[8px] ml-0.5">½</span>}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats summary */}
        <div className="bg-card border rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
            {Object.entries(PRESENCE_CODES).slice(0, 6).map(([code, info]) => {
              const count = Object.values(calendarData).reduce((total, userData) => {
                return total + Object.values(userData).filter(e => e.code === code).length;
              }, 0);
              return (
                <div key={code} className="p-2 rounded" style={{ backgroundColor: `${info.color}20` }}>
                  <div className="text-2xl font-bold" style={{ color: info.color }}>{count}</div>
                  <div className="text-xs text-muted-foreground">{info.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedCells.length > 1 
                  ? `Modifier ${selectedCells.length} jours`
                  : editingCell 
                    ? `${editingCell.date}` 
                    : 'Modifier'
                }
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Code selection */}
              <div className="space-y-2">
                <Label>Code de présence</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(PRESENCE_CODES).filter(([code]) => !['W', 'F'].includes(code)).map(([code, info]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setSelectedCode(code)}
                      className={`p-2 rounded text-center font-bold transition-all ${
                        selectedCode === code ? 'ring-2 ring-offset-2 ring-accent scale-105' : 'hover:scale-105'
                      }`}
                      style={{ 
                        backgroundColor: info.color, 
                        color: info.textColor 
                      }}
                    >
                      <div className="text-lg">{code}</div>
                      <div className="text-[9px] font-normal truncate">{info.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Half day toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="halfDay"
                  checked={isHalfDay}
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="halfDay">Demi-journée</Label>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label htmlFor="comment">Commentaire (optionnel)</Label>
                <Input
                  id="comment"
                  placeholder="Ajouter un commentaire..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              {editingCell?.existing?.id && (
                <Button variant="destructive" onClick={handleDelete}>
                  <X className="h-4 w-4 mr-1" /> Supprimer
                </Button>
              )}
              <Button variant="outline" onClick={() => {
                setEditDialogOpen(false);
                setSelectedCells([]);
              }}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={!selectedCode}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
