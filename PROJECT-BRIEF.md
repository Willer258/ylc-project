# Young Christian Life (YLC) — Resume du Projet

## Nom du projet
**Young Christian Life** (anciennement "Terra Nomad" dans les designs Figma/Stitch)

## Description
Application evenementielle chretienne destinee a accompagner les participants tout au long de leur experience lors d'evenements. L'app inclut un jeu de chasse au tresor par QR codes, un programme d'aventure, et un systeme de feedback.

## Stack Technique
- **Frontend**: Next.js (App Router)
- **Backend/Data**: Firebase + Firestore
- **Design System**: "The Nomadic Editorial" — palette ocre/sauge/sable, glassmorphism, typographie Plus Jakarta Sans + Be Vietnam Pro

## Fichiers de Design (Stitch/Figma)
Les designs exportes sont dans `~/Downloads/` :
- `~/Downloads/home/` — Ecran d'accueil (hero, narrative, grille de themes)
- `~/Downloads/aventure/` — Programme/timeline de l'evenement (etapes completees, en cours, a venir)
- `~/Downloads/jeu/` — Ecran du jeu (phrase mystere, mots retrouves, esprit d'equipe)
- `~/Downloads/advice/` — Ecran feedback/avis (reviews, suggestions, votes)

Chaque dossier contient :
- `screen.png` — Capture d'ecran du design
- `DESIGN.md` — Specification complete du design system
- `code.html` — Code HTML + Tailwind pret a convertir en React (sauf `jeu/` qui n'a pas de code.html)

## Architecture des Routes

| Tab | Route | Fonction |
|-----|-------|----------|
| Accueil | `/` | Bienvenue, info evenement, guide IA |
| Aventure | `/aventure` | Programme/timeline de l'evenement |
| Jeu | `/jeu` | Jeu de phrase mystere + scan QR |
| Avis | `/avis` | Feedback des participants |

## Mecaniques du Jeu (Chasse au Tresor)

### Concept
- **Pas de systeme de points** — le jeu est base sur le **dechiffrement d'une phrase**
- Les participants scannent des QR codes disperses dans le lieu de l'evenement
- Chaque QR code revele un **mot** (ou partie de phrase)
- Objectif : collecter tous les mots et **reconstituer la phrase complete**

### Phrases — Gestion Admin
- **Panel admin** necessaire pour creer/gerer les phrases
- L'admin compose les phrases et les decoupe en mots
- Chaque mot est associe a un QR code
- **Attribution aleatoire** : quand une equipe s'inscrit, une phrase est assignee aleatoirement depuis le pool actif
- Differentes equipes cherchent differentes phrases (pas de copie possible)

### Modele de donnees envisage (Firestore)
```
phrases/ (collection)
  ├── phrase_1: { text: "Dieu est amour et sa grace suffit", words: [...] }
  └── phrase_2: { text: "La foi deplace les montagnes", words: [...] }

teams/ (collection)
  ├── team_1: { name: "Foret des Ombres", assignedPhrase: "phrase_2", wordsFound: ["foi", "les"], completed: false }
  └── team_2: { name: "...", assignedPhrase: "phrase_1", wordsFound: [...] }
```

## Authentification
- **Ultra simple** : pas de login/mot de passe
- Le participant scanne un QR code → arrive sur l'app → entre son nom
- L'appareil sert d'identifiant (UUID genere + stocke localement)
- Friction minimale pour un contexte d'evenement

## Assistant IA (Guide Contextuel)
- **Pas un chatbot interactif libre**
- C'est un **guide contextuel integre dans l'UI** qui explique chaque action
- Messages adaptatifs selon la progression de l'utilisateur :
  - Arrivee → message de bienvenue
  - En jeu → indices progressifs, encouragements
  - Bloque → aide progressive
  - Termine → felicitations + feedback
- Ton : chaleureux, motivant, dynamique, bienveillant
- **Ne jamais reveler directement les reponses du jeu**

## Design System — Tokens Tailwind
```js
colors: {
  primary: "#82511d",
  "primary-container": "#9e6933",
  secondary: "#556343",
  "secondary-container": "#d5e5bd",
  background: "#fef8f3",
  surface: "#fef8f3",
  "surface-container": "#f2ede8",
  "surface-container-low": "#f8f3ee",
  "surface-container-highest": "#e6e2dd",
  "on-surface": "#1d1b19",
  "on-surface-variant": "#51443a",
  "outline-variant": "#d6c3b5",
  // ... voir DESIGN.md complet dans les dossiers de design
}
fontFamily: {
  headline: ["Plus Jakarta Sans"],
  body: ["Be Vietnam Pro"],
}
```

### Regles de design cles
- **No-Line Rule** : pas de bordures 1px, utiliser des changements de fond
- **Glassmorphism** : nav flottante avec backdrop-blur
- **Boutons CTA** : gradient 45deg de primary vers primary-container, rounded-full
- **Cartes** : border-radius xl (1.5rem), pas de bordures, fond surface-container-low
- **Ombres ambiantes** : blur 24-48px, opacite 4-6%, teinte on-surface (pas noir pur)

## Fonctionnalites Admin (a construire)
- Creer/editer/supprimer des phrases
- Decouper les phrases en mots (auto-split ou manuel)
- Generer les QR codes lies aux mots
- Suivre la progression des equipes en temps reel
- Gerer les evenements (debut/fin, pool de phrases actif)

## BMAD Setup
- Version installee : 6.0.4
- Module : core uniquement (BMad Master)
- **A FAIRE** : Relancer `npx bmad-method@latest install` pour ajouter les agents :
  - Product Manager
  - System Architect
  - Developer
  - UX Designer
  - QA Engineer
  - Business Analyst
- L'installateur est interactif — doit etre lance manuellement par l'utilisateur

## Prochaines Etapes
1. Installer les agents BMAD manquants (`npx bmad-method@latest install`)
2. Lancer le party mode avec tous les agents
3. Definir le PRD (Product Requirements Document)
4. Concevoir l'architecture Firestore complete
5. Initialiser le projet Next.js
6. Convertir les designs HTML/Tailwind en composants React
7. Implementer Firebase Auth + Firestore
8. Construire le jeu (scan QR + phrase mystere)
9. Construire le panel admin
10. Tester en conditions reelles (multi-equipes, WiFi instable)
