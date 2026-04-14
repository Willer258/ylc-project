# PRD — Young Christian Life (YLC)

**Version** : 2.0
**Date** : 2026-04-14
**Statut** : Valide — Game design + Admin finalises

---

## 1. Vision et Contexte

YLC est une application compagnon pour un evenement chretien en soiree, reunissant environ 50 participants repartis en ~10 equipes de ~5 personnes. L'experience centrale est un **jeu de devinettes de versets bibliques mot par mot**, enrichi par un systeme d'**indices deblocables via QR codes**. Le jeu est **competitif** avec une recompense a la cle.

L'application inclut aussi une **galerie photo live**, un **programme de soiree en 14 etapes**, et un systeme de **feedback**.

L'admin pilote tout en direct via un panneau d'administration complet.

### Navigation — 5 onglets (participants)

| Onglet | Route | Fonction |
|--------|-------|----------|
| Accueil | `/` | Hero avec slideshow galerie, quick links, infos equipe |
| Aventure | `/aventure` | Programme 14 etapes avec progression temps reel |
| Jeu | `/jeu` | Jeu de devinettes — deviner les mots d'un verset |
| Photos | `/photos` | Galerie live (carousel, grid, stack) + upload Cloudinary |
| Avis | `/avis` | Feedback (etoiles + commentaire) |

### Routes supplementaires

| Route | Fonction |
|-------|----------|
| `/join/[teamId]` | Inscription participant via lien/QR d'equipe |
| `/qr/[slotCode]` | Scan QR — debloquer un indice |
| `/admin/*` | Panneau d'administration complet |

---

## 2. Utilisateurs

### 2.1 Participant

- ~50 personnes, chacun sur son smartphone personnel
- Rejoint via lien d'equipe `/join/[teamId]` (QR code ou lien partage)
- S'identifie par prenom + UUID appareil (zero friction)
- Participe au jeu en temps reel avec son equipe

### 2.2 Capitaine (titre honorifique)

- Elu par vote intra-equipe (1 tap, majorite simple, tiebreak auto)
- Aucun pouvoir special — titre purement social/decoratif

### 2.3 Admin (Asura)

- Authentification : **Firebase Magic Link** envoye a `wilfriedhouinlindjonon91@gmail.com`
- Acces complet via `/admin`
- Cree les equipes, configure le jeu, pilote l'evenement en direct

---

## 3. Jeu — Devinettes de Versets Bibliques

### 3.1 Concept

Les equipes doivent deviner des phrases/versets bibliques **mot par mot**. Pour chaque mot :
- La **structure** est visible (nombre de lettres : `_ _ _ _ _`)
- Le joueur peut **tenter autant de fois** qu'il veut
- Des **indices** sont deblocables via QR codes physiques

### 3.2 Mode de jeu : Ruche Collaborative Competitive

- Tous les joueurs d'une equipe voient le **meme ecran synchronise** en temps reel
- N'importe quel membre peut soumettre une reponse
- Le premier qui tape le bon mot valide pour toute l'equipe
- **Competition entre equipes** avec classement live et recompense

### 3.3 Systeme de Score

| Condition | Points |
|-----------|--------|
| Mot trouve (base) | 100 pts |
| Aucun indice utilise | x2 |
| 1 indice utilise | x1.5 |
| 2 indices utilises | x1.2 |
| 3-4 indices utilises | x1 |
| Chaque tentative ratee | -5 pts (plafonne a -25) |
| Speed Bonus : 1er a trouver | +30 pts |
| Speed Bonus : 2e | +20 pts |
| Speed Bonus : 3e | +10 pts |

Un mot trouve rapporte toujours au minimum 50 pts.

### 3.4 Mecaniques Live

**Leaderboard public** : visible par tous en temps reel (bandeau fixe + ecran central).

**Flash Rounds** (x2 dans la soiree) : mot a triple points, annonce avec countdown. Cree des retournements.

**Vol de reponse** : apres 3 echecs sur un mot, il devient "ouvert" 30s — les autres equipes peuvent le voler pour 50% des points.

**Anti-snowball** : l'equipe en tete recoit ses indices avec 10s de delai (invisible). Les equipes en bas recoivent le 1er indice gratuitement.

### 3.5 Les 4 Types d'Indices

Chaque indice est deblocable via un **QR code physique** place dans le lieu. Un QR = un indice. **Usage unique** : une fois scanne par une equipe, le QR est consomme pour cette equipe.

| Type | Description | Mode de pensee |
|------|-------------|----------------|
| **4 Images 1 Mot** | 4 images qui suggerent le mot (grille 2x2) | Visuel / associatif |
| **Anagramme** | Lettres du mot melangees aleatoirement | Logique / lettres |
| **Phrase Allusive** | Une phrase qui fait allusion au mot | Semantique / contexte |
| **Emoji Story** | Sequence de 3-5 emojis racontant une histoire liee au mot | Creatif / narratif |

### 3.6 Pacing de la soiree (~60 min de jeu)

