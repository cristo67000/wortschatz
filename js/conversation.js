'use strict';
/*
 * « Phrases et dialogues » — le modèle.
 *
 * ── Ce que c'est ───────────────────────────────────────────────────────────
 *
 * Le dictionnaire traduit des mots ; ce module donne de quoi *parler* : des
 * phrases toutes faites, bilingues, rangées par situation — demander son
 * chemin, commander, faire répéter —, et de courts dialogues à deux voix. Le
 * contenu fourni vit dans `data/conversation.json`, pré-caché avec la
 * coquille : il est là dès l'installation, hors ligne compris. Ce qu'on écrit
 * soi-même vit dans IndexedDB, dans le magasin `conversation`, à côté des mots
 * personnels — et pour les mêmes raisons : un changement de version des
 * données ne doit jamais y toucher.
 *
 * ── L'identifiant, jamais le texte ─────────────────────────────────────────
 *
 * Une phrase fournie s'appelle `ph-chemin-poste`, une réplique
 * `dg-chemin-poste/r3`, une phrase à soi `pp-…`, un dialogue à soi `pd-…` et
 * ses répliques `pd-…/r-…`. Les cartes de révision et les notes se rangent
 * sous ces identifiants, pas sous le texte : corriger une faute dans une
 * phrase personnelle ne perd ni sa note ni ses trois mois d'intervalle, et
 * une retouche du contenu fourni ne renomme aucune carte.
 *
 * ── Une réplique et une phrase peuvent être la même chose ──────────────────
 *
 * « Ist es weit? » figure dans la liste des phrases et dans le dialogue de la
 * poste. Les apprendre l'une depuis sa fiche, l'autre depuis le dialogue,
 * doit donner les **mêmes** cartes. Chaque réplique a donc un identifiant
 * canonique : celui de la phrase qu'elle désigne (`phrase` dans les données),
 * ou, à défaut, celui du premier élément dont le texte est le même dans les
 * deux langues — à la casse et à la ponctuation près —, ou le sien. C'est
 * `canonique()`, et tout ce qui apprend passe par lui.
 *
 * ── L'entrée a la forme de celles du dictionnaire ──────────────────────────
 *
 * `entree(id)` rend ce que `Lexique.ouvrir()` rend pour un mot : une vedette
 * (le texte allemand), une langue, des lectures avec leurs traductions (le
 * texte français et ses variantes). La séance, les exercices et le
 * planificateur y voient une entrée comme une autre ; un champ `conversation`
 * les prévient là où ça compte — pas de carte de genre, des leurres qui
 * soient des phrases, une correction qui tolère la ponctuation.
 *
 * La vedette est le texte allemand pour toutes les phrases, quelle que soit la
 * langue de l'interface : c'est ce qui rend les cartes stables. Le réglage
 * « sens de travail » fait le reste — « vers l'allemand » ne fabrique que la
 * carte qui produit l'allemand, « vers le français » celle qui produit le
 * français, comme pour un mot.
 */
