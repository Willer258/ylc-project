# Plan de Sprints — Young Christian Life (YLC)

**Version** : 1.0
**Date** : 2026-04-12
**Auteur** : Max (Scrum Master) + Cloud Dragonborn (Architecte) + Link Freeman (Dev)
**Statut** : Valide

---

## Vue d'ensemble

| Sprint | Nom | Duree | Objectif |
|--------|-----|-------|----------|
| S0 | Character Creation | 3j | Next.js + Firebase + Auth + Design System |
| S1 | Overworld Map | 5j | Home + Aventure + Equipes + Vote + Proto QR |
| S2 | Dungeon Design | 5j | Admin Panel complet |
| S3 | Boss Fight | 5j | QR Game end-to-end |
| S4 | Social Hub | 4j | Galerie photos live |
| S5 | End Credits | 3j | Reviews + Polish + Dry run |

**Total estime** : ~25 jours de dev (~4-5 semaines reelles)

---

## Graphe de Dependances

```
S0: Setup + Auth + Design System
        |
        v
S1: Home + Aventure + Equipes + Vote + Proto QR
        |
        v
S2: Admin Panel (phrases, QR gen, dashboard, timeline)
        |
        v
S3: QR Game complet (scanner, validation, progression)
        |
        v
S4: Galerie Photos Live
        |
        v
S5: Reviews + Polish + Go-live
```

**Note critique** : Le scan QR est prototypé des le Sprint 1 (pas en Sprint 3) pour detecter les problemes mobile au plus tot.

---

## Risques Techniques

| Risque | Niveau | Mitigation |
|--------|--------|------------|
| Scan QR sur mobile (html5-qrcode, permissions camera, HTTPS) | 🔴 Critique | Prototype en S1, test sur vrais appareils |
| Regles Firestore sans Firebase Auth (UUID custom) | 🟠 Eleve | Ecrire et tester les regles des S0 |
| Upload + compression photo (reseau instable en event) | 🟠 Eleve | Compression client, retry automatique |
| Listeners onSnapshot (50+ connexions simultanees) | 🟡 Modere | Limiter a 1 listener par equipe |
| Generation QR PNG/SVG (qualite impression) | 🟢 Faible | Libs matures (qrcode) |

---

## SPRINT 0 — "Character Creation" (3 jours)

> Poser les fondations. C'est le tutoriel obligatoire.

### S0-1 — Setup projet Next.js + Firebase (0.5j)

**Story** : En tant que developpeur, je veux un projet Next.js App Router configure avec Firebase pour pouvoir commencer le dev.

**Taches** :
- `create-next-app` avec App Router + TypeScript
- Configurer Firebase (Firestore + Storage)
- Variables d'env `.env.local`
- Deploy Vercel (preview branch)

**Done when** : `npm run dev` tourne, Firebase console connectee, preview URL accessible.

---

### S0-2 — Design System + Layout global (0.5j)

**Story** : En tant qu'utilisateur, je vois une app avec le theme "Nomadic Editorial" et une navigation a 5 onglets.

**Taches** :
- Extraire les tokens Tailwind (couleurs, typo, spacing) depuis les HTML existants
- Creer `tailwind.config.ts` avec le theme complet
- Layout racine `app/layout.tsx` avec bottom nav 5 tabs (glassmorphism + backdrop-blur)
- Composants de base : `<Button>`, `<Card>`, `<TabBar>`
- Importer les fonts Plus Jakarta Sans + Be Vietnam Pro

**Done when** : La bottom nav navigue entre 5 routes vides, le theme correspond aux maquettes.

---

### S0-3 — Auth flow UUID + Onboarding (1j)

**Story** : En tant que participant, je saisis mon prenom et je suis identifie sans friction.

**Taches** :
- Hook `useAuth` : genere UUID via `crypto.randomUUID()`, stocke en `localStorage`
- Page d'onboarding : champ prenom + bouton "Rejoindre"
- Persist dans Firestore `events/{eventId}/members/{uuid}`
- Reconnexion automatique si UUID existe deja en localStorage
- Le prenom est modifiable tant que l'equipe n'est pas rejointe

**Done when** : Un user ouvre l'app, saisit son nom, est persiste en Firestore, et ne revoit plus l'onboarding au refresh.

---

### S0-4 — Seed Firestore + Regles de securite (1j)

**Story** : En tant que developpeur, j'ai un jeu de donnees de test et des regles de securite fonctionnelles.

**Taches** :
- Ecrire les regles Firestore initiales (lecture si UUID connu, ecriture controlee)
- Script de seed : creer un event de test avec 3 equipes, 2 phrases, des mots
- Tester les regles avec le simulateur Firebase

