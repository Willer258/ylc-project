# PRD — Young Christian Life (YLC)

**Version** : 1.1
**Date** : 2026-04-12
**Auteur** : Saga (WDS Analyst)
**Statut** : Draft — mis a jour avec galerie live photos

---

## 1. Vision et Contexte

YLC est une application compagnon pour un evenement chretien en soiree, reunissant environ 50 participants repartis en ~10 equipes de ~5 personnes. L'experience centrale est une **chasse au tresor par QR codes** : chaque equipe cherche des mots dissemines dans le lieu pour reconstituer une phrase biblique ou inspirante. Une **galerie photo live** permet aux equipes de partager leurs moments forts en temps reel.

L'application doit etre **ultra-accessible** (zero friction d'inscription), **immersive** (design editorial nomade), et **pilotable en direct** par un animateur (Asura) via un panneau d'administration.

### Navigation — 5 onglets

| Onglet | Route | Fonction |
|--------|-------|----------|
| Accueil | `/` | Bienvenue, info evenement, guide contextuel |
| Aventure | `/aventure` | Timeline/programme de l'evenement (pilotee par l'admin) |
| Jeu | `/jeu` | Chasse au tresor QR — phrase mystere |
| Photos | `/photos` | Galerie live de selfies et souvenirs d'equipe |
| Avis | `/avis` | Feedback des participants |

L'evenement est ponctuel, mais l'application est concue de maniere modulaire : rien n'est en dur, les phrases, equipes et evenements sont geres dynamiquement dans Firestore.

---

## 2. Utilisateurs

### 2.1 Participant

- ~50 personnes, smartphone personnel
- Rejoint l'app via QR code d'entree (pas d'App Store)
- S'identifie par prenom uniquement + UUID appareil
- Membre actif d'une equipe : scanne les QR, participe au jeu, consulte la progression

### 2.2 Capitaine (titre honorifique)

- Elu par vote intra-equipe dans l'app (1 tap, < 2 minutes)
- Aucun pouvoir supplementaire dans l'app — c'est un role social/symbolique
- Meme interface que tout participant

### 2.3 Admin (Asura)

- Acces via route protegee `/admin`
- Cree et gere les phrases, genere les QR codes
- Suit la progression des equipes en temps reel
- **Anime l'evenement** : avance la timeline, declenche des etapes, envoie des annonces
- Authentification admin : mot de passe simple ou cle d'acces (pas de systeme OAuth)

---

## 3. Fonctionnalites Detaillees

### 3.1 Onboarding (inscription ultra-rapide)

**Flux** :
1. Le participant scanne un QR code physique (affiche, ecran) → ouvre l'app dans le navigateur
2. Ecran d'accueil : champ prenom + bouton "Rejoindre"
3. Un UUID est genere et stocke en `localStorage`
4. Le participant est redirige vers la selection d'equipe

**Regles** :
- Pas de mot de passe, pas d'email
- Si l'UUID existe deja en `localStorage`, reconnexion automatique (retour direct a l'app)
- Le prenom est modifiable tant que l'equipe n'est pas rejointe

### 3.2 Equipes

**Rejoindre une equipe** :
- Liste des equipes disponibles (creees par l'admin en amont)
- Chaque equipe affiche : nom, nombre de membres actuels, places restantes
- Le participant tape sur une equipe → rejoint instantanement
- Taille max configurable par l'admin (defaut : 5)

**Vote capitaine** :
- Declenche automatiquement quand l'equipe est complete (ou manuellement par l'admin)
- Interface : liste des membres de l'equipe, chaque membre vote en 1 tap
- Le vote est anonyme, resultat immediat (majorite simple)
- En cas d'egalite : tirage au sort automatique
- Duree max : 2 minutes, puis tirage au sort parmi les candidats ex-aequo
- Le capitaine elu recoit un badge visuel (icone couronne/etoile) purement decoratif

### 3.3 Jeu QR — Chasse au Tresor

**Concept** :
- Chaque equipe se voit attribuer une phrase mystere (ex: "Dieu est amour et sa grace suffit")
- La phrase est decoupee en mots, chaque mot est lie a un QR code physique cache dans le lieu
- Les participants scannent les QR → les mots se revelent un par un dans l'interface
- Objectif : reconstituer la phrase complete