```
[00:00] Intro + mot d'echauffement (non note)
[00:05] Rounds 1-4 — mots normaux
[00:25] FLASH ROUND 1 — triple points
[00:30] Rounds 5-8 — tension maximale
[00:50] FLASH ROUND 2 — dernier sprint
[00:55] Mot final — annonce en direct
[01:00] Remise du prix
```

### 3.7 QR Codes Reutilisables

Les QR codes physiques pointent vers une URL generique : `https://[domain]/qr/[slotCode]`

L'admin mappe chaque slot a un indice specifique avant l'evenement. Pour le prochain evenement, il reassigne les memes QR physiques a de nouveaux indices. Les QR ne changent jamais.

### 3.8 Templates de Jeu

Les configurations de jeu sont sauvegardees en **templates reutilisables** :
- Un template = un ensemble de phrases + mots + indices
- Cloner un template pour creer une variante
- Assigner un template a un evenement

---

## 4. Onboarding & Equipes

### 4.1 Inscription via lien d'equipe

1. L'admin cree les equipes dans `/admin`
2. Chaque equipe a un lien : `/join/[teamId]`
3. Le participant ouvre le lien → entre son prenom → rejoint automatiquement l'equipe
4. UUID genere en `localStorage` pour la session

**Pas de selection d'equipe libre** — l'admin controle la creation et la distribution.

### 4.2 Vote Capitaine

- Declenche quand l'equipe est complete (ou manuellement par l'admin)
- Vote 1 tap, majorite simple, tiebreak aleatoire, timeout 2 min
- Badge decoratif uniquement

---

## 5. Photos — Galerie Live (`/photos`)

- **Upload** : camera ou galerie du telephone → Cloudinary (CDN, compression auto)
- **Galerie** : carousel featured (5 dernieres), grille 2 colonnes, vue stack (swipe style Tinder)
- **Lightbox** : navigation swipe horizontale avec miniatures
- **Animations** : Framer Motion (entree cascade, hover, transitions)
- **Temps reel** : `onSnapshot` Firestore, nouvelles photos apparaissent live
- **Home** : les photos alimentent le slideshow du hero sur la page d'accueil
- **Skeleton loader** pendant le chargement initial
- **Moderation admin** : masquer/supprimer depuis `/admin`

---

## 6. Programme — Aventure (`/aventure`)

14 etapes du programme reel de la soiree :

| Horaire | Etape |
|---------|-------|
| 15h00-15h30 | Accueil & Installation |
| 15h30-15h50 | Priere & Mot d'ouverture |
| 15h50-16h15 | Cocktail & Networking |
| 16h15-16h30 | Quiz Culture Generale |
| 16h30-17h20 | Panel & Reseau Pro |
| 17h20-17h35 | Animation & Jeux de table |
| 17h35-18h00 | Quiz Biblique & Devine qui c'est |
| 18h00-18h40 | Prestation & Defile |
| 18h40-19h10 | Jeux de saut & Devinettes |
| 19h10-19h50 | Ouverture du Buffet |
| 19h50-20h10 | Tournoi & Jeu Alphabet |
| 20h10-20h40 | Concert |
| 20h40-20h50 | Jeu Global |
| 20h50-21h00 | Mot de Fin |

- Barre de progression animee
- Etape en cours mise en avant (pulse + description)
- Controle temps reel par l'admin (avancer/reculer)
- Categories par couleur (Accueil, Spirituel, Social, Jeu, Spectacle, Repas, Cloture)

---

## 7. Panneau Admin (`/admin`)

### 7.1 Authentification

- **Firebase Magic Link** envoye a `wilfriedhouinlindjonon91@gmail.com`
- Session cookie HttpOnly (7 jours)
- Middleware Next.js + Firestore Security Rules avec `isAdmin()`
- Triple verification : middleware serveur, security rules, Cloud Functions

### 7.2 Structure des routes

```
/admin/login          — Magic Link
/admin                — Dashboard (stats globales)
/admin/timeline       — Controle des 14 etapes + annonces
/admin/photos         — Moderation photos
/admin/reviews        — Dashboard avis + export CSV
/admin/teams          — CRUD equipes + liens d'invitation
/admin/game/templates — CRUD templates de jeu
/admin/game/[id]      — Editeur template (phrases, mots, indices)
/admin/game/qr        — Mapping QR slots → indices
/admin/game/live      — Controle live (start/stop, flash rounds, leaderboard)
```

### 7.3 Dashboard principal

Stats temps reel : participants connectes, etape courante, photos uploadees, note moyenne, status du jeu.

### 7.4 Configuration du jeu (wizard 3 etapes)

**Etape 1** : Infos template (nom, description)
**Etape 2** : Phrases + mots + indices par mot (4 types configurables)
**Etape 3** : Recapitulatif + activation

### 7.5 QR Slot Management

- Tableau des QR codes physiques (QR-001 a QR-050)
- Assigner chaque QR a un indice (mot X, type Y)
- Generer les QR codes en PDF pour impression
- Les QR sont **reutilisables** d'un evenement a l'autre

### 7.6 Panneau Live (jour J)

