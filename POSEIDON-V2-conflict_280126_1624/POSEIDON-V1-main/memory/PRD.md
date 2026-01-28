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

### 5. Référentiel d'activités
- Disciplines : STR, CVC, Électricité, BIM, Environnement, Management, Support
- Activités : APS, APD, Calcul, Dessin, EXE, Chantier, Coordination
- Types de prestation : Dessin, BIM, Calcul/Ingénierie, Consultation/Conseil, etc.

### 6. Tableaux de bord
- Dashboard personnalisé par rôle
- Graphiques (heures par projet, répartition par prestation)

## Stack Technique
- **Backend** : FastAPI, MongoDB (motor), Pydantic, JWT (python-jose)
- **Frontend** : React, axios, react-router-dom, recharts, react-big-calendar, TailwindCSS

## Credentials de test
- **Super Admin** : admin@poseidon.com / admin123

---

## Statut des Fonctionnalités

### Implémenté ✅
- [x] Architecture FastAPI/React avec authentification JWT
- [x] Gestion des rôles (Super Admin, Admin, Manager, Employé)
- [x] Création/modification/suppression d'utilisateurs
- [x] Création/modification de projets
- [x] Saisie du temps (grille hebdomadaire)
- [x] Enregistrement des saisies
- [x] Soumission des saisies pour validation
- [x] Validation/rejet des saisies par managers
- [x] Dashboard avec graphiques
- [x] Calendrier de présence
- [x] Gestion des équipes (backend)
- [x] Réinitialisation de mot de passe (Super Admin)

### À implémenter 🔴
- [ ] Page d'organigramme (OrganizationPage.js - placeholder)
- [ ] Page d'activité en temps réel (ActivityPage.js - placeholder)
- [ ] Gestion des équipes (frontend complet)
- [ ] Détection de surcharge de travail
- [ ] Réaffectation des ressources
- [ ] Dashboards spécifiques Manager/Super Admin

---

## Changelog

### 2026-01-28
- **BUG FIX** : Corrigé le bug de saisie de temps qui empêchait l'enregistrement et la soumission
  - Problème : Comparaison de dates incorrecte entre le frontend (format ISO) et MongoDB
  - Solution : Normalisation des dates au format YYYY-MM-DD pour les comparaisons
- **REFACTOR** : Nettoyé le code dupliqué dans server.py
- **TEST** : Validé le flux complet E2E (ajouter -> remplir -> enregistrer -> soumettre)

---

## API Endpoints Principaux

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| /api/auth/login | POST | Connexion |
| /api/auth/me | GET | Utilisateur courant |
| /api/users | GET, POST | Liste/Création utilisateurs |
| /api/users/{id}/reset-password | POST | Reset mot de passe |
| /api/projects | GET, POST | Liste/Création projets |
| /api/time-entries | GET, POST | Saisies de temps |
| /api/time-entries/submit | POST | Soumettre les saisies |
| /api/time-entries/validate | POST | Valider/Rejeter |
| /api/teams | GET, POST | Gestion équipes |
| /api/dashboard/personal | GET | Dashboard personnel |
| /api/dashboard/team | GET | Dashboard équipe |
| /api/dashboard/global | GET | Dashboard global |

## Architecture des fichiers

```
/app/
├── backend/
│   ├── server.py          # FastAPI app principal
│   ├── server_routes.py   # Routes projets, time-entries, dashboard
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/         # Composants de pages
        ├── components/    # Composants réutilisables
        ├── contexts/      # Context React (Auth)
        └── lib/           # Utilitaires (axios, utils)
```
