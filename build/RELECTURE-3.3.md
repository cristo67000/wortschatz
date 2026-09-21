# Wortschatz — phrases et dialogues à relire (version 3.3)

Contenu ajouté depuis la révision `main` : **132 phrases** et **14 dialogues** (93 répliques), rédigés par un assistant d’écriture (Claude) et **non relus par un locuteur natif**. Ce document est fait pour la relecture du texte allemand, et de son équivalent français si la relectrice le souhaite.

Ce qu’il est utile de dire pour chaque ligne : *naturel* / *acceptable mais on dirait plutôt …* / *faux*. L’identifiant permet de reporter la correction dans `data/conversation.json` sans rien casser : les cartes de révision des utilisateurs ne portent jamais le texte, seulement l’identifiant.

Les 26 dialogues de la version 3.2 ont déjà été validés en allemand et ne figurent pas ici. Les 148 phrases isolées de la 3.2 n’ont pas été relues non plus ; elles se listent avec `python build/relecture.py <révision d’avant la 3.2>` si l’on veut les revoir.

Le *contexte* est la notice que l’application affiche sous la phrase (« Quand l’employer »). Le *registre* dit à qui la phrase s’adresse : *poli* (vouvoiement) ou *familier* (tutoiement).

## Phrases

### Saluer, se présenter, prendre congé — *Grüßen, sich vorstellen, sich verabschieden* (`saluer`, 8 phrases)

| Identifiant | Allemand | Français | Registre · contexte |
|---|---|---|---|
| `ph-saluer-a-tout-a-l-heure` | Bis gleich!<br>*var. : Bis nachher!* | À tout à l’heure !<br>*var. : À tout de suite !* | *—* · Quand on se revoit dans la journée. « Bis gleich » : dans quelques minutes ; « bis nachher » : plus tard dans la journée. |
| `ph-saluer-bonne-soiree` | Schönen Abend noch!<br>*var. : Einen schönen Abend!* | Bonne soirée !<br>*var. : Bonne fin de soirée !* | *—* · En se quittant le soir. |
| `ph-saluer-bonne-continuation` | Alles Gute!<br>*var. : Weiterhin alles Gute!* | Bonne continuation ! | *—* · En quittant quelqu’un qu’on ne reverra pas de sitôt. « Alles Gute » sert aussi de vœu général. |
| `ph-saluer-bonnes-vacances` | Schönen Urlaub!<br>*var. : Schöne Ferien!* | Bonnes vacances ! | *—* · « Urlaub » pour les congés, « Ferien » pour les vacances scolaires. |
| `ph-saluer-bon-voyage` | Gute Reise!<br>*var. : Gute Fahrt!* | Bon voyage !<br>*var. : Bonne route !* | *—* · Avant un départ. « Gute Fahrt » pour un trajet en voiture ou en train. |
| `ph-saluer-ca-fait-longtemps` | Lange nicht gesehen!<br>*var. : Wir haben uns lange nicht gesehen.* | Ça fait longtemps !<br>*var. : Ça fait un bail !* | *—* · En retrouvant quelqu’un après des mois. |
| `ph-saluer-bon-anniversaire` | Alles Gute zum Geburtstag!<br>*var. : Herzlichen Glückwunsch zum Geburtstag!* | Bon anniversaire !<br>*var. : Joyeux anniversaire !* | *—* · Le vœu le plus courant ; « herzlichen Glückwunsch » est un peu plus formel. |
| `ph-saluer-felicitations` | Herzlichen Glückwunsch!<br>*var. : Glückwunsch! · Gratuliere!* | Félicitations !<br>*var. : Toutes mes félicitations !* | *—* · Pour un succès, une naissance, un mariage. |

### Demander son chemin — *Nach dem Weg fragen* (`chemin`, 1 phrase)

| Identifiant | Allemand | Français | Registre · contexte |
|---|---|---|---|
| `ph-chemin-loin-a-pied-ou-bus` | Ist es weit zu Fuß, oder lohnt sich der Bus? | C’est loin à pied, ou ça vaut le coup de prendre le bus ? | *—* · Pour choisir entre marcher et attendre. |

### Transports — *Verkehrsmittel* (`transports`, 3 phrases)

| Identifiant | Allemand | Français | Registre · contexte |
|---|---|---|---|
| `ph-transports-billet-journee` | Lohnt es sich, ein Tagesticket zu kaufen? | Est-ce que ça vaut le coup de prendre un billet à la journée ?<br>*var. : Ça vaut le coup, un billet à la journée ?* | *—* · Au guichet ou à un passant, quand on compte prendre plusieurs fois le tram. |
| `ph-transports-train-rate` | Ich habe meinen Zug verpasst.<br>*var. : Ich habe den Zug verpasst.* | J’ai raté mon train.<br>*var. : J’ai loupé mon train.* | *—* · Au guichet, pour savoir quoi faire. |
| `ph-transports-prochain-dans-dix-minutes` | Der nächste fährt in zehn Minuten.<br>*var. : Der nächste kommt in zehn Minuten.* | Le prochain part dans dix minutes.<br>*var. : Le prochain est dans dix minutes.* | *—* · La réponse qu’on espère. |

### Restaurant et café — *Restaurant und Café* (`restaurant`, 2 phrases)

| Identifiant | Allemand | Français | Registre · contexte |
|---|---|---|---|
| `ph-restaurant-partager-entree` | Sollen wir uns eine Vorspeise teilen?<br>*var. : Teilen wir uns eine Vorspeise?* | On partage une entrée ?<br>*var. : On se partage une entrée ?* | *—* · Entre convives, avant de commander. |
| `ph-restaurant-portions-enormes` | Das lohnt sich nicht, die Portionen sind riesig. | Ça ne vaut pas le coup, les portions sont énormes. | *—* · Pour déconseiller une entrée de plus. |

### Achats et paiement — *Einkaufen und Bezahlen* (`achats`, 3 phrases)

| Identifiant | Allemand | Français | Registre · contexte |
|---|---|---|---|
| `ph-achats-moitie-prix` | Das lohnt sich, der ist um die Hälfte reduziert. | Ça vaut le coup, il est à moitié prix. | *—* · Devant une bonne affaire. « Reduziert » : soldé, remisé. |
| `ph-achats-je-vais-reflechir` | Ich überlege es mir noch.<br>*var. : Ich muss noch überlegen.* | Je vais réfléchir.<br>*var. : Je vais y réfléchir.* | *—* · Pour ne pas acheter tout de suite, sans dire non. |
| `ph-achats-je-repasserai` | Ich komme später noch mal wieder.<br>*var. : Ich komme später wieder.* | Je repasserai plus tard.<br>*var. : Je reviendrai.* | *—* · En quittant le magasin sans avoir acheté. |

### Hôtel — *Hotel* (`hotel`, 3 phrases)