- **Start/Pause/Stop** le jeu
- **Leaderboard temps reel** avec progression par equipe
- **Declencheur Flash Round** avec countdown configurable
- **Declencheur "Mot Ouvert"** (vol de reponse)
- **Timeline** : avancer/reculer l'etape courante
- **Annonces** : envoyer des messages a tous les participants
- **Accessible sur mobile** (version simplifiee)

### 7.7 Gestion equipes

- CRUD equipes (nom, taille max, couleur)
- Generer le lien d'invitation `/join/[teamId]`
- Voir les membres en temps reel
- Reassigner des membres si necessaire

---

## 8. Modele de Donnees Firestore

```
gameTemplates/{templateId}
  ├── name: string
  ├── description: string
  ├── createdBy: string
  ├── createdAt: timestamp
  ├── isPublished: boolean
  └── phrases: [{
        text: string,                    // "Car Dieu a tant aime le monde"
        reference: string,               // "Jean 3:16"
        orderIndex: number,
        words: [{
          index: number,
          value: string,                 // "aime"
          letterCount: number,
          hints: [{
            type: "4images" | "anagram" | "phrase" | "emoji",
            content: {
              images?: string[],         // 4 URLs (Cloudinary)
              scrambled?: string,         // "MEAI"
              text?: string,             // "Ce que Dieu donne..."
              emojis?: string[],         // ["🙏", "✨", "🎁"]
            }
          }]
        }]
      }]

gameInstances/{gameId}
  ├── templateId: string
  ├── eventId: string
  ├── status: "waiting" | "active" | "paused" | "ended"
  ├── startedAt: timestamp
  ├── config: { pointsBase, speedBonus, penalties... }
  └── leaderboard: [{ teamId, teamName, score, rank, completedWords }]

gameProgress/{gameId}/teams/{teamId}
  ├── score: number
  ├── completedWords: number
  └── slots/{wordKey}
        ├── status: "locked" | "active" | "completed"
        ├── attempts: number
        ├── hintsUsed: number
        ├── hintsUnlocked: string[]    // hint IDs debloques via QR
        └── completedAt: timestamp | null

qrSlots/{slotCode}
  ├── slotCode: string               // "QR-007" (imprime sur le QR physique)
  ├── label: string                  // "Pilier gauche scene"
  ├── currentGameId: string | null
  ├── targetWord: { phraseIndex, wordIndex }
  ├── hintType: "4images" | "anagram" | "phrase" | "emoji"
  └── scannedBy: [{ teamId, timestamp }]  // usage unique par equipe

events/{eventId}
  ├── name: string
  ├── status: "upcoming" | "active" | "ended"
  ├── timelinePosition: string       // ID de l'etape courante
  ├── activeGameId: string | null
  │
  ├── teams/{teamId}
  │     ├── name, maxSize, captainId, captainVoteOpen
  │     └── members/{memberId}
  │           ├── name, deviceUUID, joinedAt, captainVote
  │
  ├── photos/{photoId}
  │     ├── teamId, uploaderUid, uploaderName
  │     ├── imageUrl (Cloudinary CDN), cloudinaryPublicId
  │     ├── uploadedAt, isVisible
  │
  └── reviews/{reviewId}
        ├── deviceUUID, name, rating, comment, createdAt

announcements/{id}
  ├── eventId, message, createdAt, active

guideMessages/{triggerId}
  ├── trigger, message, priority
```

---

## 9. Contraintes Techniques

### Stack
- **Next.js 16** (App Router, Turbopack)
- **Firebase** : Firestore (donnees), Auth (magic link admin)
- **Cloudinary** : stockage photos (free tier 25 Go)
- **Framer Motion** : animations
- **html5-qrcode** : scanner QR
- **Deploiement** : Vercel + Firebase

### Auth
- **Participants** : UUID `localStorage` + prenom (zero friction)
- **Admin** : Firebase Magic Link + session cookie HttpOnly + middleware

### Temps reel
- 2 listeners max par joueur (`gameInstance` + `teamProgress`)
- Leaderboard denormalise dans `gameInstance` (1 document, 50 lecteurs)
- Cout estime : < 0.50$ / soiree pour 50 joueurs

### Validation
- **Cloud Functions** pour : validation reponses, scoring, flash rounds, leaderboard
- Solutions jamais exposees cote client
- Transactions Firestore pour eviter les race conditions

---

## 10. Hors-Scope V1

| Element | Raison |
|---------|--------|
| Mode offline complet | WiFi dedie pour l'evenement |
| Chatbot IA (LLM) | Messages pre-ecrits suffisent |
| Notifications push natives | Annonces in-app suffisent |
| Multi-evenements simultanes | Un seul actif a la fois |
| Likes/commentaires photos | Pas necessaire pour un evenement ponctuel |
| i18n | App 100% francais |

---

## 11. Criteres de Succes

| Critere | Cible |
|---------|-------|
| Onboarding (lien → equipe) | < 1 minute |
| Scan QR fonctionnel | ≥ 95% premier coup |
| Latence temps reel | < 2 secondes |
| Taux de completion jeu | ≥ 80% des equipes |
| Note feedback | ≥ 4/5 |
| Zero crash bloquant | 0 equipe bloquee |
| Chargement initial | < 3 secondes sur 4G |
