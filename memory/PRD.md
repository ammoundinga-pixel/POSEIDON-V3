# POSÉIDON - Product Requirements Document

## Description
Application interne de suivi du temps, de présence et de pilotage des ressources pour un bureau d'études. Interface intuitive centrée sur un calendrier.

## Fonctionnalités Principales

### 1. Gouvernance des utilisateurs
- Création manuelle des utilisateurs
- 4 rôles : Super Admin, Admin, Manager, Employé
- Pas d'auto-inscription
- Réinitialisation de mot de passe par Super Admin

### 2. Hiérarchie & Organigramme
- Hiérarchie claire définissant la visibilité
- Organigramme d'entreprise/projet (à implémenter)

### 3. Calendrier central
- Vue journalière/hebdomadaire/mensuelle
- Affichage du type de présence, projets et heures

### 4. Saisie du temps
- Grille hebdomadaire pour saisir les heures
- Par Projet, Discipline, Activité, Type de prestation
- Statuts : brouillon, soumis, validé, rejeté
- **Règles métier (implémentées 2026-01-28)**:
  - Par défaut, une semaine est éditable
  - Verrouillage uniquement après validation Admin
  - États éditables: draft, submitted, rejected
  - États verrouillés: validated, admin-modified

### 5. Cascade des champs (implémentée 2026-01-28)
- Projet → Discipline → Activité → Prestation
- Disciplines filtrées selon le projet sélectionné
- Champs désactivés jusqu'à complétion de l'étape précédente

### 6. Référentiel d'activités
- Disciplines : STR, CVC, Électricité, BIM, Environnement, Management, Support
- Activités : APS, APD, Calcul, Dessin, EXE, Chantier, Coordination
- Types de prestation : Dessin, BIM, Calcul/Ingénierie, Consultation/Conseil, etc.

### 7. Tableaux de bord
- Dashboard personnalisé par rôle
- Graphiques (heures par projet, répartition par prestation)

## Stack Technique
- **Backend** : FastAPI, MongoDB (motor), Pydantic, JWT (python-jose)
- **Frontend** : React, axios, react-router-dom, recharts, react-big-calendar, TailwindCSS

## Credentials de test
- **Super Admin** : admin@poseidon.com / admin123
- **Employé** : ange@aclm.fr / Employee123!

---

## Statut des Fonctionnalités

### Implémenté ✅ (Mise à jour 2026-01-28)
- [x] Architecture FastAPI/React avec authentification JWT
- [x] Gestion des rôles (Super Admin, Admin, Manager, Employé)
- [x] Création/modification/suppression d'utilisateurs
- [x] Création/modification de projets avec disciplines associées
- [x] Saisie du temps (grille hebdomadaire) - **Bug critique corrigé**
- [x] Cascade des champs Projet → Discipline → Activité → Prestation
- [x] Règles de verrouillage (validated/admin-modified = verrouillé)
- [x] Enregistrement des saisies
- [x] Soumission des saisies pour validation (draft et rejected acceptés)
- [x] Validation/rejet des saisies par managers
- [x] Édition admin avec audit trail
- [x] Dashboard avec graphiques (noms de projets corrects)
- [x] Calendrier de présence
- [x] Gestion des équipes (backend)
- [x] Réinitialisation de mot de passe (Super Admin)

### Bugs corrigés (2026-01-28)
- [x] Employés ne voyaient pas les projets (appel /api/users bloquant)
- [x] Validation admin appelait mauvaise API
- [x] Dashboard affichait "Projet inconnu"

### En attente ⏳
- [ ] Onglets du calendrier (Mois, Jour, Semaine, Agenda)
- [ ] Filtres du dashboard (Discipline, Activité, Prestation)
- [ ] Page Planning complète
- [ ] Page Présence
- [ ] Vue "Mon organisation" pour employés
- [ ] Export CSV/Excel

---

## API Endpoints Clés

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/change-password` - Changement de mot de passe

### Saisie du temps
- `GET /api/time-entries` - Liste des saisies
- `POST /api/time-entries` - Créer une saisie
- `PUT /api/time-entries/{id}` - Modifier (si draft/submitted/rejected et non admin-modified)
- `POST /api/time-entries/submit` - Soumettre pour validation
- `POST /api/time-entries/validate` - Valider/rejeter (admin)
- `PUT /api/time-entries/{id}/admin-edit` - Édition admin avec audit

### Projets
- `GET /api/projects` - Liste des projets (avec disciplines)
- `POST /api/projects` - Créer un projet
- `PUT /api/projects/{id}/archive` - Archiver