| Identifiant | Allemand | Français | Registre · contexte |
|---|---|---|---|
| `ph-hotel-bon-restaurant` | Gibt es hier in der Nähe ein gutes Restaurant?<br>*var. : Können Sie mir ein Restaurant in der Nähe empfehlen?* | Y a-t-il un bon restaurant dans le coin ?<br>*var. : Il y a un bon restaurant près d’ici ?* | *—* · À la réception, le soir. |
| `ph-hotel-oreiller` | Könnten Sie mir bitte ein zusätzliches Kissen bringen?<br>*var. : Ich hätte gern noch ein Kissen.* | Pourriez-vous m’apporter un oreiller supplémentaire ? | *poli* · Par téléphone, depuis la chambre. |
| `ph-hotel-chambre-bruyante` | Das Zimmer ist sehr laut.<br>*var. : Das Zimmer ist leider sehr laut.* | La chambre est très bruyante.<br>*var. : La chambre est vraiment bruyante.* | *—* · Pour demander à changer de chambre. |

### Rendez-vous — *Termine und Verabredungen* (`rendez-vous`, 17 phrases)

| Identifiant | Allemand | Français | Registre · contexte |
|---|---|---|---|
| `ph-rdv-je-suis-en-route` | Ich bin unterwegs.<br>*var. : Ich bin schon unterwegs.* | Je suis en route.<br>*var. : Je suis en chemin.* | *—* · Par message, pour dire qu’on est parti. |
| `ph-rdv-presque-arrive` | Ich bin gleich da.<br>*var. : Ich bin fast da. · Bin gleich da.* | Je suis presque arrivé.<br>*var. : Je suis presque arrivée. · J’y suis presque.* | *—* · Par message, quand on arrive dans quelques minutes. |
| `ph-rdv-dans-les-bouchons` | Ich stehe im Stau, es dauert noch ein bisschen.<br>*var. : Ich stecke im Stau, es dauert noch etwas.* | Je suis dans les bouchons, ça va prendre encore un peu de temps.<br>*var. : Je suis coincé dans les bouchons, j’en ai encore pour un moment.* | *—* · Pour prévenir d’un retard, avec la raison. |
| `ph-rdv-commence-sans-moi` | Fang schon mal ohne mich an.<br>*var. : Fang ohne mich an.* | Commence sans moi.<br>*var. : Commence sans m’attendre.* | *familier* · À un ami, quand on arrive en retard. Tutoiement. |
| `ph-rdv-ne-m-attendez-pas` | Bitte warten Sie nicht auf mich.<br>*var. : Fangen Sie bitte ohne mich an.* | Ne m’attendez pas, s’il vous plaît.<br>*var. : Commencez sans moi, s’il vous plaît.* | *poli* · La même chose, à des gens qu’on vouvoie. |
| `ph-rdv-ca-te-dit` | Hast du Lust?<br>*var. : Hättest du Lust?* | Ça te dit ?<br>*var. : Ça te tente ? · Tu as envie ?* | *familier* · Pour proposer quelque chose à un ami. Tutoiement. |
| `ph-rdv-randonner-samedi` | Hast du Lust, am Samstag wandern zu gehen? | Ça te dit d’aller randonner samedi ?<br>*var. : Ça te dirait d’aller randonner samedi ?* | *familier* · La proposition complète : « Lust haben » + « zu » + infinitif. Tutoiement. |
| `ph-rdv-ca-vous-dirait` | Hätten Sie Lust, mit uns essen zu gehen?<br>*var. : Möchten Sie mit uns essen gehen?* | Ça vous dirait de venir manger avec nous ? | *poli* · Une invitation à quelqu’un qu’on vouvoie, au conditionnel. |
| `ph-rdv-avec-plaisir` | Ja, sehr gern!<br>*var. : Gerne! · Ja, gern!* | Oui, avec plaisir !<br>*var. : Volontiers !* | *—* · Pour accepter une invitation. |
| `ph-rdv-bonne-idee` | Gute Idee!<br>*var. : Das ist eine gute Idee.* | Bonne idée !<br>*var. : C’est une bonne idée.* | *—* · Pour approuver une proposition. |
| `ph-rdv-pourquoi-pas` | Warum nicht?<br>*var. : Klar, warum nicht?* | Pourquoi pas ?<br>*var. : Oui, pourquoi pas ?* | *—* · Accord sans grand enthousiasme, mais accord. |
| `ph-rdv-desole-pas-possible` | Das geht leider nicht.<br>*var. : Das klappt leider nicht.* | Ça ne va pas être possible, désolé.<br>*var. : Ce n’est pas possible, désolée.* | *—* · Pour refuser sans donner de raison. |
| `ph-rdv-une-autre-fois` | Ein andermal vielleicht.<br>*var. : Vielleicht ein anderes Mal.* | Une autre fois, peut-être.<br>*var. : Peut-être une autre fois.* | *—* · Pour refuser en laissant la porte ouverte. |
| `ph-rdv-on-se-voit-quand` | Wann sehen wir uns? | On se voit quand ?<br>*var. : Quand est-ce qu’on se voit ?* | *—* · Pour fixer un moment, entre amis. |
| `ph-rdv-je-te-rappelle` | Ich rufe dich zurück.<br>*var. : Ich rufe dich später zurück.* | Je te rappelle.<br>*var. : Je te rappelle tout à l’heure.* | *familier* · Au téléphone, quand on ne peut pas parler. Tutoiement. |
| `ph-rdv-je-vous-rappelle` | Ich rufe Sie zurück.<br>*var. : Ich rufe Sie später zurück.* | Je vous rappelle.<br>*var. : Je vous rappelle tout à l’heure.* | *poli* · La même chose, à quelqu’un qu’on vouvoie. |
| `ph-rdv-je-te-fais-signe` | Ich melde mich.<br>*var. : Ich melde mich bei dir.* | Je te fais signe.<br>*var. : Je te tiens au courant.* | *familier* · En se quittant : on donnera des nouvelles. Tutoiement. |

### Demander de l’aide — *Um Hilfe bitten* (`aide`, 8 phrases)

| Identifiant | Allemand | Français | Registre · contexte |
|---|---|---|---|
| `ph-aide-petit-service` | Kannst du mir einen Gefallen tun?<br>*var. : Tust du mir einen Gefallen?* | Tu peux me rendre un service ?<br>*var. : Tu pourrais me rendre un petit service ?* | *familier* · Pour ouvrir une demande, à un ami. Tutoiement. |
| `ph-aide-service-vous` | Könnten Sie mir einen Gefallen tun? | Pourriez-vous me rendre un service ? | *poli* · La même chose, à quelqu’un qu’on vouvoie. |
| `ph-aide-arroser-plantes` | Könntest du meine Pflanzen gießen, wenn ich weg bin? | Tu pourrais arroser mes plantes pendant mon absence ?<br>*var. : Tu pourrais arroser mes plantes quand je ne suis pas là ?* | *familier* · Une demande précise, au conditionnel. Tutoiement. |
| `ph-aide-surveiller-sac` | Kannst du kurz auf meine Tasche aufpassen?<br>*var. : Passt du kurz auf meine Tasche auf?* | Tu peux surveiller mon sac deux minutes ?<br>*var. : Tu peux garder un œil sur mon sac ?* | *familier* · Au café, à la gare. « Aufpassen auf » : garder un œil sur. Tutoiement. |
| `ph-aide-emprunter-chargeur` | Kann ich mir kurz dein Ladekabel ausleihen?<br>*var. : Leihst du mir kurz dein Ladekabel?* | Je peux t’emprunter ton chargeur ? | *familier* · « Sich etwas ausleihen » : emprunter. Tutoiement. |
| `ph-aide-avec-plaisir` | Klar, mache ich gern.<br>*var. : Klar, mach ich gern.* | Bien sûr, je fais ça volontiers.<br>*var. : Pas de souci, avec plaisir.* | *—* · Pour accepter de rendre un service. |
| `ph-aide-je-te-revaudrai-ca` | Danke, ich revanchiere mich!<br>*var. : Danke, dafür revanchiere ich mich!* | Merci, je te revaudrai ça !<br>*var. : Merci, je te dois un service !* | *familier* · Après un service rendu, entre amis. Tutoiement. |
| `ph-aide-ca-me-depanne` | Das hilft mir wirklich weiter.<br>*var. : Das hilft mir sehr.* | Ça me dépanne vraiment.<br>*var. : Ça m’aide beaucoup.* | *—* · Pour remercier d’un coup de main. |

