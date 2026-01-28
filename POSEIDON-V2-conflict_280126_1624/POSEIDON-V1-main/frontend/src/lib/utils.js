import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const DISCIPLINES = [
  { value: 'STR', label: 'STR' },
  { value: 'CVC', label: 'CVC' },
  { value: 'Électricité', label: 'Électricité' },
  { value: 'BIM', label: 'BIM' },
  { value: 'Environnement', label: 'Environnement' },
  { value: 'Management', label: 'Management' },
  { value: 'Support', label: 'Support' }
];

export const ACTIVITIES = [
  { value: 'APS', label: 'APS' },
  { value: 'APD', label: 'APD' },
  { value: 'Calcul', label: 'Calcul' },
  { value: 'Dessin', label: 'Dessin' },
  { value: 'EXE', label: 'EXE' },
  { value: 'Chantier', label: 'Chantier' },
  { value: 'Coordination', label: 'Coordination' }
];

export const SERVICE_TYPES = [
  { value: 'Dessin', label: 'Dessin' },
  { value: 'BIM', label: 'BIM' },
  { value: 'Calcul / Ingénierie', label: 'Calcul / Ingénierie' },
  { value: 'Consultation / Conseil', label: 'Consultation / Conseil' },
  { value: 'Coordination / Management', label: 'Coordination / Management' },
  { value: 'Support / Qualité', label: 'Support / Qualité' }
];

export const DAY_TYPES = [
  { value: 'présentiel', label: 'Présentiel' },
  { value: 'télétravail', label: 'Télétravail' },
  { value: 'déplacement', label: 'Déplacement' },
  { value: 'congé', label: 'Congé' },
  { value: 'absence', label: 'Absence' }
];

export const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employé' }
];

export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR');
};

export const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('fr-FR');
};

export const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
};

export const getWeekDates = (date) => {
  const curr = new Date(date);
  const first = curr.getDate() - curr.getDay() + 1;
  const dates = [];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(curr.setDate(first + i));
    dates.push(new Date(day));
  }
  
  return dates;
};