**Ecran du jeu (`/jeu`)** :
- Phrase mystere affichee avec des emplacements vides (tirets ou cases)
- Les mots trouves s'affichent a leur position correcte
- Compteur de progression : "4/7 mots trouves"
- Bouton "Scanner un QR" → ouvre la camera native du navigateur
- Animation de celebration quand un mot est trouve
- Animation speciale quand la phrase est completee

**Scan QR** :
- Utilise l'API native `navigator.mediaDevices` ou une librairie JS (html5-qrcode)
- Le QR code contient un identifiant unique du mot (ex: `ylc://word/abc123`)
- Validation cote serveur : le mot appartient-il bien a la phrase de cette equipe ?
- Si oui → mot revele + Firestore mis a jour en temps reel
- Si le mot est deja trouve → message "Deja trouve !"
- Si le QR ne correspond pas a la phrase de l'equipe → message "Ce n'est pas pour votre equipe"
- **N'importe quel membre** de l'equipe peut scanner (pas seulement le capitaine)

**Regles anti-triche** :
- Un QR code ne peut etre scanne qu'une fois par equipe
- Le scan est enregistre avec : equipeId, membreId, timestamp, wordId
- Pas de systeme de points — uniquement la progression vers la phrase complete

### 3.4 Guide IA (messages contextuels pre-ecrits)

**Pas un LLM** — c'est un systeme de messages pre-rediges, declenches par l'etat de progression.

**Declencheurs et messages** :

| Etat | Message type |
|------|-------------|
| Premiere connexion | "Bienvenue dans l'aventure ! Rejoins une equipe pour commencer." |
| Equipe rejointe | "Ton equipe est prete ! Votez pour votre capitaine." |
| Capitaine elu | "C'est parti ! Explorez le lieu et scannez les QR codes que vous trouverez." |
| 1er mot trouve | "Bravo ! Vous avez trouve votre premier mot. Continuez a chercher !" |
| 50% progression | "Vous etes a mi-chemin ! La phrase commence a prendre forme..." |
| Bloque (>5 min sans scan) | "Indice : regardez pres des endroits ou la lumiere guide vos pas." |
| Dernier mot | "Plus qu'un mot ! Vous y etes presque !" |
| Phrase completee | "Felicitations ! Vous avez dechiffre le message. Quelle belle verite !" |

**Implementation** :
- Les messages sont stockes dans Firestore (`guideMessages/`) ou en configuration statique
- Le composant Guide observe l'etat de l'equipe et affiche le message correspondant
- Le guide apparait sur la page d'accueil et/ou en banniere contextuelle sur `/jeu`
- Ton : chaleureux, bienveillant, motivant — jamais condescendant

### 3.5 Photos — Galerie Live Souvenirs (`/photos`)

Les photos sont une **fonctionnalite sociale et memorielle**, pas une mecanique de jeu. Chaque equipe capture des moments forts de la soiree, et ces photos apparaissent en temps reel dans une galerie partagee visible par les 50 participants.

**Onglet dedie** : `/photos` dans la navigation principale (5e onglet).

**Upload** :
- Bouton flottant `+` en bas a droite de la galerie
- Ouvre au choix : capture camera directe OU selection depuis la galerie du telephone
- La photo est automatiquement associee a l'equipe de l'utilisateur
- Compression cote client avant upload (`browser-image-compression`, max 1 Mo)
- Upload vers Firebase Storage, reference ecrite dans Firestore

**Galerie live** :
- Grille 2 colonnes, format carre, les plus recentes en premier (chronologique inverse)
- Chaque photo affiche : nom de l'equipe + timestamp relatif ("il y a 2 min")
- Mise a jour en temps reel via `onSnapshot` sur la collection photos — le feed se rafraichit sans reload
- Feed global unique (pas de filtre par equipe en V1)

**Moderation** :
- Pas de moderation prealable (contexte de confiance, evenement encadre)
- L'admin dispose d'un bouton "Supprimer" sur chaque photo dans `/admin`
- Les photos partent live immediatement a l'upload

**Limites V1** :
- Limite configurable : 20 photos max par equipe par soiree
- Pas de likes, commentaires, ou notifications par photo
- Pas de telechargement en masse ou export galerie (V2)
- Budget estimatif : 10 equipes x 20 photos x 400 Ko ≈ 80 Mo — largement dans le free tier Firebase Storage

### 3.6 Panneau Admin (`/admin`)