### Faire répéter, dire qu’on ne comprend pas — *Nachfragen, wenn man nicht versteht* (`comprendre`, 9 phrases)

| Identifiant | Allemand | Français | Registre · contexte |
|---|---|---|---|
| `ph-comprendre-malentendu` | Das war ein Missverständnis.<br>*var. : Da gab es ein Missverständnis.* | C’était un malentendu.<br>*var. : Il y a eu un malentendu.* | *—* · Pour clore une dispute due à une incompréhension. |
| `ph-comprendre-pas-ce-que-je-voulais-dire` | So habe ich das nicht gemeint.<br>*var. : Das habe ich nicht so gemeint.* | Ce n’est pas ce que je voulais dire.<br>*var. : Je ne voulais pas dire ça.* | *—* · Quand une remarque a été mal prise. |
| `ph-comprendre-mal-compris` | Ich glaube, ich habe das falsch verstanden.<br>*var. : Ich habe das wohl falsch verstanden.* | Je crois que j’ai mal compris. | *—* · Pour reconnaître son erreur avant de la corriger. |
| `ph-comprendre-on-s-est-mal-compris` | Wir haben uns wohl missverstanden.<br>*var. : Da haben wir uns missverstanden.* | On s’est mal compris.<br>*var. : On ne s’est pas compris.* | *—* · Pour repartir sur de bonnes bases, sans chercher de coupable. |
| `ph-comprendre-tu-veux-dire-quoi` | Was meinst du damit?<br>*var. : Wie meinst du das?* | Qu’est-ce que tu veux dire ?<br>*var. : Tu veux dire quoi ?* | *familier* · Pour faire préciser, à un ami. Tutoiement. |
| `ph-comprendre-vous-voulez-dire` | Was meinen Sie damit?<br>*var. : Wie meinen Sie das?* | Que voulez-vous dire ?<br>*var. : Qu’est-ce que vous voulez dire ?* | *poli* · La même chose, à quelqu’un qu’on vouvoie. |
| `ph-comprendre-excuse-moi-ma-faute` | Entschuldige, das war mein Fehler.<br>*var. : Sorry, mein Fehler.* | Excuse-moi, c’était ma faute.<br>*var. : Pardon, c’est ma faute.* | *familier* · Pour s’excuser franchement, entre amis. Tutoiement. |
| `ph-comprendre-excusez-moi-erreur` | Entschuldigen Sie, das war mein Fehler. | Excusez-moi, c’était une erreur de ma part. | *poli* · La même chose, à quelqu’un qu’on vouvoie. |
| `ph-comprendre-pas-de-mal` | Schon gut.<br>*var. : Alles gut. · Nichts passiert.* | Il n’y a pas de mal.<br>*var. : Ce n’est rien.* | *—* · Pour accepter des excuses en passant à autre chose. |

### Au quotidien : réagir, proposer, encourager — *Im Alltag: reagieren, vorschlagen, ermutigen* (`quotidien`, 60 phrases)

