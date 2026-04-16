import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA9vtnbecu0gFULYvfWsRfzj0ai12gq02I",
  authDomain: "ylc-app-7dcd7.firebaseapp.com",
  projectId: "ylc-app-7dcd7",
  storageBucket: "ylc-app-7dcd7.firebasestorage.app",
  messagingSenderId: "292034091617",
  appId: "1:292034091617:web:d50e273ebbae56b496e820",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function shuffleWord(word) {
  const letters = word.toUpperCase().split("");
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  const result = letters.join("");
  if (result === word.toUpperCase() && word.length > 1) return shuffleWord(word);
  return result;
}

// Build words from a raw phrase, with optional hints keyed by lowercase word
function wordsFromPhrase(text, hintMap = {}) {
  return text.split(/\s+/).map((w, i) => {
    const clean = w.replace(/[^a-zA-ZÀ-ÿ0-9'-]/g, "");
    const key = clean.toLowerCase();
    return {
      index: i,
      value: clean.toUpperCase(),
      letterCount: clean.length,
      hints: hintMap[key] || [],
    };
  });
}

// Shortcut helpers
const emoji = (...arr) => ({ type: "emoji", content: { emojis: arr } });
const phrase = (text) => ({ type: "phrase", content: { text } });
const anag = (word) => ({ type: "anagram", content: { scrambled: shuffleWord(word) } });

// ===============================================================
// FACILE — 20 versets (>=10 mots), mots familiers, nombreux indices
// ===============================================================
const facile = {
  name: "Parcours Facile — Premiers pas",
  description: "20 versets accessibles avec beaucoup d'indices pour les mots-cles.",
  phrases: [
    {
      text: "Car Dieu a tant aime le monde qu il a donne son Fils unique",
      reference: "Jean 3:16",
      hints: {
        dieu: [emoji("👑", "☁️", "✨"), phrase("Le Createur, le Pere celeste"), anag("Dieu")],
        aime: [emoji("❤️", "💕", "🥰"), phrase("Sentiment profond d'affection"), anag("aime")],
        monde: [emoji("🌍", "🌎", "🌏"), phrase("La Terre entiere"), anag("monde")],
        donne: [emoji("🎁", "🤲"), phrase("Offrir, faire cadeau"), anag("donne")],
        fils: [emoji("👶", "👦"), phrase("Enfant male"), anag("fils")],
        unique: [emoji("1️⃣", "⭐"), phrase("Seul de son espece"), anag("unique")],
      },
    },
    {
      text: "L Eternel est mon berger je ne manquerai de rien il me fait reposer",
      reference: "Psaume 23:1",
      hints: {
        eternel: [phrase("Celui qui n'a ni debut ni fin"), anag("Eternel")],
        berger: [emoji("🐑", "🌿"), phrase("Celui qui garde les brebis"), anag("berger")],
        manquerai: [phrase("Etre prive de quelque chose"), anag("manquerai")],
        rien: [emoji("0️⃣", "🚫"), phrase("Aucune chose")],
        reposer: [emoji("🛌", "😴"), phrase("Se detendre, dormir"), anag("reposer")],
      },
    },
    {
      text: "Je suis le chemin la verite et la vie nul ne vient au Pere",
      reference: "Jean 14:6",
      hints: {
        chemin: [emoji("🛤️", "👣", "🚶"), phrase("Route, voie qu'on emprunte"), anag("chemin")],
        verite: [emoji("✅", "💡"), phrase("Ce qui est conforme a la realite")],
        vie: [emoji("🌱", "💚", "🫀"), phrase("L'existence, le souffle")],
        pere: [emoji("👨", "👑"), phrase("Celui qui engendre, Dieu")],
      },
    },
    {
      text: "Heureux ceux qui ont faim et soif de la justice ils seront rassasies",
      reference: "Matthieu 5:6",
      hints: {
        heureux: [emoji("😊", "🌟", "🎉"), phrase("Qui eprouve du bonheur, beni")],
        faim: [emoji("🍽️", "😋"), phrase("Besoin de manger")],
        soif: [emoji("💧", "🥤"), phrase("Besoin de boire")],
        justice: [emoji("⚖️", "😇"), phrase("Ce qui est droit et equitable")],
        rassasies: [emoji("🍲", "✅"), phrase("Nourris, combles")],
      },
    },
    {
      text: "Demandez et l on vous donnera cherchez et vous trouverez frappez et l on ouvrira",
      reference: "Matthieu 7:7",
      hints: {
        demandez: [emoji("🙋", "🗣️", "❓"), phrase("Formuler une requete"), anag("Demandez")],
        donnera: [emoji("🎁", "🤲"), phrase("Offrira, accordera")],
        cherchez: [emoji("🔍", "👀"), phrase("Essayez de trouver")],
        trouverez: [emoji("🎯", "💡"), phrase("Decouvrirez")],
        frappez: [emoji("✊", "🚪"), phrase("Cognez a la porte")],
        ouvrira: [emoji("🚪", "🔓"), phrase("Rendra accessible")],
      },
    },
    {
      text: "Ne crains point car je suis avec toi ne te tourne pas d autre cote",
      reference: "Esaie 41:10",
      hints: {
        crains: [emoji("😰", "😱"), phrase("Aie peur"), anag("crains")],
        point: [phrase("Pas du tout, aucunement")],
        avec: [phrase("En compagnie de"), emoji("🤝", "🫂")],
        tourne: [emoji("🔄", "👉"), phrase("Change de direction")],
      },
    },
    {
      text: "Confie toi en l Eternel de tout ton coeur et ne t appuie pas sur ta sagesse",
      reference: "Proverbes 3:5",
      hints: {
        confie: [phrase("Fais confiance, remets"), anag("Confie")],
        eternel: [phrase("Celui qui n'a ni debut ni fin")],
        coeur: [emoji("❤️", "🫀"), phrase("Siege des sentiments")],
        appuie: [phrase("Se reposer sur, se fier a")],
        sagesse: [emoji("🦉", "📖"), phrase("Connaissance profonde et juste")],
      },
    },
    {
      text: "Soyez forts et courageux ne craignez pas car l Eternel votre Dieu marche avec vous",
      reference: "Deuteronome 31:6",
      hints: {
        soyez: [anag("Soyez")],
        forts: [emoji("💪", "🦾"), phrase("Pleins de force")],
        courageux: [emoji("🦁", "⚔️"), phrase("Qui affronte le danger")],
        craignez: [emoji("😰"), phrase("Ayez peur")],
        marche: [emoji("🚶", "👣"), phrase("Avance, accompagne")],
      },
    },
    {
      text: "Jetez sur lui tous vos soucis car lui meme prend soin de vous chaque jour",
      reference: "1 Pierre 5:7",
      hints: {
        jetez: [emoji("🎯", "🤾"), phrase("Lancez, deposez"), anag("Jetez")],
        soucis: [emoji("😟", "😰"), phrase("Inquietudes, preoccupations")],
        prend: [phrase("Saisit, s'occupe de")],
        soin: [emoji("🩹", "❤️"), phrase("Attention bienveillante")],
        jour: [emoji("☀️", "📅"), phrase("Periode de 24 heures")],
      },
    },
    {
      text: "Aime ton prochain comme toi meme c est le plus grand des commandements divins",
      reference: "Marc 12:31",
      hints: {
        aime: [emoji("❤️", "🤗"), phrase("Eprouve de l'affection"), anag("Aime")],
        prochain: [emoji("🧑‍🤝‍🧑", "👫"), phrase("Celui qui est pres de toi")],
        meme: [anag("meme")],
        grand: [emoji("📏", "🗻"), phrase("Important, eleve")],
        commandements: [emoji("📜", "🔟"), phrase("Ordres divins, lois")],
      },
    },
    {
      text: "Le fruit de l Esprit c est l amour la joie la paix la patience la bonte",
      reference: "Galates 5:22",
      hints: {
        fruit: [emoji("🍎", "🌳"), phrase("Resultat, production")],
        esprit: [emoji("🕊️", "✨"), phrase("Souffle divin, Saint-Esprit")],
        amour: [emoji("❤️", "💕"), phrase("Affection profonde")],
        joie: [emoji("😄", "🎉"), phrase("Bonheur intense")],
        paix: [emoji("☮️", "🕊️"), phrase("Harmonie, calme")],
        patience: [emoji("⏳", "🧘"), phrase("Capacite d'attendre sans s'enerver")],
        bonte: [emoji("😇", "💛"), phrase("Qualite de celui qui est bon")],
      },
    },
    {
      text: "Que la paix de Dieu qui surpasse toute intelligence garde vos coeurs en Christ Jesus",
      reference: "Philippiens 4:7",
      hints: {
        paix: [emoji("☮️", "🕊️"), phrase("Calme interieur")],
        dieu: [emoji("👑", "✨"), phrase("Le Createur")],
        surpasse: [phrase("Depasse, est superieur a")],
        intelligence: [emoji("🧠", "💡"), phrase("Capacite de comprendre")],
        coeurs: [emoji("❤️", "🫀"), phrase("Sieges des sentiments")],
      },
    },
    {
      text: "Car je connais les projets que j ai formes sur vous des projets de paix",
      reference: "Jeremie 29:11",
      hints: {
        connais: [emoji("🧠", "👁️"), phrase("Sais, suis informe de")],
        projets: [emoji("📋", "🗺️"), phrase("Plans, intentions")],
        formes: [phrase("Concus, elabores")],
        paix: [emoji("☮️", "🕊️")],
      },
    },
    {
      text: "Venez a moi vous tous qui etes fatigues et charges je vous donnerai du repos",
      reference: "Matthieu 11:28",
      hints: {
        venez: [emoji("➡️", "🚶"), phrase("Approchez, rapprochez")],
        fatigues: [emoji("😩", "😴"), phrase("Uses, epuises")],
        charges: [emoji("📦", "🎒"), phrase("Portant un fardeau")],
        donnerai: [phrase("Offrirai, accorderai")],
        repos: [emoji("🛌", "😌"), phrase("Detente, tranquillite")],
      },
    },
    {
      text: "Le Seigneur est ma lumiere et mon salut de qui aurais je peur dans la vie",
      reference: "Psaume 27:1",
      hints: {
        seigneur: [emoji("👑", "✝️"), phrase("Titre de majeste de Dieu")],
        lumiere: [emoji("💡", "☀️"), phrase("Ce qui eclaire")],
        salut: [emoji("🛟", "🙌"), phrase("Delivrance, liberation")],
        peur: [emoji("😰", "😱"), phrase("Sentiment face au danger")],
      },
    },
    {
      text: "Tout est possible a celui qui croit rien ne vous sera impossible dans la foi",
      reference: "Marc 9:23",
      hints: {
        tout: [emoji("💯", "🌐")],
        possible: [emoji("✅", "💪"), phrase("Realisable, faisable")],
        croit: [emoji("🙏", "✝️"), phrase("A la foi, fait confiance")],
        impossible: [emoji("🚫", "❌"), phrase("Qui ne peut pas se faire")],
        foi: [emoji("🙏", "💫"), phrase("Confiance en Dieu")],
      },
    },
    {
      text: "Heureux les artisans de paix car ils seront appeles fils de Dieu dans le Royaume",
      reference: "Matthieu 5:9",
      hints: {
        heureux: [emoji("😊", "🌟"), phrase("Beni, joyeux")],
        artisans: [emoji("🛠️", "👷"), phrase("Ceux qui creent, construisent")],
        paix: [emoji("☮️", "🕊️")],
        fils: [emoji("👶", "👦")],
        royaume: [emoji("👑", "🏰"), phrase("Pays gouverne par un roi")],
      },
    },
    {
      text: "Rejouissez vous toujours dans le Seigneur je vous le repete encore rejouissez vous toujours",
      reference: "Philippiens 4:4",
      hints: {
        rejouissez: [emoji("🎉", "😄", "💃"), phrase("Soyez pleins de joie"), anag("Rejouissez")],
        toujours: [emoji("♾️", "🕰️"), phrase("En tout temps")],
        seigneur: [emoji("👑", "✝️")],
        repete: [phrase("Dis une nouvelle fois")],
      },
    },
    {
      text: "Goutez et voyez combien l Eternel est bon heureux l homme qui cherche refuge en lui",
      reference: "Psaume 34:8",
      hints: {
        goutez: [emoji("👅", "🍴"), phrase("Prenez le temps de savourer")],
        voyez: [emoji("👁️", "👀"), phrase("Observez, constatez")],
        bon: [emoji("👍", "💛"), phrase("Bienveillant, juste")],
        heureux: [emoji("😊", "🌟")],
        refuge: [emoji("🏠", "🛡️"), phrase("Abri, protection")],
      },
    },
    {
      text: "Que la grace du Seigneur Jesus Christ soit avec vous tous en tout temps amen",
      reference: "Apocalypse 22:21",
      hints: {
        grace: [emoji("🎁", "💝"), phrase("Don gratuit, faveur")],
        seigneur: [emoji("👑", "✝️")],
        christ: [phrase("L'Oint, le Messie")],
        temps: [emoji("⏰", "🕰️"), phrase("Duree, moment")],
        amen: [phrase("Ainsi soit-il, parole d'accord")],
      },
    },
  ],
};

// ===============================================================
// MOYEN — 20 versets (>=10 mots), vocabulaire modere, 1-2 indices
// ===============================================================
const moyen = {
  name: "Parcours Moyen — Pour aller plus loin",
  description: "20 versets d'une difficulte moyenne avec des indices cibles sur les mots-cles.",
  phrases: [
    {
      text: "Car nous sommes son ouvrage ayant ete crees en Jesus Christ pour de bonnes oeuvres",
      reference: "Ephesiens 2:10",
      hints: {
        ouvrage: [phrase("Travail, creation accomplie")],
        crees: [emoji("🎨", "✨"), phrase("Faits, formes")],
        bonnes: [emoji("👍", "💛")],
        oeuvres: [phrase("Actions, travaux accomplis")],
      },
    },
    {
      text: "Je puis tout par celui qui me fortifie et me donne la force chaque jour",
      reference: "Philippiens 4:13",
      hints: {
        puis: [phrase("Je peux")],
        fortifie: [emoji("💪", "🦾"), phrase("Rend fort, renforce")],
        force: [emoji("⚡", "💪")],
      },
    },
    {
      text: "Si quelqu un est en Christ il est une nouvelle creation les choses anciennes sont passees",
      reference: "2 Corinthiens 5:17",
      hints: {
        christ: [phrase("L'Oint, le Messie")],
        creation: [emoji("🌱", "✨"), phrase("Nouvelle naissance")],
        anciennes: [phrase("D'autrefois, du passe")],
        passees: [phrase("Revolues, terminees")],
      },
    },
    {
      text: "L amour est patient il est plein de bonte il ne fait rien de malhonnete",
      reference: "1 Corinthiens 13:4",
      hints: {
        amour: [emoji("❤️", "💕")],
        patient: [emoji("⏳", "🧘"), phrase("Qui sait attendre")],
        bonte: [phrase("Qualite bienveillante")],
        malhonnete: [phrase("Qui trompe, qui ment")],
      },
    },
    {
      text: "L Eternel combattra pour vous et vous vous tiendrez tranquilles face a votre ennemi",
      reference: "Exode 14:14",
      hints: {
        combattra: [emoji("⚔️", "🛡️"), phrase("Luttera a votre place")],
        tranquilles: [emoji("🧘", "😌"), phrase("Calmes, sereins")],
        ennemi: [emoji("😈", "🗡️"), phrase("Adversaire, opposant")],
      },
    },
    {
      text: "Toutes choses concourent au bien de ceux qui aiment Dieu et qui sont ses enfants",
      reference: "Romains 8:28",
      hints: {
        concourent: [phrase("Participent ensemble au meme but")],
        bien: [emoji("👍", "💛")],
        aiment: [emoji("❤️", "💞")],
        enfants: [emoji("👶", "🧒"), phrase("Fils et filles")],
      },
    },
    {
      text: "Confiez vous a l Eternel pour toujours car l Eternel est le rocher des siecles",
      reference: "Esaie 26:4",
      hints: {
        confiez: [phrase("Faites confiance, remettez-vous-en")],
        eternel: [phrase("Celui qui n'a ni debut ni fin")],
        rocher: [emoji("🪨", "⛰️"), phrase("Grosse pierre, symbole de stabilite")],
        siecles: [emoji("📜", "🕰️"), phrase("Longues periodes de cent ans")],
      },
    },
    {
      text: "Heureux l homme qui trouve la sagesse et qui possede l intelligence dans sa vie",
      reference: "Proverbes 3:13",
      hints: {
        heureux: [emoji("😊", "🌟")],
        sagesse: [emoji("🦉", "📖"), phrase("Connaissance juste et profonde")],
        possede: [phrase("Detient, a en sa possession")],
        intelligence: [emoji("🧠", "💡"), phrase("Capacite de comprendre")],
      },
    },
    {
      text: "Remets ton sort a l Eternel et il te soutiendra il ne laissera jamais chanceler",
      reference: "Psaume 55:22",
      hints: {
        remets: [phrase("Confie, livre")],
        sort: [phrase("Destinee, situation")],
        soutiendra: [emoji("🤝", "🦾"), phrase("Aidera, portera")],
        chanceler: [emoji("😵", "🪑"), phrase("Vaciller, perdre l'equilibre")],
      },
    },
    {
      text: "Approchez vous de Dieu et il s approchera de vous purifiez vos mains pecheurs",
      reference: "Jacques 4:8",
      hints: {
        approchez: [emoji("➡️", "🚶"), phrase("Venez plus pres")],
        purifiez: [emoji("🧼", "💧"), phrase("Rendez pur, nettoyez")],
        mains: [emoji("🙌", "✋")],
        pecheurs: [phrase("Ceux qui commettent des fautes")],
      },
    },
    {
      text: "Soyez sobres veillez votre adversaire le diable rode comme un lion rugissant cherchant qui devorer",
      reference: "1 Pierre 5:8",
      hints: {
        sobres: [phrase("Moderes, maitres de soi")],
        veillez: [emoji("👁️", "🕯️"), phrase("Restez eveilles, attentifs")],
        adversaire: [phrase("Celui qui s'oppose")],
        rode: [emoji("🦁", "🚶"), phrase("Erre en tournant autour")],
        rugissant: [emoji("🦁", "🔊"), phrase("Qui pousse un cri terrible")],
        devorer: [emoji("🍽️", "😈"), phrase("Engloutir, manger avidement")],
      },
    },
    {
      text: "L Eternel bat les cedres du Liban il fait bondir le Liban comme un jeune taureau",
      reference: "Psaume 29:5",
      hints: {
        cedres: [emoji("🌲"), phrase("Grands arbres majestueux")],
        liban: [emoji("🏔️"), phrase("Region de grandes montagnes")],
        bondir: [emoji("🦘", "⬆️"), phrase("Sauter, s'elancer")],
        taureau: [emoji("🐂"), phrase("Grand bovin male")],
      },
    },
    {
      text: "Humiliez vous sous la puissante main de Dieu afin qu il vous eleve au temps convenable",
      reference: "1 Pierre 5:6",
      hints: {
        humiliez: [phrase("Baissez-vous, soyez modestes")],
        puissante: [emoji("💪", "⚡"), phrase("Qui a une grande force")],
        eleve: [emoji("⬆️", "👑"), phrase("Mette en haut, honore")],
        convenable: [phrase("Qui convient, approprie")],
      },
    },
    {
      text: "La sagesse du monde est folie devant Dieu car il est ecrit il prend les sages",
      reference: "1 Corinthiens 3:19",
      hints: {
        sagesse: [phrase("Connaissance profonde")],
        folie: [emoji("🤪", "🎭"), phrase("Manque de raison")],
        ecrit: [emoji("📜", "✍️")],
        sages: [emoji("🧙", "🦉"), phrase("Ceux qui connaissent beaucoup")],
      },
    },
    {
      text: "Ne vous conformez pas au siecle present soyez transformes par le renouvellement de l intelligence",
      reference: "Romains 12:2",
      hints: {
        conformez: [phrase("Adaptez-vous, imitez")],
        siecle: [emoji("🕰️"), phrase("Epoque, periode")],
        transformes: [emoji("🦋", "✨"), phrase("Changes profondement")],
        renouvellement: [phrase("Action de rendre neuf")],
        intelligence: [emoji("🧠")],
      },
    },
    {
      text: "Portez les fardeaux les uns des autres et vous accomplirez ainsi la loi de Christ",
      reference: "Galates 6:2",
      hints: {
        portez: [emoji("🎒", "💪"), phrase("Soulevez, soutenez")],
        fardeaux: [emoji("📦", "🎒"), phrase("Charges lourdes a porter")],
        accomplirez: [phrase("Realiserez, executerez")],
      },
    },
    {
      text: "Examinez vous vous memes pour voir si vous etes dans la foi eprouvez vous vous memes",
      reference: "2 Corinthiens 13:5",
      hints: {
        examinez: [emoji("🔍", "👁️"), phrase("Etudiez avec attention")],
        foi: [emoji("🙏", "✝️")],
        eprouvez: [phrase("Testez, mettez a l'epreuve")],
      },
    },
    {
      text: "Revetez vous des armes de lumiere rejetons les oeuvres des tenebres et vivons honnetement",
      reference: "Romains 13:12",
      hints: {
        revetez: [emoji("🧥", "⚔️"), phrase("Habillez-vous, mettez")],
        armes: [emoji("🛡️", "⚔️"), phrase("Instruments de combat")],
        lumiere: [emoji("💡", "☀️")],
        rejetons: [phrase("Abandonnons, ecartons")],
        tenebres: [emoji("🌑", "🕳️"), phrase("Obscurite profonde")],
        honnetement: [phrase("Avec droiture, probite")],
      },
    },
    {
      text: "La charite est patiente elle est pleine de bonte elle n est point envieuse ni jalouse",
      reference: "1 Corinthiens 13:4",
      hints: {
        charite: [emoji("❤️", "🤲"), phrase("Amour bienveillant et actif")],
        patiente: [emoji("⏳"), phrase("Qui sait attendre")],
        envieuse: [emoji("😒", "💚"), phrase("Qui desire ce qu'autrui possede")],
        jalouse: [emoji("😤"), phrase("Inquiete de perdre ce qu'elle a")],
      },
    },
    {
      text: "Cherchez premierement le royaume de Dieu et sa justice toutes les autres choses vous seront donnees",
      reference: "Matthieu 6:33",
      hints: {
        cherchez: [emoji("🔍", "👀"), phrase("Essayez de trouver")],
        premierement: [phrase("Avant toute autre chose")],
        royaume: [emoji("👑", "🏰"), phrase("Domaine d'un roi")],
        justice: [emoji("⚖️"), phrase("Droiture, equite")],
        donnees: [emoji("🎁"), phrase("Offertes, accordees")],
      },
    },
  ],
};

// ===============================================================
// DIFFICILE — 20 versets longs et theologiques, 0-1 indice max
// ===============================================================
const difficile = {
  name: "Parcours Difficile — Pour les aguerris",
  description: "20 versets longs avec un vocabulaire theologique exigeant. Indices rares.",
  phrases: [
    {
      text: "La propitiation accomplie par Jesus Christ le juste manifeste l amour insondable du Pere celeste",
      reference: "1 Jean 2:2",
      hints: {
        propitiation: [phrase("Sacrifice qui apaise la colere divine")],
        insondable: [phrase("Qui ne peut etre mesure ou compris")],
      },
    },
    {
      text: "La sanctification progressive du croyant s opere par la puissance de l Esprit Saint dans la grace",
      reference: "Hebreux 12:14",
      hints: {
        sanctification: [phrase("Processus de mise a part pour Dieu")],
        progressive: [phrase("Qui avance graduellement")],
        opere: [phrase("S'accomplit, se realise")],
      },
    },
    {
      text: "L intercession du Saint Esprit selon Dieu seconde nos faiblesses par des soupirs inexprimables",
      reference: "Romains 8:27",
      hints: {
        intercession: [phrase("Action de prier en faveur d'autrui")],
        seconde: [phrase("Assiste, vient en aide a")],
        inexprimables: [phrase("Qui ne peuvent etre dits avec des mots")],
      },
    },
    {
      text: "La redemption obtenue par le sang precieux de l Agneau sans defaut apporte la remission totale",
      reference: "Ephesiens 1:7",
      hints: {
        redemption: [phrase("Rachat au prix d'une rancon")],
        agneau: [phrase("Figure sacrificielle du Christ")],
        remission: [phrase("Pardon complet des fautes")],
      },
    },
    {
      text: "La plenitude de la divinite habite corporellement en Christ et vous avez tout pleinement en lui",
      reference: "Colossiens 2:9",
      hints: {
        plenitude: [phrase("Etat d'etre entierement rempli")],
        divinite: [phrase("Nature divine")],
        corporellement: [phrase("Dans un corps physique")],
      },
    },
    {
      text: "La reconciliation accomplie par la mort expiatoire du Fils unique restaure l alliance eternelle",
      reference: "2 Corinthiens 5:18",
      hints: {
        reconciliation: [phrase("Restauration d'une relation brisee")],
        expiatoire: [phrase("Qui repare une faute par sacrifice")],
        alliance: [phrase("Pacte solennel divin")],
      },
    },
    {
      text: "L expiation des peches consommee une fois pour toutes a la croix manifeste la justice divine",
      reference: "Hebreux 9:26",
      hints: {
        expiation: [phrase("Reparation d'une faute par un acte")],
        consommee: [phrase("Achevee, menee a terme")],
        manifeste: [phrase("Revele, rend visible")],
      },
    },
    {
      text: "La glorification eternelle promise aux heritiers de la grace depasse toute intelligence humaine",
      reference: "Romains 8:30",
      hints: {
        glorification: [phrase("Etat final de splendeur celeste")],
        heritiers: [phrase("Ceux qui recoivent un heritage")],
      },
    },
    {
      text: "La justification par la foi seule sans les oeuvres meritoires de la loi mosaique accorde la paix",
      reference: "Romains 3:28",
      hints: {
        justification: [phrase("Declaration d'innocence devant Dieu")],
        meritoires: [phrase("Qui meritent une recompense")],
        mosaique: [phrase("Relatif a Moise")],
      },
    },
    {
      text: "La regeneration baptismale par le Saint Esprit confere la vie nouvelle aux croyants repentants",
      reference: "Tite 3:5",
      hints: {
        regeneration: [phrase("Nouvelle naissance spirituelle")],
        baptismale: [phrase("Relative au bapteme")],
        repentants: [phrase("Qui changent de conduite")],
      },
    },
    {
      text: "L adoption filiale accordee aux enfants de Dieu manifeste la tendresse paternelle du Tres Haut",
      reference: "Romains 8:15",
      hints: {
        adoption: [phrase("Acte d'accueillir comme enfant")],
        filiale: [phrase("Propre a un fils")],
        paternelle: [phrase("Propre a un pere")],
      },
    },
    {
      text: "La souverainete absolue du Tres Haut s etend sur toutes choses au ciel et sur la terre",
      reference: "Psaume 103:19",
      hints: {
        souverainete: [phrase("Autorite supreme et independante")],
        absolue: [phrase("Totale, sans limite")],
      },
    },
    {
      text: "L omniscience divine sonde les coeurs et connait les pensees les plus profondes des enfants",
      reference: "Psaume 139:2",
      hints: {
        omniscience: [phrase("Connaissance de toutes choses")],
        sonde: [phrase("Examine en profondeur")],
      },
    },
    {
      text: "La providence mysterieuse du Createur guide ses elus selon son dessein eternel et immuable",
      reference: "Ephesiens 1:11",
      hints: {
        providence: [phrase("Gouvernement divin du monde")],
        elus: [phrase("Ceux qui sont choisis")],
        dessein: [phrase("Projet, intention profonde")],
        immuable: [phrase("Qui ne change jamais")],
      },
    },
    {
      text: "La perseverance inebranlable des saints jusqu a la consommation finale des temps prepare la couronne",
      reference: "Matthieu 24:13",
      hints: {
        perseverance: [phrase("Constance inebranlable")],
        inebranlable: [phrase("Qui ne vacille pas")],
        consommation: [phrase("Accomplissement final")],
      },
    },
    {
      text: "La retribution eternelle proportionnee aux oeuvres de chacun s accomplira selon la stricte justice divine",
      reference: "Romains 2:6",
      hints: {
        retribution: [phrase("Recompense ou punition meritee")],
        proportionnee: [phrase("En juste mesure")],
        stricte: [phrase("Rigoureuse, sans compromis")],
      },
    },
    {
      text: "La transfiguration glorieuse du Messie sur la montagne sainte manifesta sa divinite incommensurable",
      reference: "Matthieu 17:2",
      hints: {
        transfiguration: [phrase("Changement glorieux de l'apparence")],
        messie: [phrase("L'Oint annonce par les prophetes")],
        incommensurable: [phrase("Qui ne peut etre mesure")],
      },
    },
    {
      text: "La parousie triomphale du Seigneur Jesus Christ consommera la restauration ultime de toutes choses creees",
      reference: "Tite 2:13",
      hints: {
        parousie: [phrase("Second avenement du Christ")],
        triomphale: [phrase("Victorieuse, glorieuse")],
        restauration: [phrase("Remise en l'etat originel")],
        ultime: [phrase("Derniere, definitive")],
      },
    },
    {
      text: "L eschatologie revelee dans l Apocalypse devoile les mysteres inscrutables du royaume a venir",
      reference: "Apocalypse 1:1",
      hints: {
        eschatologie: [phrase("Doctrine des fins dernieres")],
        apocalypse: [phrase("Revelation, devoilement")],
        inscrutables: [phrase("Qu'on ne peut scruter")],
      },
    },
    {
      text: "La theophanie eblouissante sur le mont Sinai manifesta la majeste redoutable du Dieu vivant",
      reference: "Exode 19:18",
      hints: {
        theophanie: [phrase("Manifestation visible de Dieu")],
        eblouissante: [phrase("D'une brillance aveuglante")],
        redoutable: [phrase("Qu'on craint, terrible")],
      },
    },
  ],
};

function buildTemplate(t) {
  return {
    name: t.name,
    description: t.description,
    isPublished: false,
    createdAt: serverTimestamp(),
    phrases: t.phrases.map((p, pi) => ({
      text: p.text,
      reference: p.reference,
      orderIndex: pi,
      words: wordsFromPhrase(p.text, p.hints || {}),
    })),
  };
}

async function deleteExisting(names) {
  const snap = await getDocs(
    query(collection(db, "gameTemplates"), where("name", "in", names))
  );
  if (snap.empty) return 0;
  for (const d of snap.docs) {
    await deleteDoc(doc(db, "gameTemplates", d.id));
  }
  return snap.size;
}

async function run() {
  const templates = [facile, moyen, difficile];
  const names = templates.map((t) => t.name);

  const deleted = await deleteExisting(names);
  if (deleted > 0) {
    console.log(`Deleted ${deleted} existing template(s) with matching names`);
  }

  for (const t of templates) {
    const payload = buildTemplate(t);
    const hintCount = payload.phrases.reduce(
      (s, p) => s + p.words.reduce((sw, w) => sw + w.hints.length, 0),
      0
    );
    const wordCounts = payload.phrases.map((p) => p.words.length);
    const minWords = Math.min(...wordCounts);
    const ref = await addDoc(collection(db, "gameTemplates"), payload);
    console.log(`Created "${t.name}" (${ref.id})`);
    console.log(
      `  ${payload.phrases.length} phrases, ${hintCount} indices, min ${minWords} mots/phrase`
    );
  }
  process.exit(0);
}

run().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