**Acces** :
- Route protegee par mot de passe simple (stocke en variable d'environnement)
- Pas de systeme de roles elabore — un seul admin (Asura)

**Fonctionnalites** :

#### Gestion des phrases
- Creer une phrase : saisir le texte complet, decoupe automatique en mots (split sur espaces)
- Possibilite de modifier manuellement le decoupage (ex: garder "sa grace" en un seul bloc)
- Supprimer/desactiver une phrase
- Pool de phrases actives : seules les phrases actives sont assignables

#### Generation des QR codes
- Pour chaque mot d'une phrase, generer un QR code telechargeable (PNG/SVG)
- Le QR encode une URL : `https://[domain]/scan?w=[wordId]`
- Bouton "Telecharger tous les QR" (ZIP) pour impression
- Chaque QR affiche aussi le mot en petit (pour le placement physique par l'admin)

#### Gestion des equipes
- Creer les equipes en amont (nom, taille max)
- Voir la composition de chaque equipe en temps reel
- Assigner/reassigner une phrase a une equipe manuellement si besoin

#### Suivi en temps reel
- Dashboard avec toutes les equipes et leur progression (barre ou pourcentage)
- Vue des scans recents (qui a scanne quoi, quand)
- Alerte quand une equipe complete sa phrase

#### Animation de l'evenement
- Controle de la timeline : avancer/reculer les etapes de l'evenement (accueil → jeu → cloture)
- La position dans la timeline est refletee en temps reel sur `/aventure` pour tous les participants
- Possibilite d'envoyer une annonce visible par tous (banniere push dans l'app)

#### Moderation photos
- Voir toutes les photos uploadees par les equipes
- Bouton "Masquer" sur chaque photo (met `isVisible: false` dans Firestore)
- Suppression definitive : supprime le document Firestore + le fichier dans Firebase Storage

### 3.7 Avis / Feedback (`/avis`)

**V1 simplifie** :
- Formulaire court : note (1-5 etoiles) + commentaire libre
- Soumission anonyme ou avec prenom
- Les avis sont stockes dans Firestore, visibles uniquement par l'admin
- Pas de moderation, pas d'affichage public en V1
- Cette section peut etre enrichie en V2 (votes, suggestions, mur de gratitude)

---

## 4. Flux Utilisateur Critiques

### 4.1 Flux principal : participant

```
QR code physique
    → Ouverture navigateur (/)
    → Saisie prenom
    → UUID genere + stocke
    → Liste des equipes → Rejoindre
    → Vote capitaine (1 tap, < 2 min)
    → Ecran jeu (/jeu)
    → Scanner QR codes → mots reveles
    → Phrase completee → celebration
    → Photos souvenirs (/photos) [tout au long de la soiree]
    → Feedback (/avis) [optionnel]
```

### 4.2 Flux admin : preparation

```
/admin (mot de passe)
    → Creer les phrases
    → Generer les QR codes → imprimer → disposer dans le lieu
    → Creer les equipes (noms + taille max)
    → Activer l'evenement
```

### 4.3 Flux admin : animation en direct

```
/admin → Dashboard temps reel
    → Observer la progression des equipes
    → Avancer la timeline (accueil → jeu → cloture)
    → Envoyer des annonces si besoin
    → Voir les equipes qui terminent
```

### 4.4 Flux de reconnexion

```
Participant ferme le navigateur
    → Reouvre l'app
    → UUID detecte en localStorage
    → Retour direct a l'ecran actuel (equipe, jeu, etc.)
    → Pas de re-saisie du prenom
```

---

## 5. Modele de Donnees Firestore

```
events/ (collection)
  └── {eventId}
        ├── name: "Soiree YLC 2026"
        ├── status: "active" | "upcoming" | "ended"
        ├── timelinePosition: "accueil" | "jeu" | "cloture"
        ├── createdAt: timestamp
        │
        ├── teams/ (sous-collection)
        │     └── {teamId}
        │           ├── name: "Les Explorateurs"
        │           ├── maxSize: 5
        │           ├── captainId: "{memberId}" | null
        │           ├── captainVoteOpen: boolean
        │           ├── assignedPhraseId: "{phraseId}"
        │           ├── wordsFound: ["mot1Id", "mot3Id"]
        │           ├── completed: boolean
        │           ├── completedAt: timestamp | null
        │           │
        │           ├── members/ (sous-collection)
        │           │     └── {memberId}
        │           │           ├── name: "Sarah"
        │           │           ├── deviceUUID: "abc-123-def"
        │           │           ├── joinedAt: timestamp
        │           │           └── captainVote: "{memberId}" | null
        │           │
        │           ├── scans/ (sous-collection)
        │           │     └── {scanId}
        │           │           ├── wordId: "{wordId}"
        │           │           ├── scannedBy: "{memberId}"
        │           │           ├── scannedAt: timestamp
        │           │           └── valid: boolean
        │           │
        │           └── (photos dans collection event-level, voir ci-dessous)
        │
        └── phrases/ (sous-collection)
              └── {phraseId}
                    ├── text: "Dieu est amour et sa grace suffit"
                    ├── active: boolean
                    ├── words/ (sous-collection)
                    │     └── {wordId}
                    │           ├── text: "amour"
                    │           ├── position: 3
                    │           └── qrCode: "ylc://word/{wordId}"
                    └── assignedTo: ["{teamId}"] | []

        └── photos/ (sous-collection de events — galerie live globale)
              └── {photoId}
                    ├── teamId: "{teamId}"
                    ├── teamName: "Les Explorateurs" (denormalise pour affichage rapide)
                    ├── uploaderUid: "{memberId}"
                    ├── storageUrl: "https://storage..."
                    ├── storagePath: "events/{eventId}/photos/{filename}" (pour suppression admin)
                    ├── uploadedAt: timestamp
                    └── isVisible: boolean (true par defaut, false si masque par admin)

announcements/ (collection racine ou sous events/)
  └── {announcementId}
        ├── eventId: "{eventId}"
        ├── message: "Rendez-vous tous dans le hall !"
        ├── createdAt: timestamp
        └── active: boolean

guideMessages/ (collection racine — statique, partagee)
  └── {triggerId}
        ├── trigger: "first_word_found"
        ├── message: "Bravo ! Vous avez trouve votre premier mot."
        └── priority: number
```

**Index Firestore requis** :
- `events/{eventId}/teams` par `completed` (pour filtrer les equipes en cours)
- `events/{eventId}/phrases` par `active` (pour le pool de phrases disponibles)
- `events/{eventId}/photos` par `(isVisible, uploadedAt)` (pour la galerie live triee)

---

## 6. Contraintes Techniques

### Stack
- **Next.js 14+** avec App Router (`/app` directory)
- **Firebase** : Firestore (donnees), Firebase Storage (photos), pas de Firebase Auth (UUID custom)
- **Deploiement** : Vercel (frontend) + Firebase (backend services)
- **PWA** : pas obligatoire en V1, mais le manifest peut etre ajoute pour l'icone sur l'ecran d'accueil

### Authentification UUID
- `crypto.randomUUID()` cote client, stocke en `localStorage`
- Le UUID est envoye avec chaque requete pour identifier le participant
- Pas de session server-side — l'etat est dans Firestore + localStorage
- **Limitation connue** : si le participant change de navigateur ou vide le cache, il perd son identite. Acceptable pour un evenement ponctuel.

### Temps reel
- Utiliser les **listeners Firestore** (`onSnapshot`) pour :
  - Progression de l'equipe (mots trouves)
  - Position de la timeline
  - Annonces admin
- Le dashboard admin utilise egalement `onSnapshot` pour le suivi en direct

### Offline
- **Pas de mode offline complet en V1** — l'app necessite une connexion pour scanner et synchroniser
- Firestore persistence locale activee (`enablePersistence`) pour limiter les rechargements
- Si le reseau est instable : afficher un indicateur "Reconnexion..." et retenter automatiquement (comportement natif Firestore)
- **Recommandation** : prevoir un hotspot WiFi dedie pour l'evenement

### Scan QR
- Librairie recommandee : `html5-qrcode` (legere, pas de dependance native)
- Fallback : champ de saisie manuelle du code (si la camera ne fonctionne pas)
- Les QR encodent une URL relative : `/scan?w={wordId}` — le scan ouvre cette URL
- La page `/scan` valide le mot, met a jour Firestore, et redirige vers `/jeu`

### Performance
- ~50 utilisateurs simultanes — pas de probleme de scaling
- Limiter les listeners Firestore au strict necessaire (1 par equipe, pas 1 par mot)
- Images photos : compression cote client avant upload (max 1 Mo)

---

## 7. Design System Tokens

### Palette de couleurs

| Token | Valeur | Usage |
|-------|--------|-------|
| `primary` | `#82511d` | Boutons CTA, accents principaux |
| `primary-container` | `#9e6933` | Gradient CTA (fin), fonds de cartes actives |
| `secondary` | `#556343` | Accents secondaires, badges |
| `secondary-container` | `#d5e5bd` | Tags, labels legers |
| `background` | `#fef8f3` | Fond de page global |
| `surface` | `#fef8f3` | Fond de base des composants |
| `surface-container` | `#f2ede8` | Cartes, conteneurs |
| `surface-container-low` | `#f8f3ee` | Cartes secondaires |
| `surface-container-highest` | `#e6e2dd` | Fonds les plus contrastes |
| `on-surface` | `#1d1b19` | Texte principal |
| `on-surface-variant` | `#51443a` | Texte secondaire |
| `outline-variant` | `#d6c3b5` | Separateurs visuels subtils |

### Typographie

| Role | Police | Poids |
|------|--------|-------|
| Headlines (h1-h3) | Plus Jakarta Sans | 700 (bold), 800 (extra-bold) |
| Body, labels, UI | Be Vietnam Pro | 400 (regular), 500 (medium), 600 (semi-bold) |

### Regles de design

- **No-Line Rule** : pas de bordures 1px — utiliser des changements de fond de surface
- **Glassmorphism** : navigation flottante en bas avec `backdrop-blur-xl` et fond semi-transparent
- **Boutons CTA** : `background: linear-gradient(45deg, primary, primary-container)`, `border-radius: 9999px`
- **Cartes** : `border-radius: 1.5rem`, pas de bordure, fond `surface-container-low`
- **Ombres ambiantes** : `blur 24-48px`, opacite `4-6%`, teintees `on-surface` (jamais noir pur)
- **Espacements** : grille de 4px (`0.25rem`), marges laterales `1rem` mobile

---

## 8. Hors-Scope V1

| Element | Raison |
|---------|--------|
| Systeme de points / classement | Le jeu est collaboratif, pas competitif |
| Firebase Auth (Google, email) | Trop de friction pour un evenement ponctuel |
| Mode offline complet | Complexite disproportionnee pour ~50 personnes avec WiFi |
| Chatbot IA interactif (LLM) | Les messages pre-ecrits suffisent pour l'experience |
| Notifications push natives | Necessite un Service Worker + permissions — les annonces in-app suffisent |
| Multi-evenements simultanes | Un seul evenement actif a la fois |
| Moderation prealable de photos (approbation avant publication) | Contexte de confiance — l'admin peut supprimer apres coup |
| Avis publics / mur de feedback | V2 — en V1 seul l'admin voit les retours |
| Internationalisation (i18n) | App 100% en francais |
| Tests end-to-end automatises | A ajouter post-V1 quand le flux est stabilise |

---

## 9. Criteres de Succes

### Fonctionnels (mesurables le soir de l'evenement)

| Critere | Cible |
|---------|-------|
| Temps d'onboarding (QR → equipe rejointe) | < 2 minutes |
| Vote capitaine | < 2 minutes par equipe |
| Taux de completion du jeu | ≥ 80% des equipes terminent la phrase |
| Scan QR fonctionnel | ≥ 95% des scans reussis du premier coup |
| Zero crash bloquant | Aucune equipe bloquee par un bug technique |

### Experience utilisateur

| Critere | Cible |
|---------|-------|
| Note moyenne feedback (`/avis`) | ≥ 4/5 |
| Engagement : tous les membres actifs | ≥ 80% des participants ont scanne au moins 1 QR |
| L'admin peut suivre et animer en direct | Dashboard fonctionnel sans rafraichissement manuel |

### Techniques

| Critere | Cible |
|---------|-------|
| Temps de chargement initial | < 3 secondes sur 4G |
| Mise a jour temps reel | < 2 secondes entre scan et affichage |
| Compatible smartphones (iOS Safari, Chrome Android) | 100% des fonctions critiques |

---

## Annexe : Exemples de Phrases

Pour la preparation de l'evenement, voici des exemples de phrases utilisables :

1. "Dieu est amour et sa grace suffit" (7 mots)
2. "La foi deplace les montagnes" (5 mots)
3. "Que ta lumiere brille devant les hommes" (7 mots)
4. "Je suis le chemin la verite et la vie" (10 mots)
5. "Aime ton prochain comme toi meme" (6 mots)

L'admin peut creer ses propres phrases via le panneau d'administration. Prevoir 1 phrase par equipe minimum, avec 2-3 phrases supplementaires en reserve.