| Identifiant | Allemand | Français | Registre · contexte |
|---|---|---|---|
| `ph-quotidien-ca-marche` | Alles klar.<br>*var. : Geht klar. · In Ordnung.* | Ça marche.<br>*var. : D’accord. · Entendu.* | *—* · Pour accepter ce qu’on vient de convenir, ou montrer qu’on a compris. Très courant, dans tous les registres. |
| `ph-quotidien-pas-de-souci` | Kein Problem.<br>*var. : Kein Thema.* | Pas de souci.<br>*var. : Pas de problème. · Aucun souci.* | *—* · En réponse à une demande, ou à quelqu’un qui s’excuse. « Kein Problem » suffit ; « kein Thema » est plus familier. |
| `ph-quotidien-pas-grave` | Macht nichts.<br>*var. : Das macht nichts. · Nicht schlimm. · Halb so wild.* | Ce n’est pas grave.<br>*var. : C’est pas grave. · Pas grave.* | *—* · Quand quelqu’un s’excuse d’une petite chose — un retard, une maladresse. « Halb so wild » minimise avec humour. |
| `ph-quotidien-prends-ton-temps` | Lass dir Zeit.<br>*var. : Keine Eile.* | Prends ton temps.<br>*var. : Pas de précipitation.* | *familier* · À un ami qui s’excuse d’être lent, ou qui hésite. Tutoiement. |
| `ph-quotidien-prenez-votre-temps` | Lassen Sie sich Zeit.<br>*var. : Keine Eile.* | Prenez votre temps. | *poli* · La même chose, à quelqu’un qu’on vouvoie — un client, un inconnu. |
| `ph-quotidien-ca-depend` | Das kommt darauf an.<br>*var. : Kommt drauf an. · Je nachdem.* | Ça dépend.<br>*var. : Tout dépend.* | *—* · Pour ne répondre ni oui ni non. « Kommt drauf an » est la forme parlée, plus rapide. |
| `ph-quotidien-ca-depend-meteo` | Das kommt darauf an, wie das Wetter wird.<br>*var. : Kommt drauf an, wie das Wetter wird.* | Ça dépend du temps qu’il fera.<br>*var. : Ça dépend de la météo.* | *—* · « Es kommt darauf an » se complète par « wie », « ob », « wann » : ça dépend de comment, de si, de quand. |
| `ph-quotidien-ca-vaut-le-coup` | Das lohnt sich.<br>*var. : Es lohnt sich.* | Ça vaut le coup.<br>*var. : Ça vaut la peine.* | *—* · Un détour, un prix, un effort : ça en vaut la peine. Le verbe est « sich lohnen ». |
| `ph-quotidien-ca-ne-vaut-pas-le-coup` | Das lohnt sich nicht. | Ça ne vaut pas le coup.<br>*var. : Ça ne vaut pas la peine.* | *—* · Trop cher, trop loin, trop peu : pas la peine. |
| `ph-quotidien-detour-vaut-le-coup` | Der Umweg lohnt sich, die Aussicht ist wunderschön. | Le détour vaut le coup, la vue est magnifique.<br>*var. : Le détour en vaut la peine, la vue est magnifique.* | *—* · Pour recommander quelque chose qui demande un effort. |
| `ph-quotidien-j-ai-hate` | Ich freue mich darauf.<br>*var. : Ich freue mich schon darauf. · Ich kann es kaum erwarten.* | J’ai hâte.<br>*var. : Je m’en réjouis d’avance.* | *—* · Pour dire qu’on attend quelque chose avec plaisir. En allemand, on « se réjouit à l’avance » : sich freuen auf. |
| `ph-quotidien-hate-week-end` | Ich freue mich schon auf das Wochenende.<br>*var. : Ich freue mich aufs Wochenende.* | J’ai hâte d’être au week-end.<br>*var. : Vivement le week-end !* | *—* · « Sich freuen auf » + accusatif : ce qu’on attend suit « auf ». |
| `ph-quotidien-hate-de-te-voir` | Ich freue mich darauf, dich zu sehen.<br>*var. : Ich freue mich auf dich.* | J’ai hâte de te voir.<br>*var. : J’ai hâte de te revoir.* | *familier* · À un proche, avant de le retrouver. Tutoiement. |
| `ph-quotidien-n-en-peux-plus` | Ich kann nicht mehr.<br>*var. : Ich bin fix und fertig. · Ich bin völlig erledigt.* | Je n’en peux plus.<br>*var. : Je suis épuisé. · Je suis crevé.* | *—* · Fatigue ou ras-le-bol. « Fix und fertig » et « völlig erledigt » disent l’épuisement, familièrement. |
| `ph-quotidien-tiens-moi-au-courant` | Halt mich auf dem Laufenden.<br>*var. : Sag mir Bescheid.* | Tiens-moi au courant.<br>*var. : Tu me tiens au courant ?* | *familier* · À un ami, pour qu’il donne des nouvelles d’une affaire en cours. « Sag mir Bescheid » : préviens-moi. |
| `ph-quotidien-tenez-moi-au-courant` | Halten Sie mich auf dem Laufenden.<br>*var. : Sagen Sie mir Bescheid.* | Tenez-moi au courant. | *poli* · La même chose, à quelqu’un qu’on vouvoie — au travail, avec un artisan, un médecin. |
| `ph-quotidien-on-se-tient-au-courant` | Wir halten uns auf dem Laufenden.<br>*var. : Wir bleiben in Kontakt.* | On se tient au courant.<br>*var. : On reste en contact.* | *—* · En se quittant, quand rien n’est encore fixé. |
| `ph-quotidien-je-me-debrouille` | Ich komme zurecht.<br>*var. : Ich komme klar.* | Je me débrouille.<br>*var. : Je m’en sors. · Je vais me débrouiller.* | *—* · Pour rassurer : on s’en sort seul. « Ich komme klar » est plus familier. |
| `ph-quotidien-debrouille-seul` | Danke, ich komme allein zurecht.<br>*var. : Danke, ich komme alleine zurecht.* | Merci, je me débrouille tout seul.<br>*var. : Merci, je me débrouille toute seule.* | *—* · Pour décliner une aide, gentiment. |
| `ph-quotidien-vendredi-me-va` | Freitag passt mir gut.<br>*var. : Freitag passt mir.* | Vendredi, ça me va bien.<br>*var. : Vendredi me va bien.* | *—* · Pour accepter une date. « Das passt mir » : ça me va, ça m’arrange. |
| `ph-quotidien-comme-tu-veux` | Wie du möchtest.<br>*var. : Wie du willst. · Ganz wie du magst.* | Comme tu veux.<br>*var. : Comme tu préfères.* | *familier* · Pour laisser le choix à un ami. Tutoiement. |
| `ph-quotidien-comme-vous-voulez` | Wie Sie möchten.<br>*var. : Ganz wie Sie wünschen.* | Comme vous voulez.<br>*var. : Comme vous préférez.* | *poli* · Pour laisser le choix à quelqu’un qu’on vouvoie. |
| `ph-quotidien-pas-envie` | Ich habe keine Lust.<br>*var. : Ich hab keine Lust.* | Je n’ai pas envie.<br>*var. : Je n’en ai pas envie.* | *—* · Refus franc, entre proches. « Keine Lust auf » + accusatif : pas envie de quelque chose. |
| `ph-quotidien-pas-envie-cinema` | Ich habe heute keine Lust auf Kino.<br>*var. : Ich habe heute keine Lust, ins Kino zu gehen.* | Je n’ai pas envie d’aller au cinéma aujourd’hui.<br>*var. : Le cinéma, ça ne me dit rien aujourd’hui.* | *—* · L’expression en situation : « Lust auf » + ce dont on n’a pas envie. |
| `ph-quotidien-envie-d-une-glace` | Ich hätte Lust auf ein Eis.<br>*var. : Ich habe Lust auf ein Eis.* | J’ai envie d’une glace.<br>*var. : J’aurais bien envie d’une glace.* | *—* · L’envie positive, avec le conditionnel de politesse « hätte ». |
| `ph-quotidien-je-croise-les-doigts` | Ich drücke dir die Daumen.<br>*var. : Ich drück dir die Daumen!* | Je croise les doigts pour toi.<br>*var. : Je croise les doigts.* | *familier* · Avant un examen, un entretien, un résultat. Les Allemands « pressent les pouces ». Tutoiement. |
| `ph-quotidien-je-croise-les-doigts-vous` | Ich drücke Ihnen die Daumen. | Je croise les doigts pour vous. | *poli* · La même chose, à quelqu’un qu’on vouvoie. |
| `ph-quotidien-bon-courage-examen` | Viel Erfolg bei der Prüfung!<br>*var. : Viel Glück bei der Prüfung!* | Bon courage pour l’examen !<br>*var. : Bonne chance pour l’examen !* | *—* · « Bon courage » n’a pas d’équivalent unique. Avant une épreuve, on souhaite le succès (Erfolg) ou la chance (Glück). |
| `ph-quotidien-bon-courage-journee` | Halt die Ohren steif!<br>*var. : Viel Erfolg heute!* | Bon courage !<br>*var. : Courage !* | *familier* · À un ami qui a une journée difficile devant lui. Familier ; littéralement « garde les oreilles droites ». |
| `ph-quotidien-courage-ca-va-aller` | Kopf hoch, das wird schon wieder!<br>*var. : Kopf hoch!* | Courage, ça va s’arranger !<br>*var. : Allez, courage !* | *—* · À quelqu’un de découragé. « Kopf hoch » : la tête haute. |
| `ph-quotidien-ca-va-aller` | Das wird schon.<br>*var. : Das wird schon werden. · Wird schon.* | Ça va aller.<br>*var. : Ça ira.* | *—* · Pour rassurer, sans en dire plus. |
| `ph-quotidien-bon-retablissement` | Gute Besserung! | Bon rétablissement ! | *—* · À quelqu’un de malade, en partant ou par message. |
| `ph-quotidien-bonne-chance` | Viel Glück! | Bonne chance ! | *—* · Avant quelque chose d’incertain. Pour un examen, « viel Erfolg » est plus courant. |
| `ph-quotidien-aucune-idee` | Keine Ahnung.<br>*var. : Ich habe keine Ahnung.* | Aucune idée.<br>*var. : Je n’en ai aucune idée.* | *—* · Réponse franche à une question dont on ignore la réponse. Familier. |
| `ph-quotidien-on-verra` | Mal sehen.<br>*var. : Wir werden sehen. · Schauen wir mal.* | On verra.<br>*var. : On verra bien.* | *—* · Pour remettre une décision à plus tard. |
| `ph-quotidien-ca-m-est-egal` | Das ist mir egal.<br>*var. : Ist mir egal. · Egal.* | Ça m’est égal.<br>*var. : Peu importe.* | *—* · Pour dire que le choix n’a pas d’importance pour soi. Selon le ton, peut sonner indifférent. |
| `ph-quotidien-tant-pis` | Dann eben nicht.<br>*var. : Dann halt nicht. · Na gut, dann nicht.* | Tant pis.<br>*var. : Tant pis, alors.* | *—* · Pour renoncer sans drame. |
| `ph-quotidien-dommage` | Schade!<br>*var. : Wie schade!* | Dommage !<br>*var. : C’est dommage ! · Quel dommage !* | *—* · Un regret, léger ou sincère. |
| `ph-quotidien-super` | Super!<br>*var. : Toll! · Klasse! · Prima!* | Super !<br>*var. : Génial ! · Chouette !* | *—* · Réaction enthousiaste. « Toll », « klasse », « prima » sont ses voisins. |
| `ph-quotidien-tant-mieux` | Umso besser.<br>*var. : Gut so.* | Tant mieux.<br>*var. : C’est tant mieux.* | *—* · Quand une nouvelle arrange les choses. |
| `ph-quotidien-c-est-parti` | Los geht’s!<br>*var. : Auf geht’s!* | C’est parti !<br>*var. : Allez, c’est parti ! · On y va !* | *—* · Au moment de commencer, de partir. |
| `ph-quotidien-attends` | Warte mal.<br>*var. : Moment mal. · Warte kurz.* | Attends.<br>*var. : Attends un peu. · Une seconde.* | *familier* · Pour retenir un ami une seconde. Tutoiement. |
| `ph-quotidien-un-instant` | Einen Moment, bitte.<br>*var. : Einen Augenblick, bitte.* | Un instant, s’il vous plaît.<br>*var. : Un moment, s’il vous plaît.* | *poli* · Pour faire patienter quelqu’un qu’on vouvoie. |
| `ph-quotidien-je-plaisante` | Das war nur Spaß.<br>*var. : War nur ein Scherz. · Nur Spaß!* | Je plaisante.<br>*var. : C’était pour rire. · Je rigole.* | *—* · Pour désamorcer une remarque prise au sérieux. |
| `ph-quotidien-serieusement` | Im Ernst?<br>*var. : Ehrlich? · Wirklich?* | Sérieusement ?<br>*var. : C’est vrai ? · Vraiment ?* | *—* · Pour vérifier qu’on ne plaisante pas. |
| `ph-quotidien-fais-attention` | Pass auf dich auf!<br>*var. : Pass gut auf dich auf!* | Fais attention à toi !<br>*var. : Prends soin de toi !* | *familier* · En se quittant, à un proche. Tutoiement. |
| `ph-quotidien-ne-t-inquiete-pas` | Mach dir keine Sorgen.<br>*var. : Keine Sorge.* | Ne t’inquiète pas.<br>*var. : T’inquiète pas. · Pas d’inquiétude.* | *familier* · Pour rassurer un ami. « Keine Sorge » vaut dans les deux registres. |
| `ph-quotidien-ne-vous-inquietez-pas` | Machen Sie sich keine Sorgen.<br>*var. : Keine Sorge.* | Ne vous inquiétez pas. | *poli* · Pour rassurer quelqu’un qu’on vouvoie. |
| `ph-quotidien-tout-va-bien` | Alles in Ordnung?<br>*var. : Alles okay? · Alles gut?* | Tout va bien ? | *—* · Quand quelqu’un semble avoir un problème. |
| `ph-quotidien-pas-le-temps` | Ich habe keine Zeit.<br>*var. : Ich hab gerade keine Zeit.* | Je n’ai pas le temps.<br>*var. : Je n’ai pas le temps, là.* | *—* · Pour décliner, ou expliquer qu’on est pris. |
| `ph-quotidien-je-suis-presse` | Ich bin in Eile.<br>*var. : Ich habe es eilig.* | Je suis pressé.<br>*var. : Je suis pressée.* | *—* · Pour abréger une conversation sans être impoli. |
| `ph-quotidien-bien-sur` | Natürlich!<br>*var. : Klar! · Selbstverständlich!* | Bien sûr !<br>*var. : Évidemment !* | *—* · Accord évident. « Klar » est familier, « selbstverständlich » plus soutenu. |
| `ph-quotidien-pas-question` | Kommt nicht in Frage.<br>*var. : Auf keinen Fall!* | Pas question.<br>*var. : Hors de question. · Certainement pas.* | *—* · Refus catégorique. |
| `ph-quotidien-d-accord-avec-toi` | Da bin ich ganz deiner Meinung.<br>*var. : Ich sehe das genauso.* | Je suis tout à fait d’accord avec toi.<br>*var. : Je suis bien d’accord avec toi.* | *familier* · Pour approuver un avis. Tutoiement. |
| `ph-quotidien-pas-d-accord` | Da bin ich anderer Meinung.<br>*var. : Das sehe ich anders.* | Je ne suis pas d’accord.<br>*var. : Je ne suis pas de cet avis.* | *—* · Désaccord poli : on est « d’un autre avis ». |
| `ph-quotidien-tu-as-raison` | Du hast recht.<br>*var. : Da hast du recht. · Stimmt.* | Tu as raison.<br>*var. : T’as raison. · C’est vrai.* | *familier* · Pour donner raison à un ami. Tutoiement. |
| `ph-quotidien-vous-avez-raison` | Sie haben recht.<br>*var. : Da haben Sie recht.* | Vous avez raison. | *poli* · Pour donner raison à quelqu’un qu’on vouvoie. |
| `ph-quotidien-je-ne-sais-pas-encore` | Ich weiß es noch nicht.<br>*var. : Ich weiß noch nicht.* | Je ne sais pas encore.<br>*var. : Je sais pas encore.* | *—* · Quand on n’a pas encore décidé. |
| `ph-quotidien-on-y-va` | Gehen wir?<br>*var. : Wollen wir los? · Sollen wir?* | On y va ?<br>*var. : On part ?* | *—* · Pour proposer de partir. |
| `ph-quotidien-depeche-toi` | Beeil dich!<br>*var. : Mach schnell!* | Dépêche-toi !<br>*var. : Vite !* | *familier* · À un proche, quand le temps presse. Tutoiement. |