**Done when** : Les regles sont deployees, le seed peuple la base, les acces non autorises sont bloques.

---

### Save Point S0 ✓
> App deployee sur Vercel, auth fonctionne, theme en place. Montrable a un beta testeur.

---

## SPRINT 1 — "Overworld Map" (5 jours)

> Les ecrans principaux sont jouables. Premier vrai increment fonctionnel.

### S1-1 — Home Screen (0.5j) ⚡ SPEEDRUN

**Story** : En tant que participant, je vois l'accueil de l'evenement avec les annonces live.

**Taches** :
- Convertir `~/Downloads/home/code.html` en composants React
- Afficher nom de l'event, heure, annonces live (`onSnapshot` sur `announcements/`)
- Composant `<AnnouncementBanner>` avec animation subtile

**Done when** : La home affiche les donnees live, les annonces se mettent a jour sans refresh.

---

### S1-2 — Timeline Aventure (1.5j)

**Story** : En tant que participant, je vois le programme de la soiree et ou on en est.

**Taches** :
- Convertir `~/Downloads/aventure/code.html` en composants React
- Timeline verticale avec etapes (donnees Firestore)
- Lier la `timelinePosition` de l'event aux etapes visuellement
- Listener `onSnapshot` pour mise a jour en temps reel quand l'admin avance la timeline

**Done when** : La timeline reflète la position actuelle de l'evenement en temps reel.

---

### S1-3 — Systeme d'equipes (1j)

**Story** : En tant que participant, je rejoins une equipe et je vois mes coequipiers.