(function (racine) {

  const FICHIER = 'data/conversation.json';
  const FORMAT = 'wortschatz-conversation';

  const TEXTE_MAX = 240;          // une réplique, une phrase
  const TITRE_MAX = 120;
  const SITUATION_MAX = 300;
  const VARIANTES_MAX = 6;
  const REPLIQUES_MIN = 2;
  const REPLIQUES_MAX = 12;
  const REGISTRES = ['', 'poli', 'familier'];

  const etat = {
    fourni: null,                 // le fichier, tel quel
    themes: [],
    phrases: new Map(),           // id → phrase (fournie ou à soi)
    dialogues: new Map(),         // id → dialogue (fourni ou à soi)
    repliques: new Map(),         // 'dg-x/r1' → { dialogue, replique, rang }
    canon: new Map(),             // id → identifiant canonique
    index: [],                    // ce que la recherche parcourt
    perso: new Map(),             // id → enregistrement brut, à soi
    charge: false,
  };

  // ── Petites choses ────────────────────────────────────────────────────────

  function maintenant() {
    return Date.now();
  }

  function hasard() {
    return Math.random().toString(36).slice(2, 8);
  }

  /* Un texte qui existe dans les deux langues, ou dans une seule. Le contenu
   * fourni écrit `{fr, de}` ; une saisie personnelle n'est écrite qu'une fois. */
  function texte(valeur, langue) {
    if (valeur === undefined || valeur === null) return '';
    if (typeof valeur === 'string') return valeur;
    return valeur[langue] || valeur.fr || valeur.de || '';
  }

  /* La typographie française : une espace fine insécable devant ? ! ; et une
   * insécable devant le deux-points et à l'intérieur des guillemets. Les
   * données s'écrivent avec des espaces ordinaires — plus faciles à relire —
   * et reçoivent la bonne espace ici. La recherche et la correction passent
   * par `Lexique.cle()`, qui les ramène toutes à une espace simple. */
  function typographier(fr) {
    return String(fr || '')
      .replace(/ ([?!;])/g, '\u{202F}$1')
      .replace(/ :/g, '\xA0:')
      .replace(/« /g, '«\xA0')
      .replace(/ »/g, '\xA0»');
  }

  /* Ce qu'on lit à voix haute : sans la précision entre parenthèses qui
   * distingue « Bonjour ! (le matin) » de « Bonjour ! ». */
  function texteParle(valeur) {
    return String(valeur || '').replace(/\s*\([^)]*\)/g, '').trim();
  }

  /* La clé d'un texte pour comparer deux phrases : ni casse, ni accents, ni
   * ponctuation, ni apostrophes. « C’est clair, merci. » et « c'est clair
   * merci ! » sont la même phrase. */
  function cleTexte(valeur) {
    const mots = Lexique.cle(texteParle(valeur)).match(/[\p{L}\p{N}]+/gu);
    return mots ? mots.join(' ') : '';
  }

  function motsDe(valeur) {
    return cleTexte(valeur).split(' ').filter(Boolean);
  }

  // ── Ce qu'on accepte d'une saisie ─────────────────────────────────────────

  function assainirLigne(valeur, limite) {
    if (valeur === undefined || valeur === null) return '';
    return String(valeur)
      .replace(/[\x00-\x08\x0B-\x1F\x7F\u{2028}\u{2029}]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, limite || TEXTE_MAX);
  }

  function listeAssainie(valeur, limite, combien) {
    const brut = Array.isArray(valeur) ? valeur : String(valeur || '').split(/\n/);
    const vues = [];
    for (const morceau of brut) {
      const propre = assainirLigne(morceau, limite || TEXTE_MAX);
      if (propre && vues.indexOf(propre) === -1) vues.push(propre);
      if (vues.length >= (combien || VARIANTES_MAX)) break;
    }
    return vues;
  }

  function themeValide(id) {
    return etat.themes.some((t) => t.id === id) ? id : 'autre';
  }

  /* Une phrase à soi : les deux textes sont obligatoires, le reste non. */
  function normaliserPhrase(brut) {
    const fr = assainirLigne(brut.fr, TEXTE_MAX);
    const de = assainirLigne(brut.de, TEXTE_MAX);
    const manques = [];
    if (!fr) manques.push('fr');
    if (!de) manques.push('de');
    const variantes = {
      fr: listeAssainie(brut.variantes && brut.variantes.fr).filter((v) => v !== fr),
      de: listeAssainie(brut.variantes && brut.variantes.de).filter((v) => v !== de),
    };
    return {
      valide: manques.length === 0,
      manques,
      valeurs: {
        sorte: 'phrase',
        fr, de,
        theme: themeValide(brut.theme),
        registre: REGISTRES.indexOf(brut.registre) !== -1 ? brut.registre : '',
        situation: assainirLigne(brut.situation, SITUATION_MAX),
        variantes,
      },
    };
  }

  /* Un dialogue à soi : un titre, deux à douze répliques, chacune dans les
   * deux langues et attribuée à A ou B. Une réplique garde l'identifiant
   * qu'elle avait — c'est lui que ses cartes portent —, une nouvelle en
   * reçoit un. */
  function normaliserDialogue(brut) {
    const titre = assainirLigne(brut.titre, TITRE_MAX);
    const roles = {
      A: assainirLigne(brut.roles && brut.roles.A, 40),
      B: assainirLigne(brut.roles && brut.roles.B, 40),
    };
    const repliques = [];
    const idsVus = new Set();
    for (const ligne of (Array.isArray(brut.repliques) ? brut.repliques : [])) {
      if (!ligne || typeof ligne !== 'object') continue;
      const fr = assainirLigne(ligne.fr, TEXTE_MAX);
      const de = assainirLigne(ligne.de, TEXTE_MAX);
      if (!fr && !de) continue;          // une ligne restée vide n'est pas une réplique
      let id = typeof ligne.id === 'string' && /^r-[\w-]{1,20}$/.test(ligne.id)
        ? ligne.id : null;
      if (!id || idsVus.has(id)) id = 'r-' + hasard();
      idsVus.add(id);
      repliques.push({ id, qui: ligne.qui === 'B' ? 'B' : 'A', fr, de });
      if (repliques.length >= REPLIQUES_MAX) break;
    }
    const manques = [];
    if (!titre) manques.push('titre');
    if (repliques.length < REPLIQUES_MIN) manques.push('repliques');
    if (repliques.some((r) => !r.fr || !r.de)) manques.push('replique-incomplete');
    return {
      valide: manques.length === 0,
      manques,
      valeurs: {
        sorte: 'dialogue',
        titre,
        theme: themeValide(brut.theme),
        registre: REGISTRES.indexOf(brut.registre) !== -1 ? brut.registre : '',
        roles,
        repliques,
      },
    };
  }

  // ── Chargement ────────────────────────────────────────────────────────────

  async function lireFourni() {
    const reponse = await fetch(FICHIER);
    if (!reponse.ok) throw new Error(FICHIER + ' : ' + reponse.status);
    const brut = await reponse.json();
    if (!brut || brut.format !== FORMAT) throw new Error(FICHIER + ' : format inattendu');
    return brut;
  }

  /* Range tout — le fourni et le sien — dans les tables, puis calcule les
   * identifiants canoniques et l'index de recherche. Rappelé après chaque
   * changement de ce qu'on a écrit soi-même : quelques centaines d'éléments,
   * c'est instantané. */
  function indexer() {
    etat.phrases.clear();
    etat.dialogues.clear();
    etat.repliques.clear();
    etat.canon.clear();
    etat.index = [];

    const fourni = etat.fourni || { themes: [], phrases: [], dialogues: [] };
    etat.themes = (fourni.themes || []).map((t) => ({ id: t.id, fr: t.fr, de: t.de }));

    for (const p of fourni.phrases || []) {
      etat.phrases.set(p.id, Object.assign({}, p, {
        fr: typographier(p.fr), sorte: 'phrase', origine: 'fourni',
        variantes: {
          fr: ((p.variantes && p.variantes.fr) || []).map(typographier),
          de: (p.variantes && p.variantes.de) || [],
        },
        situation: p.situation && typeof p.situation === 'object'
          ? { fr: typographier(p.situation.fr), de: p.situation.de || '' }
          : typographier(p.situation || ''),
      }));
    }
    for (const enregistrement of etat.perso.values()) {
      if (enregistrement.sorte !== 'phrase') continue;
      etat.phrases.set(enregistrement.id, Object.assign({}, enregistrement, {
        fr: typographier(enregistrement.fr), origine: 'perso',
        variantes: {
          fr: ((enregistrement.variantes && enregistrement.variantes.fr) || []).map(typographier),
          de: (enregistrement.variantes && enregistrement.variantes.de) || [],
        },
        situation: typographier(enregistrement.situation || ''),
      }));
    }

    const rangerDialogue = (d, origine) => {
      const dialogue = Object.assign({}, d, {
        sorte: 'dialogue', origine,
        titre: typeof d.titre === 'object' && d.titre
          ? { fr: typographier(d.titre.fr), de: d.titre.de || '' }
          : typographier(d.titre || ''),
        repliques: (d.repliques || []).map((r, rang) => Object.assign({}, r, {
          fr: typographier(r.fr), rang, idComplet: d.id + '/' + r.id,
        })),
      });
      etat.dialogues.set(dialogue.id, dialogue);
      dialogue.repliques.forEach((replique, rang) => {
        etat.repliques.set(replique.idComplet, { dialogue, replique, rang });
      });
    };
    for (const d of fourni.dialogues || []) rangerDialogue(d, 'fourni');
    for (const enregistrement of etat.perso.values()) {
      if (enregistrement.sorte === 'dialogue') rangerDialogue(enregistrement, 'perso');
    }

    /* Les identifiants canoniques. Le premier venu, dans l'ordre phrases puis
     * répliques, tient le texte ; les suivants le désignent. */
    const parTexte = new Map();
    const empreinte = (fr, de) => cleTexte(de) + '\n' + cleTexte(fr);
    for (const [id, p] of etat.phrases) {
      const e = empreinte(p.fr, p.de);
      if (!parTexte.has(e)) parTexte.set(e, id);
      etat.canon.set(id, parTexte.get(e));
    }
    for (const [id, { replique }] of etat.repliques) {
      const designee = replique.phrase && etat.phrases.has(replique.phrase)
        ? etat.canon.get(replique.phrase) : null;
      if (designee) { etat.canon.set(id, designee); continue; }
      const e = empreinte(replique.fr, replique.de);
      if (!parTexte.has(e)) parTexte.set(e, id);
      etat.canon.set(id, parTexte.get(e));
    }

    // L'index de recherche : les mots de chaque texte, dans les deux langues.
    for (const [id, p] of etat.phrases) {
      etat.index.push({ sorte: 'phrase', id, theme: p.theme,
                        fr: motsDe(p.fr), de: motsDe(p.de) });
    }
    for (const [id, d] of etat.dialogues) {
      etat.index.push({ sorte: 'titre', id, dialogue: id, theme: d.theme,
                        fr: motsDe(texte(d.titre, 'fr')), de: motsDe(texte(d.titre, 'de')) });
      for (const r of d.repliques) {
        etat.index.push({ sorte: 'replique', id: r.idComplet, dialogue: id, theme: d.theme,
                          fr: motsDe(r.fr), de: motsDe(r.de) });
      }
    }
  }

  async function chargerPerso() {
    try {
      const tous = await Store.touteLaConversation();
      etat.perso = new Map(tous.map((e) => [e.id, e]));
    } catch (erreur) {
      /* Une base refusée — navigation privée — ne prive pas du contenu
       * fourni : on repart sans ce qu'on avait écrit. */
      etat.perso = new Map();
    }
  }

  async function charger() {
    if (!etat.fourni) {
      try {
        etat.fourni = await lireFourni();
      } catch (erreur) {
        /* Le fichier manque ou ne se lit pas — un cache d'une version
         * antérieure, par exemple. Le module reste utilisable pour ce qu'on a
         * écrit soi-même, et le dit par `disponible`. */
        etat.fourni = null;
      }
    }
    await chargerPerso();
    indexer();
    etat.charge = true;
    return etat;
  }

  // ── Lecture ───────────────────────────────────────────────────────────────

  function themes() {
    return etat.themes.slice();
  }

  function theme(id) {
    return etat.themes.find((t) => t.id === id) || null;
  }

  function phrases(filtre) {
    const sortie = Array.from(etat.phrases.values());
    return filtre ? sortie.filter(filtre) : sortie;
  }

  function dialogues(filtre) {
    const sortie = Array.from(etat.dialogues.values());
    return filtre ? sortie.filter(filtre) : sortie;
  }

  function phrase(id) {
    return etat.phrases.get(id) || null;
  }

  function dialogue(id) {
    return etat.dialogues.get(id) || null;
  }

  function replique(idComplet) {
    return etat.repliques.get(idComplet) || null;
  }

  function existe(id) {
    return etat.phrases.has(id) || etat.repliques.has(id) || etat.dialogues.has(id);
  }

  function estPersonnel(id) {
    const racineId = String(id || '').split('/')[0];
    return etat.perso.has(racineId);
  }

  function canonique(id) {
    if (!id) return null;
    return etat.canon.get(id) || (existe(id) ? id : null);
  }

  /* Les deux textes d'un identifiant apprenable — phrase ou réplique —,
   * avec leurs variantes. Rend null pour un dialogue entier ou un inconnu. */
  function textes(id) {
    const p = etat.phrases.get(id);
    if (p) return { fr: p.fr, de: p.de, variantes: p.variantes, source: p };
    const r = etat.repliques.get(id);
    if (r) return { fr: r.replique.fr, de: r.replique.de, variantes: { fr: [], de: [] },
                    source: r.replique, dialogue: r.dialogue };
    return null;
  }

  /* Ce qu'une liste montre d'un identifiant : un aperçu court. */
  function apercu(id) {
    const t = textes(canonique(id) || id);
    if (!t) return null;
    return { fr: t.fr, de: t.de, dialogue: t.dialogue ? t.dialogue.id : null };
  }

  /* L'entrée au format du dictionnaire. Voir l'en-tête : la vedette est le
   * texte allemand, les traductions le texte français et ses variantes. */
  function entree(id) {
    const canon = canonique(id);
    if (!canon) return null;
    const t = textes(canon);
    if (!t) return null;
    const p = etat.phrases.get(canon);
    const traductions = [t.fr].concat(t.variantes.fr || []);
    const lecture = ['', '', '', [], [['', traductions, [], []]], [], []];
    return {
      mot: t.de,
      langue: 'de',
      bande: 0,
      tranche: -1,
      lectures: [lecture],
      phrases: [],
      voisins: [],
      paires: [],
      conversation: canon,
      sorte: p ? 'phrase' : 'replique',
      variantes: { de: (t.variantes.de || []).slice(), fr: (t.variantes.fr || []).slice() },
      theme: p ? p.theme : (t.dialogue ? t.dialogue.theme : null),
      registre: p ? (p.registre || '') : (t.dialogue ? (t.dialogue.registre || '') : ''),
      situation: p ? p.situation : '',
      origine: p ? p.origine : (t.dialogue ? t.dialogue.origine : 'fourni'),
      dialogue: t.dialogue ? t.dialogue.id : null,
      perso: null,
    };
  }

  /* Les dialogues où une phrase apparaît, par son identifiant canonique. */
  function dialoguesAvec(id) {
    const canon = canonique(id);
    const sortie = [];
    for (const d of etat.dialogues.values()) {
      if (d.repliques.some((r) => etat.canon.get(r.idComplet) === canon)) sortie.push(d);
    }
    return sortie;
  }

  /* D'autres phrases, pour les questions à choix. Même thème d'abord — un
   * leurre qui parle d'autre chose se devine sans savoir la phrase —, puis
   * n'importe laquelle. Jamais un texte identique à la cible, dans l'une ou
   * l'autre langue. */
  function leurres(cible, combien) {
    const memeTexte = (p) => cleTexte(p.de) === cleTexte(cible.mot)
      || Exercices.traductions(cible).some((t) => cleTexte(t) === cleTexte(p.fr));
    const candidates = phrases((p) => etat.canon.get(p.id) !== cible.conversation && !memeTexte(p));
    const proches = Exercices.melanger(candidates.filter((p) => p.theme === cible.theme));
    const autres = Exercices.melanger(candidates.filter((p) => p.theme !== cible.theme));
    return proches.concat(autres).slice(0, combien)
      .map((p) => entree(p.id)).filter(Boolean);
  }

  // ── Recherche ─────────────────────────────────────────────────────────────

  /* Un mot de l'index répond-il à un mot tapé ? Par son début, toujours ;
   * par l'intérieur aussi quand la saisie a quatre lettres — c'est ce qui
   * fait que « Bahnhof » trouve « Hauptbahnhof ». Un mot entier vaut plus. */
  function correspond(mots, jeton) {
    let meilleur = 0;
    for (const mot of mots) {
      if (mot === jeton) return 3;
      if (mot.startsWith(jeton)) meilleur = Math.max(meilleur, 2);
      else if (jeton.length >= 4 && mot.indexOf(jeton) !== -1) meilleur = Math.max(meilleur, 1);
    }
    return meilleur;
  }

  /* Cherche dans les deux langues, pendant la frappe. Tous les mots tapés
   * doivent se trouver, chacun dans l'une ou l'autre langue du même élément.
   *
   * `options.type` vaut 'phrase' ou 'dialogue' pour ne garder que l'un des
   * deux, `options.theme` restreint à une situation. Rend des résultats
   * `{sorte, id, dialogue, score, replique}` — une phrase, ou un dialogue
   * atteint par son titre ou par l'une de ses répliques, laquelle est jointe
   * pour l'afficher en extrait. Un dialogue ne revient qu'une fois. */
  function chercher(saisie, options) {
    const reglages = options || {};
    const jetons = motsDe(saisie).filter((j) => j.length >= 2);
    if (!jetons.length) return [];

    const parId = new Map();
    for (const element of etat.index) {
      if (reglages.theme && element.theme !== reglages.theme) continue;
      if (reglages.type === 'phrase' && element.sorte !== 'phrase') continue;
      if (reglages.type === 'dialogue' && element.sorte === 'phrase') continue;
      let score = 0;
      let tout = true;
      for (const jeton of jetons) {
        const s = Math.max(correspond(element.fr, jeton), correspond(element.de, jeton));
        if (!s) { tout = false; break; }
        score += s;
      }
      if (!tout) continue;
      if (element.sorte === 'phrase') {
        parId.set('phrase ' + element.id, { sorte: 'phrase', id: element.id, score });
        continue;
      }
      const cle = 'dialogue ' + element.dialogue;
      const deja = parId.get(cle);
      const replique = element.sorte === 'replique' ? etat.repliques.get(element.id) : null;
      if (!deja) {
        parId.set(cle, { sorte: 'dialogue', id: element.dialogue, score,
                         replique: replique ? replique.replique : null });
      } else if (score > deja.score || (replique && !deja.replique)) {
        // Le titre a pu répondre le premier : la réplique vaut mieux en extrait.
        deja.score = Math.max(deja.score, score);
        if (replique) deja.replique = replique.replique;
      }
    }
    const resultats = Array.from(parId.values());
    resultats.sort((a, b) => {
      if (a.sorte !== b.sorte) return a.sorte === 'phrase' ? -1 : 1;
      return b.score - a.score;
    });
    return reglages.plafond ? resultats.slice(0, reglages.plafond) : resultats;
  }

  // ── Ce qu'on écrit soi-même ───────────────────────────────────────────────

  async function creer(sorte, donnees) {
    const controle = sorte === 'dialogue' ? normaliserDialogue(donnees) : normaliserPhrase(donnees);
    if (!controle.valide) throw new Error('conversation : ' + controle.manques.join(', '));
    const instant = maintenant();
    const enregistrement = Object.assign({
      id: (sorte === 'dialogue' ? 'pd-' : 'pp-') + instant.toString(36) + '-' + hasard(),
      cree: instant, modifie: instant,
    }, controle.valeurs);
    await Store.ecrireConversation(enregistrement);
    etat.perso.set(enregistrement.id, enregistrement);
    indexer();
    return enregistrement;
  }

  /* Modifier garde l'identifiant, la date de création, les cartes et les
   * notes. Les cartes d'une phrase dont le texte change reçoivent la nouvelle
   * graphie à afficher, et rien d'autre : leur échéance, leur intervalle et
   * leur facilité ne bougent pas. */
  async function modifier(id, donnees) {
    const ancien = etat.perso.get(id);
    if (!ancien) throw new Error('conversation : identifiant inconnu');
    const controle = ancien.sorte === 'dialogue'
      ? normaliserDialogue(donnees) : normaliserPhrase(donnees);
    if (!controle.valide) throw new Error('conversation : ' + controle.manques.join(', '));
    const enregistrement = Object.assign({}, ancien, controle.valeurs,
      { id, cree: ancien.cree, modifie: maintenant() });
    await Store.ecrireConversation(enregistrement);
    etat.perso.set(id, enregistrement);
    indexer();
    await accorderLesCartes(enregistrement);
    return enregistrement;
  }

  /* Après une modification, les cartes redisent le texte à afficher. Une
   * réplique disparue emporte ses cartes : une question sur une phrase qui
   * n'existe plus n'aurait pas de réponse à montrer. */
  async function accorderLesCartes(enregistrement) {
    const ids = enregistrement.sorte === 'dialogue'
      ? enregistrement.repliques.map((r) => enregistrement.id + '/' + r.id)
      : [enregistrement.id];
    const toutes = await Store.toutesLesCartes().catch(() => []);
    const prefixe = enregistrement.id;
    for (const carte of toutes) {
      if (!carte.conversation) continue;
      const sienne = carte.conversation === prefixe || carte.conversation.startsWith(prefixe + '/');
      if (!sienne) continue;
      if (ids.indexOf(carte.conversation) === -1) {
        await Store.supprimerCarte(carte.id).catch(() => {});
        continue;
      }
      const t = textes(carte.conversation);
      if (t && carte.mot !== t.de) {
        carte.mot = t.de;
        await Store.ecrireCarte(carte).catch(() => {});
      }
    }
  }

  async function cartesDe(id) {
    const ids = [];
    const enregistrement = etat.perso.get(id);
    if (enregistrement && enregistrement.sorte === 'dialogue') {
      for (const r of enregistrement.repliques) ids.push(id + '/' + r.id);
    } else {
      ids.push(id);
    }
    const sortie = [];
    for (const un of ids) {
      const canon = canonique(un) || un;
      sortie.push(...(await Store.cartesDeConversation(canon).catch(() => [])));
    }
    return sortie;
  }

  /* Supprimer, et pouvoir le défaire : l'enregistrement, ses cartes et ses
   * notes reviennent à l'identique. Les cartes d'une réplique qui désigne une
   * phrase fournie ne sont pas à nous : elles restent. */
  async function supprimer(id) {
    const enregistrement = etat.perso.get(id);
    if (!enregistrement) return null;
    const cartes = (await cartesDe(id)).filter((c) => c.conversation.startsWith(id));
    const notes = [];
    const idsNotes = enregistrement.sorte === 'dialogue'
      ? [id].concat(enregistrement.repliques.map((r) => id + '/' + r.id)) : [id];
    for (const un of idsNotes) {
      const note = await Store.lireNote('conv:' + un).catch(() => null);
      if (note) notes.push(note);
    }
    for (const carte of cartes) await Store.supprimerCarte(carte.id).catch(() => {});
    for (const note of notes) await Store.supprimerNote(note.id).catch(() => {});
    await Store.supprimerConversation(id);
    etat.perso.delete(id);
    indexer();
    return { enregistrement, cartes, notes };
  }

  async function remettre(retrait) {
    if (!retrait || !retrait.enregistrement) return;
    await Store.ecrireConversation(retrait.enregistrement);
    etat.perso.set(retrait.enregistrement.id, retrait.enregistrement);
    indexer();
    for (const carte of retrait.cartes) await Store.ecrireCarte(carte).catch(() => {});
    for (const note of retrait.notes) await Store.ecrireNote(note).catch(() => {});
  }

  function personnels() {
    return Array.from(etat.perso.values()).sort((a, b) => b.modifie - a.modifie);
  }

  function brut(id) {
    return etat.perso.get(id) || null;
  }

  function compter() {
    let repliques = 0;
    for (const d of etat.dialogues.values()) repliques += d.repliques.length;
    return {
      phrases: etat.phrases.size,
      dialogues: etat.dialogues.size,
      repliques,
      personnels: etat.perso.size,
    };
  }

  racine.Conversation = {
    FORMAT, TEXTE_MAX, TITRE_MAX, SITUATION_MAX, VARIANTES_MAX, REPLIQUES_MIN, REPLIQUES_MAX,
    REGISTRES,
    charger, chargerPerso, indexer,
    themes, theme, phrases, dialogues, phrase, dialogue, replique, existe, estPersonnel,
    canonique, textes, apercu, entree, dialoguesAvec, leurres, chercher,
    creer, modifier, supprimer, remettre, personnels, brut, cartesDe, accorderLesCartes,
    normaliserPhrase, normaliserDialogue, assainirLigne, listeAssainie,
    texte, texteParle, typographier, cleTexte, compter,
    get provenance() { return etat.fourni ? etat.fourni.provenance : null; },
    get construit() { return etat.fourni ? etat.fourni.construit : null; },
    get disponible() { return !!etat.fourni; },
    get charge() { return etat.charge; },
  };

})(window);