### Recevoir et être invité — *Zu Besuch: Gäste empfangen, eingeladen sein* (`visite`, 18 phrases)

| Identifiant | Allemand | Français | Registre · contexte |
|---|---|---|---|
| `ph-visite-entrez` | Kommen Sie rein!<br>*var. : Kommen Sie herein! · Treten Sie ein!* | Entrez !<br>*var. : Entrez, je vous en prie !* | *poli* · À la porte, à quelqu’un qu’on vouvoie. « Treten Sie ein » est plus cérémonieux. |
| `ph-visite-entre` | Komm rein!<br>*var. : Komm herein!* | Entre !<br>*var. : Viens, entre !* | *familier* · À la porte, à un ami. Tutoiement. |
| `ph-visite-fais-comme-chez-toi` | Fühl dich wie zu Hause.<br>*var. : Fühl dich wie zuhause. · Mach es dir bequem.* | Fais comme chez toi.<br>*var. : Mets-toi à l’aise.* | *familier* · Pour mettre un ami à l’aise. « Mach es dir bequem » : installe-toi confortablement. Tutoiement. |
| `ph-visite-faites-comme-chez-vous` | Fühlen Sie sich wie zu Hause.<br>*var. : Machen Sie es sich bequem.* | Faites comme chez vous.<br>*var. : Mettez-vous à l’aise.* | *poli* · La même chose, à quelqu’un qu’on vouvoie. |
| `ph-visite-merci-invitation` | Danke für die Einladung!<br>*var. : Vielen Dank für die Einladung!* | Merci pour l’invitation !<br>*var. : Merci beaucoup pour l’invitation !* | *—* · En arrivant, ou en partant. |
| `ph-visite-apporter-quelque-chose` | Soll ich etwas mitbringen?<br>*var. : Kann ich etwas mitbringen?* | Je peux apporter quelque chose ?<br>*var. : Tu veux que j’apporte quelque chose ?* | *familier* · Avant une invitation, à un ami. « Mitbringen » : apporter avec soi. |
| `ph-visite-boire-quelque-chose` | Möchten Sie etwas trinken?<br>*var. : Darf ich Ihnen etwas zu trinken anbieten?* | Vous voulez boire quelque chose ?<br>*var. : Je peux vous offrir quelque chose à boire ?* | *poli* · Une fois l’invité assis. Vouvoiement. |
| `ph-visite-tu-veux-boire` | Willst du was trinken?<br>*var. : Möchtest du etwas trinken?* | Tu veux boire quelque chose ?<br>*var. : Tu veux quelque chose à boire ?* | *familier* · La même chose, entre amis. « Was » est la forme parlée de « etwas ». |
| `ph-visite-un-verre-d-eau` | Ein Glas Wasser, gern.<br>*var. : Gern ein Glas Wasser.* | Un verre d’eau, volontiers.<br>*var. : Un verre d’eau, avec plaisir.* | *—* · Pour accepter ce qu’on propose. |
| `ph-visite-debarrasser` | Darf ich Ihnen die Jacke abnehmen? | Je peux vous débarrasser de votre veste ?<br>*var. : Je vous débarrasse ?* | *poli* · À l’arrivée d’un invité qu’on vouvoie. |
| `ph-visite-servez-vous` | Bedienen Sie sich!<br>*var. : Greifen Sie zu!* | Servez-vous !<br>*var. : Je vous en prie, servez-vous !* | *poli* · À table, à des invités qu’on vouvoie. « Greifen Sie zu » : allez-y, prenez. |
| `ph-visite-sers-toi` | Bedien dich!<br>*var. : Greif zu!* | Sers-toi ! | *familier* · À table, entre amis. Tutoiement. |
| `ph-visite-vous-ressers` | Möchten Sie noch etwas?<br>*var. : Noch ein bisschen?* | Vous en voulez encore ?<br>*var. : Je vous ressers ?* | *poli* · Pour proposer de resservir un invité qu’on vouvoie. |
| `ph-visite-c-etait-delicieux` | Es war köstlich, vielen Dank!<br>*var. : Das war wirklich lecker, danke!* | C’était délicieux, merci beaucoup !<br>*var. : C’était un délice, merci beaucoup !* | *—* · Après le repas, à ses hôtes. |
| `ph-visite-il-est-tard` | Es ist schon spät, ich muss los.<br>*var. : Ich muss langsam los.* | Il se fait tard, je dois y aller.<br>*var. : Il faut que j’y aille.* | *—* · Pour annoncer qu’on part. « Ich muss los » : il faut que j’y aille. |
| `ph-visite-je-vous-raccompagne` | Ich bringe Sie noch zur Tür. | Je vous raccompagne.<br>*var. : Je vous accompagne jusqu’à la porte.* | *poli* · En fin de visite, à un invité qu’on vouvoie. |
| `ph-visite-rentre-bien` | Komm gut nach Hause!<br>*var. : Komm gut heim!* | Rentre bien !<br>*var. : Bon retour !* | *familier* · En se quittant, à un ami. Tutoiement. |
| `ph-visite-rentrez-bien` | Kommen Sie gut nach Hause!<br>*var. : Kommen Sie gut heim!* | Rentrez bien ! | *poli* · En se quittant, à quelqu’un qu’on vouvoie. |