**Taches** :
- Ecran de selection d'equipe apres l'onboarding (liste des equipes avec places restantes)
- Ecriture dans `events/{id}/teams/{teamId}/members/{uuid}`
- Afficher les membres de son equipe
- Taille max par equipe (configurable par l'admin, defaut 5)

**Done when** : L'user rejoint une equipe, voit ses coequipiers, la donnee est en Firestore.

---

### S1-4 — Vote Capitaine (1j)

**Story** : En tant que membre d'equipe, je vote pour un capitaine en 1 tap.

**Taches** :
- Interface de vote : liste des membres, 1 tap pour voter
- Transaction Firestore : 1 vote par membre, majorite simple
- En cas d'egalite : tirage au sort automatique
- Timeout 2 min puis tirage au sort
- Badge decoratif "Capitaine" (icone couronne)

**Done when** : Le vote fonctionne, le capitaine elu a son badge, re-vote impossible.

---

### S1-5 — Prototype QR Scanner (1j) 🔴 RISQUE CRITIQUE

**Story** : En tant que developpeur, je valide que le scan QR fonctionne sur les vrais appareils.

**Taches** :
- Integrer `html5-qrcode` dans une page de test
- Tester sur iOS Safari + Chrome Android (HTTPS requis)
- Verifier : permissions camera, vitesse de lecture, conditions de luminosite
- Documenter les limitations decouvertes
- Fallback : champ de saisie manuelle du code

**Done when** : Le scan QR est valide sur au moins 3 appareils differents. Les limitations sont documentees.

---

### Save Point S1 ✓
> Les participants peuvent s'inscrire, rejoindre une equipe, voter, et voir l'evenement. Le scan QR est valide techniquement.

---

## SPRINT 2 — "Dungeon Design" (5 jours)

> L'Admin Panel est operationnel. Sans lui, le jeu ne peut pas etre configure.

### S2-1 — Route Admin + Authentification (0.5j)

**Story** : En tant qu'admin, je suis le seul a acceder a `/admin`.

**Taches** :
- Route `/admin` protegee par mot de passe (variable d'env)
- Middleware ou verification cote client
- Redirect si non-admin

**Done when** : Seul Asura accede a `/admin`.

---

### S2-2 — Gestion des Phrases et Mots (1j)

**Story** : En tant qu'admin, je cree des phrases et les decoupe en mots.

**Taches** :
- CRUD phrases dans `events/{eventId}/phrases/`
- Auto-split en mots (split sur espaces)
- Edition manuelle du decoupage (regrouper des mots, ex: "sa grace")
- Activer/desactiver une phrase
- Assigner une phrase a une equipe (manuel ou aleatoire)

**Done when** : Asura cree une phrase complete avec ses mots depuis l'interface.

---

### S2-3 — Generation QR Codes (1.5j)

**Story** : En tant qu'admin, je genere et imprime les QR codes pour chaque mot.

**Taches** :
- Generer un QR code par mot (lib `qrcode`)
- Contenu QR : URL `https://[domain]/scan?w={wordId}`
- Affichage en grille imprimable avec label du mot
- Export ZIP (lib `jszip` + `file-saver`) pour telecharger tous les QR d'une phrase
- Preview individuel de chaque QR

**Done when** : Asura genere et telecharge un ZIP de QR codes pour une phrase complete.

---

### S2-4 — Dashboard Suivi Temps Reel (1j)

**Story** : En tant qu'admin, je vois la progression de chaque equipe en direct.

**Taches** :
- Dashboard : liste des equipes avec barre de progression (mots trouves / total)
- `onSnapshot` sur `teams/` pour mise a jour en temps reel
- Vue des scans recents (qui, quoi, quand)
- Alerte visuelle quand une equipe complete sa phrase

**Done when** : Le dashboard se met a jour en temps reel sans refresh.

---

### S2-5 — Timeline Control + Annonces (1j)

**Story** : En tant qu'admin, je controle le deroulement de l'evenement en direct.

**Taches** :
- Interface pour changer `timelinePosition` (accueil → jeu → cloture)
- Poster/supprimer des annonces (`announcements/`)
- Les annonces apparaissent instantanement sur la Home des participants

**Done when** : Un changement de timeline ou une annonce est visible instantanement par les participants.

---

### Save Point S2 ✓
> Admin Panel operationnel. Asura peut configurer les vraies donnees de l'evenement, generer les QR codes, et animer en direct.

---

## SPRINT 3 — "Boss Fight" (5 jours)

> Le QR Game est complet et robuste. C'est LE coeur de l'app.

### S3-1 — Ecran Jeu + Scanner QR (2j)

**Story** : En tant que participant, je scanne un QR code et un mot se revele.

**Taches** :
- Construire l'ecran `/jeu` depuis `~/Downloads/jeu/DESIGN.md` + `screen.png` (pas de code.html)
- Phrase mystere avec emplacements vides (tirets/cases)
- Bouton "Scanner" → overlay camera (`html5-qrcode`)
- Parser le QR → extraire `wordId`
- Fallback saisie manuelle si camera indisponible

**Done when** : L'app ouvre la camera, lit un QR, extrait le wordId correctement.

---

### S3-2 — Validation Serveur du Scan (1j)

**Story** : En tant que systeme, je valide chaque scan et je rejette les tentatives invalides.

**Taches** :
- API Route `POST /api/scan` : recoit `{wordId, teamId, memberId}`
- Verifications : le mot existe ? Pas deja scanne par cette equipe ? Phrase active ?
- Enregistrer dans `teams/{id}/scans/{scanId}`
- Mettre a jour `teams/{id}/wordsFound`
- Retour : succes + mot decouvert, ou erreur typee

**Done when** : Les doublons, QR invalides, et QR d'autres equipes sont rejetes. Les scans valides sont persistes.

---

### S3-3 — Affichage Progression + Mots Decouverts (1j)

**Story** : En tant que participant, je vois les mots trouves et ma progression.

**Taches** :
- Listener `onSnapshot` sur `teams/{teamId}` pour `wordsFound`
- Afficher les mots trouves a leur position dans la phrase
- Compteur "4/7 mots trouves"
- Animation de celebration quand un mot est trouve
- Mots non trouves = cases vides/tirets

**Done when** : Tous les membres de l'equipe voient les mots se reveler en temps reel.

---

### S3-4 — Completion de Phrase + Guide Contextuel (1j)

**Story** : En tant qu'equipe, quand tous les mots sont trouves, on est felicites.

**Taches** :
- Detection automatique : tous les mots trouves → `completed: true`
- Animation speciale de completion (confetti, message)
- Systeme de guide contextuel : messages pre-ecrits selon l'etat de progression
- Declencheurs : 1er mot, 50%, bloque (>5min sans scan), dernier mot, complete
- Messages stockes dans `guideMessages/` ou en config statique

**Done when** : La phrase se complete, l'animation se lance, les messages contextuels apparaissent aux bons moments.

---

### Save Point S3 ✓
> Le QR Game est fonctionnel de bout en bout. Tester avec de vrais QR imprimes sur mobile.

---

## SPRINT 4 — "Social Hub" (4 jours)

> La galerie photo live est operationnelle. Feature sociale de la soiree.

### S4-1 — Upload Photo (1.5j)

**Story** : En tant que participant, je prends une photo ou j'en selectionne une et elle est partagee.

**Taches** :
- Ecran `/photos` avec bouton flottant `+`
- Choix : capture camera directe OU selection depuis galerie du telephone
- Compression cote client (`browser-image-compression`, max 1 Mo)
- Upload vers Firebase Storage `events/{eventId}/photos/{timestamp}_{uuid}.jpg`
- Ecriture reference dans Firestore `events/{eventId}/photos/{photoId}`
- Metadata : `teamId`, `teamName` (denormalise), `uploaderUid`, `storageUrl`, `storagePath`, `uploadedAt`, `isVisible: true`

**Done when** : Un participant prend/selectionne une photo, elle est uploadee et sa reference est en Firestore.

---

### S4-2 — Galerie Live (1.5j)

**Story** : En tant que participant, je vois les photos de toutes les equipes apparaitre en temps reel.

**Taches** :
- Grille 2 colonnes, format carre, chronologique inverse
- `onSnapshot` sur `events/{eventId}/photos` (where `isVisible == true`, orderBy `uploadedAt` desc)
- Chaque photo : nom d'equipe + timestamp relatif ("il y a 2 min")
- Lazy loading des images
- Limite : 20 photos max par equipe

**Done when** : Les photos apparaissent en temps reel, la grille est fluide sur mobile.

---

### S4-3 — Admin : Moderation Photos (1j)

**Story** : En tant qu'admin, je peux masquer ou supprimer une photo inappropriee.

**Taches** :
- Dans `/admin` : grille de toutes les photos avec bouton "Masquer" et "Supprimer"
- Masquer : met `isVisible: false` (disparait de la galerie publique)
- Supprimer : supprime le document Firestore + le fichier dans Firebase Storage

**Done when** : Asura peut masquer/supprimer une photo depuis l'admin, elle disparait immediatement de la galerie.

---

### Save Point S4 ✓
> La galerie live fonctionne. Les equipes peuvent partager des selfies et souvenirs en temps reel.

---

## SPRINT 5 — "End Credits" (3 jours)

> Polish final. Le jeu est pret a shipper.

### S5-1 — Ecran Reviews (0.5j) ⚡ SPEEDRUN

**Story** : En tant que participant, je laisse un avis sur l'evenement.

**Taches** :
- Convertir `~/Downloads/advice/code.html` en composants React
- Formulaire : note 1-5 etoiles + commentaire libre
- Ecriture dans `events/{eventId}/reviews/{reviewId}`
- 1 review max par UUID

**Done when** : Un participant laisse un avis, il ne peut pas en soumettre un second.

---

### S5-2 — Admin : Visualisation Reviews (0.5j)

**Story** : En tant qu'admin, je consulte les retours des participants.

**Taches** :
- Dans `/admin` : liste des reviews avec note + commentaire
- Tri par note / par date
- Note moyenne affichee

**Done when** : Asura voit toutes les reviews depuis l'admin.

---

### S5-3 — Polish & Edge Cases (1j)

**Story** : En tant que participant, l'app ne me laisse jamais dans un etat bloque.

**Taches** :
- Indicateur de connexion (online/offline)
- Loading states sur toutes les actions async
- Gestion des erreurs utilisateur (scan invalide, upload echoue, equipe pleine)
- Messages d'erreur clairs et bienveillants
- Test responsive sur differentes tailles d'ecran

**Done when** : Aucun etat de l'app ne reste "bloque" sans feedback visuel.

---

### S5-4 — Dry Run (1j)

**Story** : En tant qu'admin, j'ai teste le flow complet en conditions reelles.

**Taches** :
- Tester le flow complet sur mobile (vrais QR imprimes, vraie camera)
- Verifier les regles Firestore en prod
- Tester avec 2-3 personnes en simultane
- Creer l'event reel : equipes, phrases, QR codes
- Checklist pre-event validee

**Done when** : Asura a complete le jeu de bout en bout sur son telephone. Tout fonctionne.

---

### Save Point S5 ✓ — GO LIVE
> L'app est prete pour la soiree. 🎉

---

## Recapitulatif des Estimations par Feature

| Feature | Jours | Difficulte |
|---------|-------|------------|
| Setup + Design System | 1 | 🟢 |
| Auth UUID | 1 | 🟡 |
| Firestore seed + rules | 1 | 🟡 |
| Home (depuis code.html) | 0.5 | 🟢 |
| Aventure + timeline | 1.5 | 🟡 |
| Equipes + vote capitaine | 2 | 🟡 |
| Proto QR scanner | 1 | 🔴 |
| Admin : phrases + mots | 1 | 🟡 |
| Admin : QR generation | 1.5 | 🟡 |
| Admin : dashboard | 1 | 🟡 |
| Admin : timeline + annonces | 1 | 🟡 |
| Game page (scanner + validation + progression) | 5 | 🔴 |
| Galerie photos live | 3 | 🔴 |
| Admin : moderation photos | 1 | 🟢 |
| Reviews | 0.5 | 🟢 |
| Admin : reviews | 0.5 | 🟢 |
| Guide contextuel | 1 | 🟡 |
| Polish + dry run | 2 | 🟡 |
| **TOTAL** | **~25j** | |