## Dialogues

Les répliques sont dans l’ordre. Une réplique marquée *→ ph-…* reprend mot pour mot une phrase listée plus haut : corriger l’une, c’est corriger l’autre.

### `dg-rdv-sortie` — Organiser une sortie / *Einen Ausflug planen*

Situation : Rendez-vous. Registre : *familier*. A = Lena (*Lena*), B = Jan (*Jan*).

1. **A** — Hast du Lust, am Samstag wandern zu gehen? *(→ ph-rdv-randonner-samedi)*  
    Ça te dit d’aller randonner samedi ?
2. **B** — Das kommt darauf an, wie das Wetter wird. *(→ ph-quotidien-ca-depend-meteo)*  
    Ça dépend du temps qu’il fera.
3. **A** — Es soll sonnig werden. Und die Tour lohnt sich, die Aussicht ist toll.  
    Il doit faire beau. Et la balade vaut le coup, la vue est superbe.
4. **B** — Na gut, warum nicht? Wann geht’s los?  
    Bon, pourquoi pas ? On part quand ?
5. **A** — Um neun am Bahnhof. Ich bringe was zu essen mit.  
    À neuf heures à la gare. J’apporte de quoi manger.
6. **B** — Alles klar. Ich freue mich schon darauf!  
    Ça marche. J’ai déjà hâte !

### `dg-rdv-retard` — Prévenir d’un retard / *Eine Verspätung ankündigen*

Situation : Rendez-vous. Registre : *familier*. A = Paul (*Paul*), B = Mia (*Mia*).

1. **A** — Ich stehe im Stau, es dauert noch ein bisschen. *(→ ph-rdv-dans-les-bouchons)*  
    Je suis dans les bouchons, ça va prendre encore un peu de temps.
2. **B** — Kein Problem. Wie lange brauchst du noch?  
    Pas de souci. Il te faut encore combien de temps ?
3. **A** — Etwa zehn Minuten. Fang schon mal ohne mich an.  
    Environ dix minutes. Commence sans moi.
4. **B** — Mach dir keine Sorgen, ich warte. Ich bestelle schon mal was zu trinken.  
    Ne t’inquiète pas, j’attends. Je commande déjà quelque chose à boire.
5. **A** — Ich bin gleich da. *(→ ph-rdv-presque-arrive)*  
    Je suis presque arrivé.
6. **B** — Bis gleich! *(→ ph-saluer-a-tout-a-l-heure)*  
    À tout à l’heure !

### `dg-rdv-accepter-refuser` — Accepter ou refuser une proposition / *Zusagen oder absagen*

Situation : Rendez-vous. Registre : *familier*. A = Sara (*Sara*), B = Leon (*Leon*).

1. **A** — Wir gehen heute Abend ins Konzert. Kommst du mit?  
    On va au concert ce soir. Tu viens avec nous ?
2. **B** — Heute Abend? Tut mir leid, da kann ich nicht. Ich habe schon etwas vor.  
    Ce soir ? Désolé, je ne peux pas. J’ai déjà quelque chose de prévu.
3. **A** — Schade! Und am Freitag? Da spielen sie noch mal.  
    Dommage ! Et vendredi ? Ils rejouent.
4. **B** — Freitag passt mir gut. *(→ ph-quotidien-vendredi-me-va)*  
    Vendredi, ça me va bien.
5. **A** — Super! Um sieben vor dem Eingang?  
    Super ! À sept heures devant l’entrée ?
6. **B** — Alles klar, bis Freitag!  
    Ça marche, à vendredi !

### `dg-quotidien-encourager` — Encourager avant un examen / *Mut machen vor einer Prüfung*

Situation : Au quotidien : réagir, proposer, encourager. Registre : *familier*. A = Noah (*Noah*), B = Emma (*Emma*).

1. **A** — Morgen habe ich die Prüfung. Ich bin total nervös.  
    Demain j’ai l’examen. Je suis super stressé.
2. **B** — Du schaffst das! Du hast so viel gelernt.  
    Tu vas y arriver ! Tu as tellement révisé.
3. **A** — Ich weiß nicht. Ich kann nicht mehr, ich habe die ganze Woche gelernt.  
    Je ne sais pas. Je n’en peux plus, j’ai révisé toute la semaine.
4. **B** — Dann mach heute Abend Pause. Ich drücke dir die Daumen.  
    Alors fais une pause ce soir. Je croise les doigts pour toi.
5. **A** — Danke, das ist lieb. Ich sage dir morgen, wie es war.  
    Merci, c’est gentil. Je te dis demain comment ça s’est passé.
6. **B** — Ja, halt mich auf dem Laufenden! Viel Erfolg!  
    Oui, tiens-moi au courant ! Bon courage !

### `dg-aide-service` — Demander un service / *Um einen Gefallen bitten*

Situation : Demander de l’aide. Registre : *familier*. A = Anna (*Anna*), B = Felix (*Felix*).

1. **A** — Kannst du mir einen Gefallen tun? *(→ ph-aide-petit-service)*  
    Tu peux me rendre un service ?
2. **B** — Klar, worum geht’s?  
    Bien sûr, de quoi il s’agit ?
3. **A** — Könntest du meine Pflanzen gießen, wenn ich weg bin? *(→ ph-aide-arroser-plantes)*  
    Tu pourrais arroser mes plantes pendant mon absence ?
4. **B** — Kein Problem. Wann fährst du?  
    Pas de souci. Tu pars quand ?
5. **A** — Am Montag, für eine Woche. Ich lasse dir den Schlüssel da.  
    Lundi, pour une semaine. Je te laisse la clé.
6. **B** — Geht klar. Mach dir keine Sorgen, ich kümmere mich darum.  
    Ça marche. Ne t’inquiète pas, je m’en occupe.
7. **A** — Danke, ich revanchiere mich! *(→ ph-aide-je-te-revaudrai-ca)*  
    Merci, je te revaudrai ça !

### `dg-comprendre-malentendu` — Un petit malentendu / *Ein kleines Missverständnis*

Situation : Faire répéter, dire qu’on ne comprend pas. Registre : *familier*. A = Lea (*Lea*), B = Finn (*Finn*).

1. **A** — Wo warst du gestern? Ich habe eine halbe Stunde vor dem Kino gewartet.  
    Tu étais où hier ? J’ai attendu une demi-heure devant le cinéma.
2. **B** — Vor dem Kino? Ich dachte, wir treffen uns im Café!  
    Devant le cinéma ? Je croyais qu’on se retrouvait au café !
3. **A** — Nein, ich hatte „vor dem Kino“ geschrieben. Schau mal.  
    Non, j’avais écrit « devant le cinéma ». Regarde.
4. **B** — Oh, stimmt. Da habe ich mich wohl verlesen. Entschuldige, das war mein Fehler.  
    Oh, c’est vrai. J’ai dû mal lire. Excuse-moi, c’était ma faute.
5. **A** — Macht nichts. *(→ ph-quotidien-pas-grave)*  
    Ce n’est pas grave.
6. **B** — Nächstes Mal rufe ich kurz an, bevor ich losgehe.  
    La prochaine fois, j’appelle avant de partir.
7. **A** — Gute Idee! Gehen wir am Freitag noch mal hin?  
    Bonne idée ! On y retourne vendredi ?
8. **B** — Gern! Und diesmal wirklich vor dem Kino.  
    Volontiers ! Et cette fois, vraiment devant le cinéma.

### `dg-visite-accueil` — Recevoir un invité / *Einen Gast empfangen*

Situation : Recevoir et être invité. Registre : *poli*. A = L’hôtesse (*Die Gastgeberin*), B = L’invité (*Der Gast*).

1. **A** — Schön, dass Sie da sind! Kommen Sie rein.  
    Ravie que vous soyez là ! Entrez.
2. **B** — Guten Abend, und danke für die Einladung!  
    Bonsoir, et merci pour l’invitation !
3. **A** — Darf ich Ihnen die Jacke abnehmen? *(→ ph-visite-debarrasser)*  
    Je peux vous débarrasser de votre veste ?
4. **B** — Ja, danke. Hier, das ist für Sie, ein kleines Mitbringsel.  
    Oui, merci. Tenez, c’est pour vous, un petit quelque chose.
5. **A** — Oh, das wäre doch nicht nötig gewesen! Vielen Dank. Möchten Sie etwas trinken?  
    Oh, il ne fallait pas ! Merci beaucoup. Vous voulez boire quelque chose ?
6. **B** — Ein Glas Wasser, gern. *(→ ph-visite-un-verre-d-eau)*  
    Un verre d’eau, volontiers.
7. **A** — Kommt sofort. Machen Sie es sich bequem, die anderen sind schon im Wohnzimmer.  
    Tout de suite. Mettez-vous à l’aise, les autres sont déjà au salon.

### `dg-visite-amis` — Chez des amis / *Bei Freunden zu Besuch*

Situation : Recevoir et être invité. Registre : *familier*. A = Hanna (*Hanna*), B = Luis (*Luis*).

1. **A** — Hallo! Komm rein, fühl dich wie zu Hause.  
    Salut ! Entre, fais comme chez toi.
2. **B** — Danke! Ich habe einen Kuchen mitgebracht.  
    Merci ! J’ai apporté un gâteau.
3. **A** — Oh super, das wäre nicht nötig gewesen! Willst du was trinken?  
    Oh super, il ne fallait pas ! Tu veux boire quelque chose ?
4. **B** — Gern, ein Wasser. Kann ich dir in der Küche helfen?  
    Volontiers, un verre d’eau. Je peux t’aider en cuisine ?
5. **A** — Nein, nein, setz dich. Es ist fast fertig.  
    Non, non, assieds-toi. C’est presque prêt.
6. **B** — Es riecht jedenfalls fantastisch.  
    En tout cas, ça sent très bon.

### `dg-visite-depart` — Prendre congé chez des amis / *Sich bei Freunden verabschieden*

Situation : Recevoir et être invité. Registre : *familier*. A = Luis (*Luis*), B = Hanna (*Hanna*).

1. **A** — Es ist schon spät, ich muss los. *(→ ph-visite-il-est-tard)*  
    Il se fait tard, je dois y aller.
2. **B** — Schon? Willst du nicht noch einen Kaffee?  
    Déjà ? Tu ne veux pas encore un café ?
3. **A** — Lieber nicht, ich muss morgen früh raus. Danke für den schönen Abend!  
    Non merci, je dois me lever tôt demain. Merci pour cette belle soirée !
4. **B** — Komm gut nach Hause! *(→ ph-visite-rentre-bien)*  
    Rentre bien !
5. **A** — Danke, bis bald!  
    Merci, à bientôt !

### `dg-quotidien-pas-envie` — Pas envie de sortir / *Keine Lust auszugehen*

Situation : Au quotidien : réagir, proposer, encourager. Registre : *familier*. A = Paula (*Paula*), B = Jonas (*Jonas*).

1. **A** — Kommst du mit zum Fußball?  
    Tu viens au foot avec nous ?
2. **B** — Ehrlich gesagt habe ich heute keine Lust.  
    Franchement, je n’ai pas envie aujourd’hui.
3. **A** — Komm schon, es lohnt sich! Es ist das Derby.  
    Allez, ça vaut le coup ! C’est le derby.
4. **B** — Ich bin fix und fertig, ich war die ganze Woche unterwegs.  
    Je suis crevé, j’ai été en déplacement toute la semaine.
5. **A** — Alles klar, wie du möchtest. Dann ein andermal.  
    D’accord, comme tu veux. Une autre fois, alors.
6. **B** — Danke fürs Verständnis. Erzähl mir nachher, wie es war!  
    Merci de comprendre. Tu me raconteras comment c’était !

### `dg-quotidien-nouvelles` — Prendre des nouvelles / *Nach dem Neuesten fragen*

Situation : Au quotidien : réagir, proposer, encourager. Registre : *familier*. A = Clara (*Clara*), B = David (*David*).

1. **A** — Und, wie läuft es in der neuen Stadt?  
    Alors, comment ça se passe dans ta nouvelle ville ?
2. **B** — Ganz gut. Am Anfang war es schwierig, aber ich komme zurecht.  
    Plutôt bien. Au début, c’était difficile, mais je me débrouille.
3. **A** — Hast du schon eine Wohnung gefunden?  
    Tu as déjà trouvé un appartement ?
4. **B** — Noch nicht, aber ich habe morgen zwei Besichtigungen.  
    Pas encore, mais j’ai deux visites demain.
5. **A** — Ich drücke dir die Daumen. Halt mich auf dem Laufenden!  
    Je croise les doigts pour toi. Tiens-moi au courant !
6. **B** — Mach ich. Und wenn es nicht klappt, suche ich einfach weiter.  
    Promis. Et si ça ne marche pas, je continue à chercher, c’est tout.
7. **A** — Genau, das wird schon. Telefonieren wir am Wochenende?  
    Exactement, ça va aller. On s’appelle ce week-end ?
8. **B** — Gern. Bis dann!  
    Volontiers. À plus !

### `dg-hotel-conseil-restaurant` — Demander un conseil à la réception / *An der Rezeption nach einem Tipp fragen*

Situation : Hôtel. Registre : *poli*. A = La cliente (*Der Gast*), B = Le réceptionniste (*Der Rezeptionist*).

1. **A** — Gibt es hier in der Nähe ein gutes Restaurant? *(→ ph-hotel-bon-restaurant)*  
    Y a-t-il un bon restaurant dans le coin ?
2. **B** — Das kommt darauf an, was Sie mögen. Italienisch oder eher regional?  
    Ça dépend de ce que vous aimez. Italien ou plutôt régional ?
3. **A** — Eher regional. Und nicht zu teuer, wenn es geht.  
    Plutôt régional. Et pas trop cher, si possible.
4. **B** — Dann empfehle ich das Gasthaus am Markt. Das lohnt sich, die Küche ist ausgezeichnet.  
    Alors je vous conseille l’auberge de la place du marché. Ça vaut le coup, la cuisine est excellente.
5. **A** — Ist es weit? *(→ ph-chemin-loin)*  
    Est-ce loin ?
6. **B** — Nein, fünf Minuten zu Fuß. Soll ich Ihnen einen Tisch reservieren?  
    Non, cinq minutes à pied. Voulez-vous que je vous réserve une table ?
7. **A** — Ja, sehr gern! Für zwei Personen um halb acht.  
    Oui, avec plaisir ! Pour deux personnes à sept heures et demie.
8. **B** — Alles klar, das mache ich sofort.  
    Ça marche, je m’en occupe tout de suite.

### `dg-transports-train-rate` — Un train raté / *Den Zug verpasst*

Situation : Transports. Registre : *poli*. A = Le voyageur (*Der Reisende*), B = L’agente d’information (*Die Mitarbeiterin am Infoschalter*).

1. **A** — Entschuldigung, ich habe meinen Zug nach Köln verpasst. Was kann ich jetzt tun?  
    Excusez-moi, j’ai raté mon train pour Cologne. Qu’est-ce que je peux faire ?
2. **B** — Das ist nicht schlimm. Der nächste fährt in zwanzig Minuten, von Gleis vier.  
    Ce n’est pas grave. Le prochain part dans vingt minutes, voie quatre.
3. **A** — Gilt meine Fahrkarte noch?  
    Mon billet est-il encore valable ?
4. **B** — Das kommt darauf an. Mit einem Sparpreis müssen Sie leider neu buchen. Mit einem Flexpreis nehmen Sie einfach den nächsten Zug.  
    Ça dépend. Avec un tarif réduit, il faut malheureusement racheter un billet. Avec un tarif flexible, vous prenez simplement le train suivant.
5. **A** — Es ist ein Flexpreis. Dann ist ja alles gut.  
    C’est un tarif flexible. Alors tout va bien.
6. **B** — Genau. Und kein Grund zur Eile, Sie haben noch Zeit für einen Kaffee.  
    Exactement. Et pas besoin de vous presser, vous avez encore le temps de prendre un café.
7. **A** — Danke, das ist sehr nett von Ihnen. *(→ ph-aide-tres-gentil)*  
    Merci, c’est très gentil de votre part.

### `dg-achats-hesiter` — Hésiter devant un achat / *Beim Einkaufen zögern*

Situation : Achats et paiement. Registre : *poli*. A = Le vendeur (*Der Verkäufer*), B = La cliente (*Die Kundin*).

1. **A** — Kann ich Ihnen helfen?  
    Je peux vous aider ?
2. **B** — Ich schaue mir diese Lampe an. Was kostet sie?  
    Je regarde cette lampe. Elle coûte combien ?
3. **A** — Neunundvierzig Euro. Diese Woche ist sie um die Hälfte reduziert, das lohnt sich.  
    Quarante-neuf euros. Cette semaine, elle est à moitié prix, ça vaut le coup.
4. **B** — Hm, das ist trotzdem mehr, als ich ausgeben wollte. Ich überlege es mir noch.  
    Hum, c’est quand même plus que ce que je voulais dépenser. Je vais réfléchir.
5. **A** — Kein Problem, lassen Sie sich Zeit. Das Angebot gilt bis Samstag.  
    Pas de souci, prenez votre temps. L’offre est valable jusqu’à samedi.
6. **B** — Ich komme später noch mal wieder. *(→ ph-achats-je-repasserai)*  
    Je repasserai plus tard.
7. **A** — Gern. Schönen Tag noch!  
    Volontiers. Bonne journée !

