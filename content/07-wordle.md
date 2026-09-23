---
title: "Wordle"
duration_target_min: 45
concepts: [strings, arrays, higher-order functions, functional programming]
keywords: [OCaml, game lab]
game: true
lab: true
---

# Practice: Wordle

In this lab you will implement the logic for **Wordle**: a word-guessing game. Each game picks a secret five-letter word, the target. You get six guesses, each one itself a real five-letter word. After every guess, each of its five letters is colored: green if it's in the right spot, yellow if it's in the target but the wrong spot, and gray if it isn't in the target at all. Guess the target exactly, in six guesses or fewer, and you win.

This lab does not depend on the Tic-Tac-Toe or Game of Life labs. You can do it in any order, or on its own.

On the right is a game panel (hidden for now) that will render the board and let you play the game. All of the piping for the game is already in place so you will only be implementing the logic. For any problem, you can test your solution by pressing the **Check** button, which will run a series of tests on your code. If you get stuck, a reference solution sits collapsed under each problem.

None of it plays real Wordle yet: every guess gets scored all gray, nothing you type can win, and New Game just cycles through five fixed words. Functionality gets added as you go along and code up the functions that make the game work. The final result will be a fully playable Wordle clone.

Six small functions build the whole game: `random_target` picks the target; `score_guess` and `is_win` turn a guess into colored feedback and check whether it won; `keyboard_hint` colors the on-screen keyboard from your guess history; `is_valid_guess` rejects a guess that isn't a real word; and `count_letter` is a small helper for the stretch problem, which fixes a bug in `score_guess`'s handling of repeated letters.

Below you can read some of the important functions and definitions that you will have to use as you code up the solutions to the given functions.

```ocaml
let word_length = 5
let max_guesses = 6

type letter_status = Correct | Present | Absent
(* the scoring of one guessed letter: right spot, wrong spot, or not in the target at all *)

(* the state of the game as represented using a record *)
type game_state = {
  target : string;
  guesses : (string * letter_status array) list; (* most recent first *)
  current : string; (* what the player has typed but not yet submitted *)
  over : bool; (* whether the game is over, either by winning or running out of guesses *)
}

let initial_state target = { target; guesses = []; current = ""; over = false }
```
`guesses` here is a list of pairs, each pairing a guess with its scoring. That scoring is a `letter_status array`, not a list: we access it by index, and arrays handle that better than lists do. The [OCaml manual](https://ocaml.org/manual/arrays.html) covers the fuller set of differences between the two. For this game, an array behaves like a list indexed by numbers starting at 0. If `scored` is a `letter_status array`, `scored.(0)` reads the scoring of the guess's first letter, `scored.(1)` the second, and so on.

### Provided: the word list

`word_list` holds 4,615 real five-letter English words. All valid guesses must be in this list, and the target is always picked from it.

:::provided
```ocaml
let word_list =
  [|
    "abaci"; "aback"; "abaft"; "abase"; "abash"; "abate"; "abbey"; "abbot";
    "abeam"; "abets"; "abhor"; "abide"; "abler"; "abode"; "abort"; "about";
    "above"; "abuse"; "abuts"; "abuzz"; "abyss"; "ached"; "aches"; "achoo";
    "acids"; "acing"; "acmes"; "acorn"; "acres"; "acrid"; "acted"; "actor";
    "acute"; "adage"; "adapt"; "added"; "adder"; "addle"; "adept"; "adieu";
    "adman"; "admen"; "admin"; "admit"; "adobe"; "adopt"; "adore"; "adorn";
    "adult"; "adzes"; "aegis"; "aeons"; "aerie"; "affix"; "afire"; "afoot";
    "afoul"; "after"; "again"; "agape"; "agate"; "agave"; "agent"; "agile";
    "aging"; "agism"; "aglow"; "agony"; "agree"; "ahead"; "aided"; "aides";
    "ailed"; "aimed"; "aired"; "aisle"; "alarm"; "album"; "alder"; "alert";
    "algae"; "alias"; "alibi"; "alien"; "align"; "alike"; "aline"; "alive";
    "allay"; "alley"; "allot"; "allow"; "alloy"; "aloes"; "aloft"; "aloha";
    "alone"; "along"; "aloof"; "aloud"; "alpha"; "altar"; "alter"; "altho";
    "altos"; "alums"; "amass"; "amaze"; "amber"; "amble"; "ameba"; "ameer";
    "amend"; "amigo"; "amino"; "amirs"; "amiss"; "amity"; "among"; "amour";
    "ample"; "amply"; "ampul"; "amuck"; "amuse"; "angel"; "anger"; "angle";
    "angry"; "angst"; "anime"; "anion"; "anise"; "ankhs"; "ankle"; "annex";
    "annoy"; "annul"; "anode"; "anons"; "anted"; "antes"; "antic"; "antis";
    "anvil"; "aorta"; "apace"; "apart"; "aphid"; "aping"; "appal"; "apple";
    "apply"; "apron"; "apses"; "apter"; "aptly"; "aquae"; "aquas"; "arbor";
    "arced"; "ardor"; "areas"; "arena"; "argon"; "argot"; "argue"; "arias";
    "arise"; "armed"; "armor"; "aroma"; "arose"; "array"; "arrow"; "arson";
    "artsy"; "ascot"; "ashed"; "ashen"; "ashes"; "aside"; "asked"; "askew";
    "aspen"; "aspic"; "assay"; "asses"; "asset"; "aster"; "astir"; "atlas";
    "atoll"; "atoms"; "atone"; "atria"; "attar"; "attic"; "audio"; "audit";
    "auger"; "aught"; "augur"; "aunts"; "aurae"; "aural"; "auras"; "autos";
    "avail"; "avast"; "avers"; "avert"; "avian"; "avoid"; "avows"; "await";
    "awake"; "award"; "aware"; "awash"; "awful"; "awing"; "awoke"; "axial";
    "axing"; "axiom"; "axles"; "axons"; "azure"; "baaed"; "babel"; "babes";
    "backs"; "bacon"; "badge"; "badly"; "bagel"; "baggy"; "bails"; "baits";
    "baize"; "baked"; "baker"; "bakes"; "balds"; "baled"; "bales"; "balks";
    "balky"; "balls"; "balms"; "balmy"; "balsa"; "banal"; "bands"; "bandy";
    "banes"; "bangs"; "banjo"; "banks"; "banns"; "barbs"; "bards"; "bared";
    "barer"; "bares"; "barfs"; "barge"; "barks"; "barns"; "baron"; "basal";
    "based"; "baser"; "bases"; "basic"; "basil"; "basin"; "basis"; "basks";
    "bassi"; "basso"; "baste"; "batch"; "bated"; "bates"; "bathe"; "baths";
    "batik"; "baton"; "batty"; "bauds"; "bawdy"; "bawls"; "bayed"; "bayou";
    "beach"; "beads"; "beady"; "beaks"; "beams"; "beans"; "beard"; "bears";
    "beast"; "beats"; "beaus"; "beaux"; "bebop"; "becks"; "beech"; "beefs";
    "beefy"; "beeps"; "beers"; "beets"; "befit"; "befog"; "began"; "begat";
    "beget"; "begin"; "begot"; "begun"; "beige"; "being"; "belay"; "belch";
    "belie"; "belle"; "bells"; "belly"; "below"; "belts"; "bench"; "bends";
    "bents"; "beret"; "bergs"; "berms"; "berry"; "berth"; "beryl"; "beset";
    "besom"; "besot"; "bests"; "betas"; "bevel"; "bible"; "bicep"; "biddy";
    "bided"; "bides"; "bidet"; "biers"; "biffs"; "bight"; "bigot"; "biked";
    "biker"; "bikes"; "bilge"; "bilks"; "bills"; "billy"; "bimbo"; "binds";
    "binge"; "bingo"; "biped"; "birch"; "birds"; "birth"; "bison"; "bites";
    "blabs"; "black"; "blade"; "blame"; "bland"; "blank"; "blare"; "blast";
    "blats"; "blaze"; "bleak"; "bleat"; "bleed"; "bleep"; "blend"; "blent";
    "bless"; "blest"; "blimp"; "blind"; "bling"; "blink"; "blips"; "bliss";
    "blitz"; "bloat"; "blobs"; "block"; "blocs"; "blogs"; "blond"; "blood";
    "bloom"; "blots"; "blown"; "blows"; "blued"; "bluer"; "blues"; "bluff";
    "blunt"; "blurb"; "blurs"; "blurt"; "blush"; "board"; "boars"; "boast";
    "boats"; "bobby"; "boded"; "bodes"; "bogey"; "boggy"; "bogie"; "bogon";
    "bogus"; "boils"; "boink"; "bolas"; "boles"; "bolls"; "bolts"; "bombs";
    "bonds"; "boned"; "boner"; "bones"; "boney"; "bongo"; "bongs"; "bonny";
    "bonus"; "booby"; "booed"; "books"; "booms"; "boons"; "boors"; "boost";
    "booth"; "boots"; "booty"; "booze"; "boozy"; "borax"; "bored"; "borer";
    "bores"; "borne"; "boron"; "bosom"; "bossy"; "bosun"; "botch"; "bough";
    "bound"; "bouts"; "bowed"; "bowel"; "bower"; "bowls"; "boxed"; "boxen";
    "boxer"; "boxes"; "bozos"; "brace"; "bract"; "brads"; "brags"; "braid";
    "brain"; "brake"; "brand"; "brash"; "brass"; "brats"; "brave"; "bravo";
    "brawl"; "brawn"; "brays"; "bread"; "break"; "breed"; "brews"; "briar";
    "bribe"; "brick"; "bride"; "brief"; "brier"; "brigs"; "brims"; "brine";
    "bring"; "brink"; "briny"; "brisk"; "broad"; "broil"; "broke"; "brood";
    "brook"; "broom"; "broth"; "brown"; "brows"; "bruin"; "brunt"; "brush";
    "brusk"; "brute"; "bucks"; "buddy"; "budge"; "buffs"; "buggy"; "bugle";
    "build"; "built"; "bulbs"; "bulge"; "bulgy"; "bulks"; "bulky"; "bulls";
    "bully"; "bumps"; "bumpy"; "bunch"; "bungs"; "bunks"; "bunny"; "bunts";
    "buoys"; "burgs"; "burka"; "burly"; "burns"; "burnt"; "burps"; "burro";
    "burrs"; "burst"; "busby"; "bused"; "buses"; "bushy"; "busts"; "butch";
    "butte"; "butts"; "buxom"; "buyer"; "bylaw"; "bytes"; "byway"; "cabal";
    "cabby"; "cabin"; "cable"; "cacao"; "cache"; "cacti"; "caddy"; "cadet";
    "cadge"; "cadre"; "caged"; "cages"; "cagey"; "cairn"; "caked"; "cakes";
    "calfs"; "calif"; "calks"; "calls"; "calms"; "calve"; "calyx"; "camel";
    "cameo"; "camps"; "campy"; "canal"; "candy"; "caned"; "canes"; "canny";
    "canoe"; "canon"; "canto"; "cants"; "caped"; "caper"; "capes"; "capon";
    "carat"; "carbs"; "cards"; "cared"; "cares"; "caret"; "cargo"; "carol";
    "carom"; "carps"; "carry"; "carts"; "carve"; "cased"; "cases"; "casks";
    "caste"; "casts"; "catch"; "cater"; "catty"; "caulk"; "cause"; "caved";
    "caves"; "cavil"; "cawed"; "cease"; "cedar"; "ceded"; "cedes"; "celli";
    "cello"; "cells"; "cents"; "chads"; "chafe"; "chaff"; "chain"; "chair";
    "chalk"; "champ"; "chant"; "chaos"; "chaps"; "chapt"; "charm"; "chars";
    "chart"; "chary"; "chase"; "chasm"; "chats"; "cheap"; "cheat"; "check";
    "cheek"; "cheep"; "cheer"; "chefs"; "chess"; "chest"; "chews"; "chewy";
    "chick"; "chide"; "chief"; "child"; "chile"; "chili"; "chill"; "chime";
    "chimp"; "china"; "chino"; "chins"; "chips"; "chirp"; "chits"; "chive";
    "chock"; "choir"; "choke"; "chomp"; "chops"; "chord"; "chore"; "chose";
    "chows"; "chuck"; "chugs"; "chump"; "chums"; "chunk"; "churl"; "churn";
    "chute"; "cider"; "cigar"; "cilia"; "cinch"; "circa"; "cited"; "cites";
    "civet"; "civic"; "civil"; "clack"; "claim"; "clamp"; "clams"; "clang";
    "clank"; "clans"; "claps"; "clash"; "clasp"; "class"; "claws"; "clean";
    "clear"; "cleat"; "clefs"; "cleft"; "clerk"; "clews"; "click"; "cliff";
    "climb"; "clime"; "cling"; "clink"; "clips"; "clipt"; "clits"; "cloak";
    "clock"; "clods"; "clogs"; "clomp"; "clone"; "clops"; "close"; "cloth";
    "clots"; "cloud"; "clout"; "clove"; "clown"; "cloys"; "clubs"; "cluck";
    "clued"; "clues"; "clump"; "clung"; "clunk"; "coach"; "coals"; "coast";
    "coats"; "cobra"; "cocky"; "cocoa"; "codas"; "coded"; "codes"; "codex";
    "coeds"; "coifs"; "coils"; "coins"; "coked"; "cokes"; "colas"; "colds";
    "colic"; "colon"; "color"; "colts"; "comas"; "combo"; "combs"; "comer";
    "comes"; "comet"; "comfy"; "comic"; "comma"; "compo"; "conch"; "condo";
    "cones"; "conga"; "conic"; "conks"; "contd"; "cooed"; "cooks"; "cooky";
    "cools"; "coops"; "coots"; "coped"; "copes"; "copra"; "copse"; "coral";
    "cords"; "cored"; "cores"; "corks"; "corms"; "corns"; "corny"; "corps";
    "costs"; "cotes"; "couch"; "cough"; "could"; "count"; "coupe"; "coups";
    "court"; "coven"; "cover"; "coves"; "covet"; "covey"; "cowed"; "cower";
    "cowls"; "coyer"; "coyly"; "cozen"; "crabs"; "crack"; "craft"; "crags";
    "cramp"; "crams"; "crane"; "crank"; "crape"; "craps"; "crash"; "crass";
    "crate"; "crave"; "crawl"; "craws"; "crays"; "craze"; "crazy"; "creak";
    "cream"; "credo"; "creed"; "creek"; "creel"; "creep"; "crepe"; "crept";
    "cress"; "crest"; "crews"; "cribs"; "crick"; "cried"; "crier"; "cries";
    "crime"; "crimp"; "crisp"; "croak"; "croci"; "crock"; "crone"; "crony";
    "crook"; "croon"; "crops"; "cross"; "croup"; "crowd"; "crown"; "crows";
    "crude"; "cruel"; "cruet"; "cruft"; "crumb"; "crush"; "crust"; "crypt";
    "cubed"; "cubes"; "cubic"; "cubit"; "cuffs"; "cuing"; "culls"; "cults";
    "cumin"; "cupid"; "curbs"; "curds"; "cured"; "curer"; "cures"; "curie";
    "curio"; "curls"; "curly"; "curry"; "curse"; "curst"; "curve"; "curvy";
    "cushy"; "cusps"; "cuter"; "cutup"; "cycle"; "cynic"; "cysts"; "czars";
    "dacha"; "daddy"; "dados"; "daffy"; "daily"; "dairy"; "daisy"; "dales";
    "dally"; "dames"; "damns"; "damps"; "dance"; "dandy"; "dared"; "dares";
    "darns"; "darts"; "dated"; "dates"; "datum"; "daubs"; "daunt"; "davit";
    "dawns"; "dazed"; "dazes"; "deals"; "dealt"; "deans"; "dears"; "death";
    "debar"; "debit"; "debts"; "debug"; "debut"; "decaf"; "decal"; "decay";
    "decks"; "decor"; "decoy"; "decry"; "deeds"; "deems"; "deeps"; "deers";
    "defer"; "deice"; "deify"; "deign"; "deism"; "deity"; "delay"; "delis";
    "dells"; "delta"; "delve"; "demon"; "demos"; "demur"; "denim"; "dense";
    "dents"; "depot"; "depth"; "derby"; "desks"; "deter"; "detox"; "deuce";
    "devil"; "dhoti"; "dials"; "diary"; "diced"; "dices"; "dicey"; "dicks";
    "dicky"; "dicta"; "diets"; "diffs"; "digit"; "diked"; "dikes"; "dills";
    "dilly"; "dimer"; "dimes"; "dimly"; "dined"; "diner"; "dines"; "dingo";
    "dings"; "dingy"; "dinky"; "diode"; "direr"; "dirge"; "dirks"; "dirty";
    "disco"; "discs"; "disks"; "ditch"; "ditto"; "ditty"; "divan"; "divas";
    "dived"; "diver"; "dives"; "divot"; "divvy"; "dizzy"; "djinn"; "docks";
    "dodge"; "dodgy"; "dodos"; "doers"; "doffs"; "doggy"; "dogie"; "dogma";
    "doily"; "doing"; "doled"; "doles"; "dolls"; "dolly"; "dolts"; "domed";
    "domes"; "donor"; "donut"; "dooms"; "doors"; "doped"; "dopes"; "dopey";
    "dorks"; "dorky"; "dorms"; "dosed"; "doses"; "doted"; "dotes"; "dotty";
    "doubt"; "dough"; "douse"; "doves"; "dowdy"; "dowel"; "downs"; "downy";
    "dowry"; "dowse"; "doyen"; "dozed"; "dozen"; "dozes"; "drabs"; "draft";
    "drags"; "drain"; "drake"; "drama"; "drams"; "drank"; "drape"; "drawl";
    "drawn"; "draws"; "drays"; "dread"; "dream"; "dregs"; "dress"; "dried";
    "drier"; "dries"; "drift"; "drill"; "drily"; "drink"; "drips"; "drive";
    "droid"; "droll"; "drone"; "drool"; "droop"; "drops"; "dross"; "drove";
    "drown"; "drubs"; "drugs"; "druid"; "drums"; "drunk"; "dryad"; "dryer";
    "dryly"; "ducal"; "ducat"; "duchy"; "ducks"; "ducts"; "duded"; "dudes";
    "duels"; "duets"; "dukes"; "dulls"; "dully"; "dummy"; "dumps"; "dumpy";
    "dunce"; "dunes"; "dungs"; "dunks"; "dunno"; "duped"; "dupes"; "dusky";
    "dusts"; "dusty"; "duvet"; "dwarf"; "dweeb"; "dwell"; "dwelt"; "dyers";
    "dying"; "eager"; "eagle"; "earls"; "early"; "earns"; "earth"; "eased";
    "easel"; "eases"; "eaten"; "eater"; "eaves"; "ebbed"; "ebony"; "echos";
    "edema"; "edged"; "edger"; "edges"; "edict"; "edify"; "edits"; "eerie";
    "egged"; "egret"; "eider"; "eight"; "eject"; "eking"; "elate"; "elbow";
    "elder"; "elect"; "elegy"; "elfin"; "elide"; "elite"; "elope"; "elude";
    "elves"; "email"; "embed"; "ember"; "emcee"; "emend"; "emery"; "emirs";
    "emits"; "emoji"; "emote"; "empty"; "enact"; "ended"; "endow"; "endue";
    "enema"; "enemy"; "enjoy"; "ennui"; "enrol"; "ensue"; "enter"; "entry";
    "enure"; "envoy"; "epics"; "epoch"; "epoxy"; "equal"; "equip"; "erase";
    "erect"; "erode"; "erred"; "error"; "erupt"; "essay"; "ester"; "ether";
    "ethic"; "ethos"; "euros"; "evade"; "evens"; "event"; "every"; "evict";
    "evils"; "evoke"; "ewers"; "exact"; "exalt"; "exams"; "excel"; "execs";
    "exert"; "exile"; "exist"; "exits"; "expel"; "expos"; "extol"; "extra";
    "exude"; "exult"; "eying"; "fable"; "faced"; "faces"; "facet"; "facts";
    "faded"; "fades"; "fails"; "faint"; "fairs"; "fairy"; "faith"; "faked";
    "faker"; "fakes"; "fakir"; "falls"; "false"; "famed"; "fancy"; "fangs";
    "fanny"; "farce"; "fared"; "fares"; "farms"; "farts"; "fasts"; "fatal";
    "fated"; "fates"; "fatty"; "fault"; "fauna"; "fauns"; "favor"; "fawns";
    "faxed"; "faxes"; "fazed"; "fazes"; "fears"; "feast"; "feats"; "fecal";
    "feces"; "feeds"; "feels"; "feign"; "feint"; "fells"; "felon"; "felts";
    "femur"; "fence"; "fends"; "feral"; "ferns"; "ferry"; "fests"; "fetal";
    "fetch"; "feted"; "fetid"; "fetus"; "feuds"; "fever"; "fewer"; "fezes";
    "fiats"; "fiber"; "fiche"; "fiefs"; "field"; "fiend"; "fiery"; "fifes";
    "fifth"; "fifty"; "fight"; "filch"; "filed"; "files"; "filet"; "fills";
    "filly"; "films"; "filmy"; "filth"; "final"; "finch"; "finds"; "fined";
    "finer"; "fines"; "finis"; "finks"; "finny"; "fiord"; "fired"; "fires";
    "firms"; "first"; "firth"; "fishy"; "fists"; "fitly"; "fiver"; "fives";
    "fixed"; "fixer"; "fixes"; "fizzy"; "fjord"; "flack"; "flags"; "flail";
    "flair"; "flake"; "flaky"; "flame"; "flank"; "flaps"; "flare"; "flash";
    "flask"; "flats"; "flaws"; "flays"; "fleas"; "fleck"; "flees"; "fleet";
    "flesh"; "flick"; "flied"; "flier"; "flies"; "fling"; "flint"; "flips";
    "flirt"; "flits"; "float"; "flock"; "floes"; "flogs"; "flood"; "floor";
    "flops"; "flora"; "floss"; "flour"; "flout"; "flown"; "flows"; "flubs";
    "flues"; "fluff"; "fluid"; "fluke"; "fluky"; "flume"; "flung"; "flunk";
    "flush"; "flute"; "flyby"; "flyer"; "foals"; "foams"; "foamy"; "focal";
    "focus"; "fogey"; "foggy"; "foils"; "foist"; "folds"; "folio"; "folks";
    "folly"; "fonts"; "foods"; "fools"; "foots"; "foray"; "force"; "fords";
    "fores"; "forge"; "forgo"; "forks"; "forms"; "forte"; "forth"; "forts";
    "forty"; "forum"; "fouls"; "found"; "fount"; "fours"; "fowls"; "foxed";
    "foxes"; "foyer"; "frack"; "frags"; "frail"; "frame"; "franc"; "frank";
    "frats"; "fraud"; "frays"; "freak"; "freed"; "freer"; "frees"; "fresh";
    "frets"; "friar"; "fried"; "frier"; "fries"; "frill"; "frisk"; "frizz";
    "frock"; "frogs"; "frond"; "front"; "frost"; "froth"; "frown"; "froze";
    "fruit"; "frump"; "fryer"; "fudge"; "fuels"; "fugue"; "fulls"; "fully";
    "fumed"; "fumes"; "funds"; "fungi"; "funks"; "funky"; "funny"; "furls";
    "furor"; "furry"; "furze"; "fused"; "fuses"; "fussy"; "fusty"; "futon";
    "fuzed"; "fuzes"; "fuzzy"; "gabby"; "gable"; "gaffe"; "gaffs"; "gaged";
    "gages"; "gaily"; "gains"; "gaits"; "galas"; "gales"; "galls"; "gamed";
    "gamer"; "games"; "gamey"; "gamin"; "gamma"; "gamut"; "gangs"; "gaped";
    "gapes"; "garbs"; "gases"; "gasps"; "gassy"; "gated"; "gates"; "gaudy";
    "gauge"; "gaunt"; "gauze"; "gauzy"; "gavel"; "gawks"; "gawky"; "gayer";
    "gayly"; "gazed"; "gazer"; "gazes"; "gears"; "gecko"; "geeks"; "geeky";
    "geese"; "gelds"; "gelid"; "genes"; "genie"; "genii"; "genre"; "gents";
    "genus"; "geode"; "germs"; "getup"; "ghost"; "ghoul"; "giant"; "gibed";
    "gibes"; "giddy"; "gifts"; "gilds"; "gills"; "gilts"; "gimme"; "gimpy";
    "gipsy"; "girds"; "girls"; "girth"; "girts"; "gismo"; "given"; "gives";
    "gizmo"; "glade"; "glads"; "gland"; "glare"; "glass"; "glaze"; "gleam";
    "glean"; "glens"; "glide"; "glint"; "glitz"; "gloat"; "globe"; "globs";
    "gloom"; "glory"; "gloss"; "glove"; "glows"; "glued"; "glues"; "gluey";
    "gluts"; "glyph"; "gnarl"; "gnash"; "gnats"; "gnawn"; "gnaws"; "gnome";
    "goads"; "goals"; "goats"; "godly"; "gofer"; "going"; "golds"; "golfs";
    "golly"; "gonad"; "goner"; "gongs"; "gonks"; "gonna"; "gonzo"; "goods";
    "goody"; "gooey"; "goofs"; "goofy"; "goons"; "goose"; "gored"; "gores";
    "gorge"; "gorps"; "gorse"; "gotta"; "gouge"; "gourd"; "gouty"; "gowns";
    "grabs"; "grace"; "grade"; "grads"; "graft"; "grail"; "grain"; "grams";
    "grand"; "grant"; "grape"; "graph"; "grasp"; "grass"; "grate"; "grave";
    "gravy"; "grays"; "graze"; "great"; "grebe"; "greed"; "green"; "greet";
    "greys"; "grids"; "grief"; "grill"; "grime"; "grimy"; "grind"; "grins";
    "gripe"; "grips"; "grist"; "grits"; "groan"; "groin"; "groom"; "grope";
    "gross"; "group"; "grout"; "grove"; "growl"; "grown"; "grows"; "grubs";
    "gruel"; "grues"; "gruff"; "grunt"; "guano"; "guard"; "guava"; "guess";
    "guest"; "guide"; "guild"; "guile"; "guilt"; "guise"; "gulag"; "gulch";
    "gulfs"; "gulls"; "gully"; "gulps"; "gumbo"; "gummy"; "gunny"; "guppy";
    "gurus"; "gushy"; "gusto"; "gusts"; "gusty"; "gutsy"; "guyed"; "gybed";
    "gybes"; "gypsy"; "gyros"; "habit"; "hacks"; "hafts"; "haiku"; "hails";
    "hairs"; "hairy"; "hakes"; "haled"; "haler"; "hales"; "halls"; "halon";
    "halos"; "halts"; "halve"; "hands"; "handy"; "hangs"; "hanks"; "hanky";
    "happy"; "hardy"; "hared"; "harem"; "hares"; "harks"; "harms"; "harps";
    "harpy"; "harry"; "harsh"; "harts"; "hasps"; "haste"; "hasty"; "hatch";
    "hated"; "hater"; "hates"; "hauls"; "haunt"; "haven"; "haves"; "havoc";
    "hawed"; "hawks"; "hayed"; "hazed"; "hazel"; "hazes"; "heads"; "heady";
    "heals"; "heaps"; "heard"; "hears"; "heart"; "heath"; "heats"; "heave";
    "heavy"; "hedge"; "heeds"; "heels"; "hefts"; "hefty"; "heirs"; "heist";
    "helix"; "hello"; "helms"; "helot"; "helps"; "hence"; "henna"; "herbs";
    "herds"; "heron"; "heros"; "hertz"; "hewed"; "hewer"; "hexed"; "hexes";
    "hicks"; "hided"; "hides"; "highs"; "hiked"; "hiker"; "hikes"; "hills";
    "hilly"; "hilts"; "hinds"; "hinge"; "hings"; "hints"; "hippo"; "hippy";
    "hired"; "hires"; "hitch"; "hived"; "hives"; "hoagy"; "hoard"; "hoary";
    "hobby"; "hobos"; "hocks"; "hogan"; "hoist"; "hokey"; "hokum"; "holds";
    "holed"; "holes"; "holly"; "homed"; "homer"; "homes"; "homey"; "homie";
    "honed"; "hones"; "honey"; "honks"; "honor"; "hooch"; "hoods"; "hooey";
    "hoofs"; "hooks"; "hooky"; "hoops"; "hoots"; "hoped"; "hopes"; "horde";
    "horns"; "horny"; "horse"; "horsy"; "hosed"; "hoses"; "hosts"; "hotel";
    "hotly"; "hound"; "hours"; "house"; "hovel"; "hover"; "howdy"; "howls";
    "hubby"; "huffs"; "huffy"; "huger"; "hulas"; "hulks"; "hulls"; "human";
    "humid"; "humor"; "humps"; "humus"; "hunch"; "hunks"; "hunts"; "hurls";
    "hurry"; "hurts"; "husks"; "husky"; "hussy"; "hutch"; "hydra"; "hyena";
    "hying"; "hymen"; "hymns"; "hyped"; "hyper"; "hypes"; "hypos"; "iambs";
    "icier"; "icily"; "icing"; "icons"; "ideal"; "ideas"; "idiom"; "idiot";
    "idled"; "idler"; "idles"; "idols"; "idyll"; "idyls"; "igloo"; "ikons";
    "image"; "imams"; "imbed"; "imbue"; "impel"; "imply"; "inane"; "inapt";
    "inbox"; "inced"; "incur"; "index"; "indue"; "inept"; "inert"; "infer";
    "infix"; "ingot"; "inked"; "inlay"; "inlet"; "inner"; "input"; "inset";
    "intel"; "inter"; "intro"; "inure"; "iotas"; "irate"; "irked"; "irons";
    "irony"; "isles"; "islet"; "issue"; "itchy"; "items"; "ivies"; "ivory";
    "jabot"; "jacks"; "jaded"; "jades"; "jails"; "jambs"; "japan"; "japed";
    "japes"; "jaunt"; "jawed"; "jazzy"; "jeans"; "jeeps"; "jeers"; "jehad";
    "jello"; "jells"; "jelly"; "jerks"; "jerky"; "jests"; "jetty"; "jewel";
    "jibed"; "jibes"; "jiffy"; "jihad"; "jilts"; "jimmy"; "jinni"; "jinns";
    "jived"; "jives"; "jocks"; "johns"; "joins"; "joint"; "joist"; "joked";
    "joker"; "jokes"; "jolly"; "jolts"; "joule"; "joust"; "jowls"; "joyed";
    "judge"; "juice"; "juicy"; "julep"; "jumbo"; "jumps"; "jumpy"; "junco";
    "junks"; "junky"; "junta"; "juror"; "kabob"; "kapok"; "kaput"; "karat";
    "karma"; "kayak"; "kazoo"; "kebab"; "kebob"; "keels"; "keens"; "keeps";
    "ketch"; "keyed"; "khaki"; "khans"; "kicks"; "kicky"; "kiddo"; "kiddy";
    "kills"; "kilns"; "kilos"; "kilts"; "kinda"; "kinds"; "kings"; "kinks";
    "kinky"; "kiosk"; "kited"; "kites"; "kitty"; "kiwis"; "kluge"; "klutz";
    "knack"; "knave"; "knead"; "kneed"; "kneel"; "knees"; "knell"; "knelt";
    "knife"; "knits"; "knobs"; "knock"; "knoll"; "knots"; "known"; "knows";
    "koala"; "koans"; "kooks"; "kooky"; "kopek"; "krone"; "kudos"; "kudzu";
    "label"; "labor"; "laced"; "laces"; "lacks"; "laded"; "laden"; "lades";
    "ladle"; "lager"; "lairs"; "laity"; "lakes"; "lamas"; "lambs"; "lamed";
    "lamer"; "lames"; "lamps"; "lance"; "lands"; "lanes"; "lanky"; "lapel";
    "lapse"; "larch"; "lards"; "large"; "largo"; "larks"; "larva"; "lased";
    "laser"; "lases"; "lasso"; "lasts"; "latch"; "later"; "latex"; "lathe";
    "laths"; "latte"; "lauds"; "laugh"; "lawns"; "laxer"; "laxly"; "layer";
    "lazed"; "lazes"; "leach"; "leads"; "leafs"; "leafy"; "leaks"; "leaky";
    "leans"; "leaps"; "leapt"; "learn"; "lease"; "leash"; "least"; "leave";
    "ledge"; "leech"; "leeks"; "leers"; "leery"; "lefts"; "lefty"; "legal";
    "leggy"; "legit"; "lemma"; "lemme"; "lemon"; "lemur"; "lends"; "leper";
    "letup"; "levee"; "level"; "lever"; "lexer"; "liars"; "libel"; "licit";
    "licks"; "liege"; "liens"; "lifer"; "lifts"; "light"; "liked"; "liken";
    "liker"; "likes"; "lilac"; "lilts"; "limbo"; "limbs"; "limed"; "limes";
    "limit"; "limns"; "limos"; "limps"; "lined"; "linen"; "liner"; "lines";
    "lingo"; "links"; "lints"; "lions"; "lipid"; "liras"; "lisle"; "lisps";
    "lists"; "liter"; "lithe"; "lived"; "liven"; "liver"; "lives"; "livid";
    "llama"; "llano"; "loads"; "loafs"; "loamy"; "loans"; "loath"; "lobby";
    "lobed"; "lobes"; "local"; "locks"; "locus"; "lodes"; "lodge"; "lofts";
    "lofty"; "loges"; "logic"; "login"; "logon"; "logos"; "loins"; "lolls";
    "loner"; "longs"; "looks"; "looms"; "loons"; "loony"; "loops"; "loopy";
    "loose"; "loots"; "loped"; "lopes"; "lords"; "lorry"; "loser"; "loses";
    "lotto"; "lotus"; "louse"; "lousy"; "louts"; "loved"; "lover"; "loves";
    "lowed"; "lower"; "lowly"; "loxes"; "loyal"; "luaus"; "lubed"; "lubes";
    "lucid"; "lucks"; "lucky"; "lucre"; "lulls"; "lumps"; "lumpy"; "lunar";
    "lunch"; "lunge"; "lungs"; "lupin"; "lupus"; "lurch"; "lured"; "lures";
    "lurid"; "lurks"; "lusts"; "lusty"; "lutes"; "lying"; "lymph"; "lynch";
    "lyres"; "lyric"; "macaw"; "maced"; "maces"; "macho"; "macro"; "madam";
    "madly"; "magic"; "magma"; "maids"; "mails"; "maims"; "mains"; "maize";
    "major"; "maker"; "makes"; "males"; "malls"; "malts"; "mamas"; "mambo";
    "mamma"; "manes"; "manga"; "mange"; "mango"; "mangy"; "mania"; "manic";
    "manly"; "manna"; "manor"; "manse"; "maple"; "march"; "mares"; "maria";
    "marks"; "marry"; "marsh"; "marts"; "masks"; "mason"; "masts"; "match";
    "mated"; "mates"; "matte"; "matts"; "matzo"; "mauls"; "mauve"; "maven";
    "mavin"; "maxed"; "maxes"; "maxim"; "maybe"; "mayor"; "mazes"; "meals";
    "mealy"; "means"; "meant"; "meats"; "meaty"; "mecca"; "medal"; "media";
    "medic"; "meets"; "melds"; "melon"; "melts"; "memes"; "memos"; "mends";
    "menus"; "meows"; "mercy"; "meres"; "merge"; "merit"; "merry"; "mesas";
    "messy"; "metal"; "meted"; "meter"; "metes"; "metro"; "mewed"; "mewls";
    "miaow"; "micra"; "middy"; "midge"; "midst"; "miens"; "miffs"; "might";
    "miked"; "mikes"; "milch"; "miler"; "miles"; "milfs"; "milks"; "milky";
    "mills"; "mimed"; "mimes"; "mimic"; "mince"; "minds"; "mined"; "miner";
    "mines"; "minim"; "minis"; "minks"; "minor"; "mints"; "minty"; "minus";
    "mired"; "mires"; "mirth"; "misdo"; "miser"; "mists"; "misty"; "miter";
    "mites"; "mitts"; "mixed"; "mixer"; "mixes"; "moans"; "moats"; "mocha";
    "mocks"; "modal"; "model"; "modem"; "modes"; "mogul"; "moire"; "moist";
    "molar"; "molds"; "moldy"; "moles"; "molls"; "molts"; "momma"; "mommy";
    "money"; "monks"; "month"; "mooch"; "moods"; "moody"; "mooed"; "moons";
    "moors"; "moose"; "moots"; "moped"; "mopes"; "moral"; "moray"; "mores";
    "morns"; "moron"; "mosey"; "mossy"; "motel"; "motes"; "moths"; "motif";
    "motor"; "motto"; "mound"; "mount"; "mourn"; "mouse"; "mousy"; "mouth";
    "moved"; "mover"; "moves"; "movie"; "mowed"; "mower"; "mucks"; "mucky";
    "mucus"; "muddy"; "muffs"; "mufti"; "muggy"; "mulch"; "mules"; "mulls";
    "multi"; "mummy"; "mumps"; "munch"; "mungs"; "mural"; "murks"; "murky";
    "mused"; "muses"; "mushy"; "music"; "musky"; "mussy"; "musts"; "musty";
    "muted"; "muter"; "mutes"; "mutts"; "mynah"; "mynas"; "myrrh"; "myths";
    "nabob"; "nacho"; "nacre"; "nadir"; "naiad"; "nails"; "naive"; "naked";
    "named"; "names"; "nanny"; "napes"; "nappy"; "narcs"; "narks"; "nasal";
    "nasty"; "natal"; "natty"; "naval"; "navel"; "naves"; "nears"; "neath";
    "necks"; "needs"; "needy"; "neigh"; "nerds"; "nerdy"; "nerve"; "nervy";
    "nests"; "never"; "newel"; "newer"; "newly"; "newsy"; "newts"; "nexus";
    "nicer"; "niche"; "nicks"; "niece"; "nifty"; "night"; "nimbi"; "nines";
    "ninja"; "ninny"; "ninth"; "nippy"; "niter"; "nites"; "nixed"; "nixes";
    "noble"; "nobly"; "nodal"; "noddy"; "nodes"; "noels"; "noise"; "noisy";
    "nomad"; "nonce"; "nooks"; "noose"; "norms"; "north"; "nosed"; "noses";
    "nosey"; "notch"; "noted"; "notes"; "nouns"; "novae"; "novas"; "novel";
    "noway"; "nuder"; "nudes"; "nudge"; "nuked"; "nukes"; "nulls"; "numbs";
    "nurse"; "nutty"; "nylon"; "nymph"; "oaken"; "oakum"; "oared"; "oases";
    "oasis"; "oaten"; "oaths"; "obese"; "obeys"; "obits"; "oboes"; "occur";
    "ocean"; "ocher"; "ochre"; "octal"; "octet"; "odder"; "oddly"; "odium";
    "odors"; "offal"; "offed"; "offer"; "often"; "ogled"; "ogles"; "ogres";
    "oiled"; "oinks"; "okays"; "okras"; "olden"; "older"; "oldie"; "olive";
    "omega"; "omens"; "omits"; "onion"; "onset"; "oozed"; "oozes"; "opals";
    "opens"; "opera"; "opine"; "opium"; "opted"; "optic"; "orals"; "orate";
    "orbit"; "order"; "organ"; "osier"; "other"; "otter"; "ought"; "ounce";
    "ousts"; "outdo"; "outed"; "outer"; "outgo"; "ovals"; "ovary"; "ovens";
    "overs"; "overt"; "ovoid"; "ovule"; "owing"; "owlet"; "owned"; "owner";
    "oxbow"; "oxide"; "ozone"; "paced"; "paces"; "packs"; "pacts"; "paddy";
    "padre"; "paean"; "pagan"; "paged"; "pager"; "pages"; "pails"; "pains";
    "paint"; "pairs"; "paled"; "paler"; "pales"; "palls"; "palms"; "palmy";
    "palsy"; "panda"; "panel"; "panes"; "pangs"; "panic"; "pansy"; "pants";
    "panty"; "papal"; "papas"; "papaw"; "paper"; "parch"; "pared"; "pares";
    "parka"; "parks"; "parry"; "parse"; "parts"; "party"; "pasha"; "pasta";
    "paste"; "pasts"; "pasty"; "patch"; "pates"; "paths"; "patio"; "patsy";
    "patty"; "pause"; "paved"; "paves"; "pawed"; "pawls"; "pawns"; "payed";
    "payee"; "payer"; "peace"; "peach"; "peaks"; "peals"; "pearl"; "pears";
    "pease"; "pecan"; "pecks"; "pedal"; "peeks"; "peels"; "peeps"; "peers";
    "peeve"; "pekoe"; "pelts"; "penal"; "pence"; "pends"; "penny"; "peons";
    "peony"; "peppy"; "perch"; "peril"; "perks"; "perky"; "perms"; "pesky";
    "pesos"; "pests"; "petal"; "peter"; "petty"; "pewee"; "phage"; "phase";
    "phial"; "phish"; "phlox"; "phone"; "phony"; "photo"; "phyla"; "piano";
    "picks"; "picky"; "piece"; "piers"; "piety"; "piggy"; "pigmy"; "piked";
    "piker"; "pikes"; "pilaf"; "pilau"; "pilaw"; "piled"; "piles"; "pills";
    "pilot"; "pimps"; "pinch"; "pined"; "pines"; "pings"; "pinks"; "pinky";
    "pinto"; "pints"; "pinup"; "pious"; "piped"; "piper"; "pipes"; "pipit";
    "pique"; "pitch"; "pithy"; "piton"; "pivot"; "pixel"; "pixie"; "pizza";
    "place"; "plaid"; "plain"; "plait"; "plane"; "plank"; "plans"; "plant";
    "plate"; "plays"; "plaza"; "plead"; "pleas"; "pleat"; "plied"; "plies";
    "plods"; "plonk"; "plops"; "plots"; "plows"; "ploys"; "pluck"; "plugs";
    "plumb"; "plume"; "plump"; "plums"; "plunk"; "plush"; "poach"; "pocks";
    "podia"; "poems"; "poesy"; "poets"; "point"; "poise"; "poked"; "poker";
    "pokes"; "pokey"; "polar"; "poled"; "poles"; "polio"; "polka"; "polls";
    "polyp"; "ponds"; "pones"; "pooch"; "poohs"; "pools"; "poops"; "popes";
    "poppa"; "poppy"; "porch"; "pored"; "pores"; "ports"; "posed"; "poser";
    "poses"; "posit"; "posse"; "posts"; "potty"; "pouch"; "pound"; "pours";
    "pouts"; "power"; "poxes"; "prank"; "prate"; "prawn"; "prays"; "preen";
    "preps"; "press"; "preys"; "price"; "prick"; "pricy"; "pride"; "pried";
    "pries"; "prigs"; "prime"; "primp"; "print"; "prior"; "prism"; "privy";
    "prize"; "probe"; "prods"; "profs"; "promo"; "proms"; "prone"; "prong";
    "proof"; "props"; "prose"; "prosy"; "proud"; "prove"; "prowl"; "prows";
    "proxy"; "prude"; "prune"; "psalm"; "pshaw"; "psych"; "pubic"; "pucks";
    "pudgy"; "puffs"; "puffy"; "puked"; "pukes"; "pulls"; "pulps"; "pulpy";
    "pulse"; "pumas"; "pumps"; "punch"; "punks"; "punts"; "pupae"; "pupal";
    "pupas"; "pupil"; "puppy"; "puree"; "purer"; "purge"; "purls"; "purrs";
    "purse"; "pushy"; "putts"; "putty"; "pwned"; "pygmy"; "pylon"; "pyres";
    "pyxes"; "quack"; "quads"; "quaff"; "quail"; "quake"; "qualm"; "quark";
    "quart"; "quash"; "quasi"; "quays"; "queen"; "queer"; "quell"; "query";
    "quest"; "queue"; "quick"; "quids"; "quiet"; "quill"; "quilt"; "quine";
    "quips"; "quire"; "quirk"; "quite"; "quits"; "quoit"; "quota"; "quote";
    "quoth"; "rabbi"; "rabid"; "raced"; "racer"; "races"; "racks"; "radar";
    "radii"; "radio"; "radon"; "rafts"; "ragas"; "raged"; "rages"; "raids";
    "rails"; "rains"; "rainy"; "raise"; "rajah"; "rajas"; "raked"; "rakes";
    "rally"; "ramps"; "ranch"; "randy"; "range"; "rangy"; "ranks"; "rants";
    "rapid"; "rared"; "rarer"; "rares"; "rasps"; "raspy"; "rated"; "rates";
    "ratio"; "ratty"; "raved"; "ravel"; "raven"; "raves"; "rawer"; "rayon";
    "razed"; "razes"; "razor"; "reach"; "react"; "reads"; "ready"; "realm";
    "reals"; "reams"; "reaps"; "rearm"; "rears"; "rebel"; "rebus"; "rebut";
    "recap"; "recur"; "redid"; "reeds"; "reedy"; "reefs"; "reeks"; "reels";
    "reeve"; "refer"; "refit"; "regal"; "rehab"; "reign"; "reins"; "relax";
    "relay"; "relic"; "remit"; "renal"; "rends"; "renew"; "rents"; "repay";
    "repel"; "reply"; "reran"; "rerun"; "reset"; "resin"; "rests"; "retch";
    "retry"; "reuse"; "revel"; "revue"; "rheas"; "rheum"; "rhino"; "rhyme";
    "riced"; "rices"; "ricks"; "rider"; "rides"; "ridge"; "rifer"; "riffs";
    "rifle"; "rifts"; "right"; "rigid"; "rigor"; "riled"; "riles"; "rills";
    "rimed"; "rimes"; "rinds"; "rings"; "rinks"; "rinse"; "riots"; "ripen";
    "riper"; "risen"; "riser"; "rises"; "risks"; "risky"; "rites"; "ritzy";
    "rival"; "riven"; "river"; "rivet"; "roach"; "roads"; "roams"; "roans";
    "roars"; "roast"; "robed"; "robes"; "robin"; "robot"; "rocks"; "rocky";
    "rodeo"; "roger"; "rogue"; "roils"; "roles"; "rolls"; "roman"; "romps";
    "roods"; "roofs"; "rooks"; "rooms"; "roomy"; "roost"; "roots"; "roped";
    "ropes"; "roses"; "rosin"; "rotor"; "rouge"; "rough"; "round"; "rouse";
    "route"; "routs"; "roved"; "rover"; "roves"; "rowdy"; "rowed"; "rowel";
    "rower"; "royal"; "rubes"; "ruble"; "ruddy"; "ruder"; "ruffs"; "rugby";
    "ruing"; "ruins"; "ruled"; "ruler"; "rules"; "rumba"; "rummy"; "rumor";
    "rumps"; "runes"; "rungs"; "runic"; "runny"; "runts"; "rupee"; "rural";
    "ruses"; "rusks"; "rusts"; "rusty"; "saber"; "sable"; "sabre"; "sacks";
    "sades"; "sadly"; "safer"; "safes"; "sagas"; "sager"; "sages"; "sahib";
    "sails"; "saint"; "saith"; "salad"; "sales"; "sally"; "salon"; "salsa";
    "salts"; "salty"; "salve"; "salvo"; "samba"; "sames"; "sands"; "sandy";
    "saner"; "sappy"; "saree"; "saris"; "sassy"; "satay"; "sated"; "sates";
    "satin"; "satyr"; "sauce"; "saucy"; "sauna"; "saved"; "saver"; "saves";
    "savor"; "savvy"; "sawed"; "saxes"; "scabs"; "scads"; "scags"; "scald";
    "scale"; "scalp"; "scaly"; "scamp"; "scams"; "scans"; "scant"; "scare";
    "scarf"; "scars"; "scary"; "scats"; "scene"; "scent"; "schwa"; "scion";
    "scoff"; "scold"; "scone"; "scoop"; "scoot"; "scope"; "score"; "scorn";
    "scour"; "scout"; "scowl"; "scows"; "scram"; "scrap"; "screw"; "scrip";
    "scrod"; "scrog"; "scrub"; "scuba"; "scuds"; "scuff"; "scull"; "scums";
    "scurf"; "seals"; "seams"; "seamy"; "sears"; "seats"; "sects"; "sedan";
    "sedge"; "seeds"; "seedy"; "seeks"; "seems"; "seeps"; "seers"; "segue";
    "seize"; "sells"; "semis"; "sends"; "senna"; "sense"; "sepal"; "sepia";
    "septa"; "serer"; "serfs"; "serge"; "serum"; "serve"; "servo"; "setup";
    "seven"; "sever"; "sewed"; "sewer"; "sexed"; "sexes"; "shack"; "shade";
    "shads"; "shady"; "shaft"; "shags"; "shahs"; "shake"; "shaky"; "shale";
    "shall"; "shalt"; "shame"; "shams"; "shank"; "shape"; "shard"; "share";
    "shark"; "sharp"; "shave"; "shawl"; "sheaf"; "shear"; "sheds"; "sheen";
    "sheep"; "sheer"; "sheet"; "sheik"; "shelf"; "shell"; "sherd"; "shied";
    "shies"; "shift"; "shill"; "shims"; "shine"; "shins"; "shiny"; "ships";
    "shire"; "shirk"; "shirr"; "shirt"; "shlep"; "shoal"; "shock"; "shoed";
    "shoes"; "shone"; "shook"; "shoon"; "shoos"; "shoot"; "shops"; "shore";
    "shorn"; "short"; "shots"; "shout"; "shove"; "shown"; "shows"; "showy";
    "shred"; "shrew"; "shrub"; "shrug"; "shtik"; "shuck"; "shuns"; "shunt";
    "shush"; "shuts"; "shyer"; "shyly"; "sibyl"; "sicks"; "sided"; "sides";
    "sidle"; "siege"; "sieve"; "sifts"; "sighs"; "sight"; "sigma"; "signs";
    "silks"; "silky"; "sills"; "silly"; "silos"; "silts"; "since"; "sinew";
    "singe"; "sings"; "sinks"; "sinus"; "sired"; "siren"; "sires"; "sirup";
    "sisal"; "sises"; "sissy"; "sitar"; "sited"; "sites"; "sixes"; "sixth";
    "sixty"; "sized"; "sizer"; "sizes"; "skate"; "skeet"; "skein"; "skews";
    "skids"; "skied"; "skier"; "skies"; "skiff"; "skill"; "skimp"; "skims";
    "skins"; "skips"; "skirt"; "skits"; "skulk"; "skull"; "skunk"; "skyed";
    "slabs"; "slack"; "slags"; "slain"; "slake"; "slams"; "slang"; "slant";
    "slaps"; "slash"; "slate"; "slats"; "slave"; "slays"; "sleds"; "sleek";
    "sleep"; "sleet"; "slept"; "slews"; "slice"; "slick"; "slide"; "slier";
    "slily"; "slime"; "slims"; "slimy"; "sling"; "slink"; "slips"; "slits";
    "slobs"; "sloes"; "slogs"; "sloop"; "slope"; "slops"; "slosh"; "sloth";
    "slots"; "slows"; "slued"; "slues"; "slugs"; "slump"; "slums"; "slung";
    "slunk"; "slurp"; "slurs"; "slush"; "slyer"; "slyly"; "smack"; "small";
    "smart"; "smash"; "smear"; "smell"; "smelt"; "smile"; "smirk"; "smite";
    "smith"; "smock"; "smoke"; "smoky"; "smote"; "smurf"; "smuts"; "snack";
    "snafu"; "snags"; "snail"; "snake"; "snaky"; "snaps"; "snare"; "snarf";
    "snark"; "snarl"; "sneak"; "sneer"; "snide"; "sniff"; "snipe"; "snips";
    "snits"; "snobs"; "snoop"; "snoot"; "snore"; "snort"; "snots"; "snout";
    "snows"; "snowy"; "snubs"; "snuck"; "snuff"; "snugs"; "soaks"; "soaps";
    "soapy"; "soars"; "sober"; "socks"; "sodas"; "sofas"; "softy"; "soggy";
    "soils"; "solar"; "soled"; "soles"; "solid"; "solos"; "solve"; "sonar";
    "songs"; "sonic"; "sonny"; "sooth"; "sooty"; "soppy"; "sorer"; "sores";
    "sorry"; "sorta"; "sorts"; "sough"; "souls"; "sound"; "soups"; "soupy";
    "sours"; "souse"; "south"; "sowed"; "sower"; "space"; "spacy"; "spade";
    "spake"; "spams"; "spank"; "spans"; "spare"; "spark"; "spars"; "spasm";
    "spate"; "spats"; "spawn"; "spays"; "speak"; "spear"; "speck"; "specs";
    "speed"; "spell"; "spelt"; "spend"; "spent"; "sperm"; "spews"; "spice";
    "spicy"; "spied"; "spiel"; "spies"; "spike"; "spiky"; "spill"; "spilt";
    "spine"; "spins"; "spiny"; "spire"; "spite"; "spits"; "splat"; "splay";
    "split"; "spoil"; "spoke"; "spoof"; "spook"; "spool"; "spoon"; "spoor";
    "spore"; "sport"; "spots"; "spout"; "sprat"; "spray"; "spree"; "sprig";
    "spuds"; "spume"; "spunk"; "spurn"; "spurs"; "spurt"; "squab"; "squad";
    "squat"; "squid"; "stabs"; "stack"; "staff"; "stage"; "stags"; "staid";
    "stain"; "stair"; "stake"; "stale"; "stalk"; "stall"; "stamp"; "stand";
    "stank"; "staph"; "stare"; "stark"; "stars"; "start"; "stash"; "state";
    "stats"; "stave"; "stays"; "stead"; "steak"; "steal"; "steam"; "steed";
    "steel"; "steep"; "steer"; "stein"; "stems"; "stent"; "steps"; "stern";
    "stews"; "stick"; "sties"; "stiff"; "stile"; "still"; "stilt"; "sting";
    "stink"; "stint"; "stirs"; "stoat"; "stock"; "stoic"; "stoke"; "stole";
    "stomp"; "stone"; "stony"; "stood"; "stool"; "stoop"; "stops"; "store";
    "stork"; "storm"; "story"; "stout"; "stove"; "stows"; "strap"; "straw";
    "stray"; "strep"; "strew"; "strip"; "strop"; "strum"; "strut"; "stubs";
    "stuck"; "studs"; "study"; "stuff"; "stump"; "stung"; "stunk"; "stuns";
    "stunt"; "styes"; "style"; "styli"; "suave"; "sucks"; "sudsy"; "suede";
    "sugar"; "suing"; "suite"; "suits"; "sulks"; "sulky"; "sully"; "sumac";
    "sumps"; "sunny"; "sunup"; "super"; "surer"; "surfs"; "surge"; "surly";
    "sushi"; "swabs"; "swags"; "swain"; "swami"; "swamp"; "swank"; "swans";
    "swaps"; "sward"; "swarm"; "swash"; "swath"; "swats"; "sways"; "swear";
    "sweat"; "sweep"; "sweet"; "swell"; "swept"; "swift"; "swigs"; "swill";
    "swims"; "swine"; "swing"; "swipe"; "swirl"; "swish"; "swoon"; "swoop";
    "swops"; "sword"; "swore"; "sworn"; "swung"; "sylph"; "synch"; "syncs";
    "synod"; "syrup"; "sysop"; "tabby"; "table"; "taboo"; "tabus"; "tacit";
    "tacks"; "tacky"; "tacos"; "taffy"; "tails"; "taint"; "taken"; "taker";
    "takes"; "tales"; "talks"; "tally"; "talon"; "tamed"; "tamer"; "tames";
    "tamps"; "tango"; "tangs"; "tangy"; "tanks"; "tansy"; "taped"; "taper";
    "tapes"; "tapir"; "tardy"; "tared"; "tares"; "taros"; "tarot"; "tarps";
    "tarry"; "tarts"; "taser"; "tasks"; "taste"; "tasty"; "tatty"; "taunt";
    "taupe"; "tawny"; "taxed"; "taxes"; "taxis"; "teach"; "teaks"; "teals";
    "teams"; "tears"; "teary"; "tease"; "teats"; "techs"; "teems"; "teens";
    "teeny"; "teeth"; "telex"; "tells"; "tempi"; "tempo"; "temps"; "tempt";
    "tends"; "tenet"; "tenon"; "tenor"; "tense"; "tenth"; "tents"; "tepee";
    "tepid"; "terms"; "terns"; "terry"; "terse"; "tests"; "testy"; "texts";
    "thank"; "thaws"; "thees"; "theft"; "their"; "theme"; "there"; "these";
    "theta"; "thick"; "thief"; "thigh"; "thine"; "thing"; "think"; "thins";
    "third"; "thong"; "thorn"; "those"; "thous"; "three"; "threw"; "throb";
    "throe"; "throw"; "thrum"; "thuds"; "thugs"; "thumb"; "thump"; "thunk";
    "thyme"; "thymi"; "tiara"; "tibia"; "ticks"; "tidal"; "tided"; "tides";
    "tiers"; "tiffs"; "tiger"; "tight"; "tikes"; "tilde"; "tiled"; "tiles";
    "tills"; "tilts"; "timed"; "timer"; "times"; "timid"; "tines"; "tinge";
    "tings"; "tinny"; "tints"; "tipis"; "tipsy"; "tired"; "tires"; "tiros";
    "titan"; "tithe"; "title"; "tizzy"; "toads"; "toady"; "toast"; "today";
    "toddy"; "toffy"; "togae"; "togas"; "toils"; "toked"; "token"; "tokes";
    "tolls"; "tombs"; "tomes"; "tonal"; "toned"; "toner"; "tones"; "tongs";
    "tonic"; "tonne"; "tools"; "tooth"; "toots"; "topaz"; "topic"; "toque";
    "torch"; "torsi"; "torso"; "torte"; "torts"; "torus"; "total"; "toted";
    "totem"; "totes"; "touch"; "tough"; "tours"; "touts"; "towed"; "towel";
    "tower"; "towns"; "toxic"; "toxin"; "toyed"; "trace"; "track"; "tract";
    "trade"; "trail"; "train"; "trait"; "tramp"; "trams"; "trans"; "traps";
    "trash"; "trawl"; "trays"; "tread"; "treas"; "treat"; "treed"; "trees";
    "treks"; "trend"; "tress"; "triad"; "trial"; "tribe"; "trice"; "trick";
    "tried"; "tries"; "trike"; "trill"; "trims"; "trios"; "tripe"; "trips";
    "trite"; "troll"; "tromp"; "trons"; "troop"; "trope"; "troth"; "trots";
    "trout"; "troys"; "truce"; "truck"; "trued"; "truer"; "trues"; "truly";
    "trump"; "trunk"; "truss"; "trust"; "truth"; "tryst"; "tsars"; "tubas";
    "tubby"; "tubed"; "tuber"; "tubes"; "tucks"; "tufts"; "tulip"; "tulle";
    "tumid"; "tummy"; "tumor"; "tunas"; "tuned"; "tuner"; "tunes"; "tunic";
    "tunny"; "turds"; "turfs"; "turns"; "tusks"; "tutor"; "tutus"; "tuxes";
    "twain"; "twang"; "tweak"; "tweed"; "tweet"; "twerk"; "twerp"; "twice";
    "twigs"; "twill"; "twine"; "twink"; "twins"; "twirl"; "twist"; "twits";
    "tying"; "tykes"; "typed"; "types"; "typos"; "tyros"; "tzars"; "udder";
    "ulcer"; "ulnae"; "ulnas"; "ultra"; "umbel"; "umber"; "umiak"; "umped";
    "unbar"; "uncle"; "uncut"; "under"; "undid"; "undue"; "unfit"; "unify";
    "union"; "unite"; "units"; "unity"; "unman"; "unpin"; "unsay"; "unset";
    "untie"; "until"; "unwed"; "unzip"; "upend"; "upped"; "upper"; "upset";
    "urban"; "urged"; "urges"; "urine"; "usage"; "users"; "usher"; "using";
    "usual"; "usurp"; "usury"; "uteri"; "utter"; "uvula"; "vacua"; "vague";
    "vales"; "valet"; "valid"; "valor"; "value"; "valve"; "vamps"; "vanes";
    "vaped"; "vapes"; "vapid"; "vapor"; "vases"; "vasts"; "vault"; "vaunt";
    "veeps"; "veers"; "vegan"; "veils"; "veins"; "velds"; "veldt"; "venal";
    "vends"; "venom"; "vents"; "venue"; "verbs"; "verge"; "verse"; "verve";
    "vests"; "vetch"; "vexed"; "vexes"; "vials"; "viand"; "vibes"; "vicar";
    "viced"; "vices"; "video"; "views"; "vigil"; "vigor"; "viler"; "villa";
    "vines"; "vinyl"; "viola"; "viols"; "viper"; "viral"; "vireo"; "virus";
    "visas"; "vised"; "vises"; "visit"; "visor"; "vista"; "vital"; "vivas";
    "vivid"; "vixen"; "vizor"; "vocal"; "vodka"; "vogue"; "voice"; "voids";
    "voile"; "voles"; "volts"; "vomit"; "voted"; "voter"; "votes"; "vouch";
    "vowed"; "vowel"; "vulva"; "vying"; "wacko"; "wacks"; "wacky"; "waded";
    "wader"; "wades"; "wadis"; "wafer"; "wafts"; "waged"; "wager"; "wages";
    "wagon"; "waifs"; "wails"; "waist"; "waits"; "waive"; "waked"; "waken";
    "wakes"; "waldo"; "waled"; "wales"; "walks"; "walls"; "waltz"; "wands";
    "waned"; "wanes"; "wanly"; "wanna"; "wants"; "wards"; "wares"; "warez";
    "warms"; "warns"; "warps"; "warts"; "warty"; "wasps"; "waste"; "watch";
    "water"; "watts"; "waved"; "waver"; "waves"; "waxed"; "waxen"; "waxes";
    "weals"; "weans"; "wears"; "weary"; "weave"; "wedge"; "weeds"; "weedy";
    "weeks"; "weeps"; "weepy"; "weest"; "wefts"; "weigh"; "weird"; "weirs";
    "welch"; "welds"; "wells"; "welsh"; "welts"; "wench"; "wends"; "wetly";
    "whack"; "whale"; "whams"; "wharf"; "whats"; "wheal"; "wheat"; "wheel";
    "whelk"; "whelp"; "whens"; "where"; "whets"; "which"; "whiff"; "while";
    "whims"; "whine"; "whiny"; "whips"; "whirl"; "whirr"; "whirs"; "whisk";
    "whist"; "white"; "whits"; "whizz"; "whole"; "whoop"; "whorl"; "whose";
    "wicks"; "widen"; "wider"; "widow"; "width"; "wield"; "wight"; "wikis";
    "wilds"; "wiled"; "wiles"; "wills"; "wilts"; "wimps"; "wimpy"; "wince";
    "winch"; "winds"; "windy"; "wined"; "wines"; "wings"; "winks"; "winos";
    "wiped"; "wiper"; "wipes"; "wired"; "wires"; "wiser"; "wises"; "wisps";
    "wispy"; "witch"; "witty"; "wives"; "wizes"; "woken"; "wolfs"; "woman";
    "wombs"; "women"; "wonky"; "woods"; "woody"; "wooed"; "wooer"; "woofs";
    "wooly"; "woozy"; "words"; "wordy"; "works"; "world"; "worms"; "wormy";
    "worry"; "worse"; "worst"; "worth"; "would"; "wound"; "woven"; "wowed";
    "wrack"; "wraps"; "wrapt"; "wrath"; "wreak"; "wreck"; "wrens"; "wrest";
    "wrier"; "wring"; "wrist"; "write"; "writs"; "wrong"; "wrote"; "wroth";
    "wrung"; "wryer"; "wryly"; "xenon"; "xrefs"; "xterm"; "xylem"; "yacht";
    "yacks"; "yahoo"; "yanks"; "yards"; "yarns"; "yawed"; "yawls"; "yawns";
    "yeahs"; "yearn"; "years"; "yeast"; "yells"; "yelps"; "yeses"; "yield";
    "yocks"; "yodel"; "yogin"; "yogis"; "yoked"; "yokel"; "yokes"; "yolks";
    "young"; "yours"; "youth"; "yowls"; "yucca"; "yucks"; "yucky"; "yummy";
    "yuppy"; "zebra"; "zebus"; "zeros"; "zests"; "zilch"; "zincs"; "zings";
    "zippy"; "zombi"; "zonal"; "zoned"; "zones"; "zooms"; "zorch";
  |]
```

It would be important to note that word_list is an array.
:::

Open the provided game code below and press **Run** to render the board. You need not read every function, though it is a useful example of idiomatic OCaml. The board starts with minimal functionality and gets built up as you finish the problems.

:::game-panel
```ocaml
(* PROVIDED, continued -- uses word_length/max_guesses/word_list/
   letter_status/game_state/initial_state from the cell just above. *)
let fixed_target_words = [| "house"; "plant"; "chair"; "grape"; "smile" |]
let next_fixed_target = ref 0

(* Shared by random_target_ref's default and safe_random_target's fallback,
   so New Game keeps cycling even before Problem 1 is solved. *)
let cycle_fixed_target () =
  let w = fixed_target_words.(!next_fixed_target mod Array.length fixed_target_words) in
  incr next_fixed_target;
  w

let random_target_ref : (string array -> string) ref = ref (fun _ -> cycle_fixed_target ())

let score_guess_ref : (string -> string -> letter_status array) ref =
  ref (fun _ _ -> Array.make word_length Absent)

(* Default: never guessed, never colored, until Problem 4 is solved. *)
let keyboard_hint_ref : ((string * letter_status array) list -> char -> letter_status option) ref =
  ref (fun _ _ -> None)

(* Default accepts anything, until Problem 5 is solved. *)
let is_valid_guess_ref : (string array -> string -> bool) ref = ref (fun _ _ -> true)

let is_win_ref : (letter_status array -> bool) ref = ref (fun _ -> false)

(* Guards every ref read below, in case it still holds an unsolved
   problem's "not implemented" stub. Modeled on life_partial.html's
   `population_opt`. *)
let safe_random_target words =
  match (try Some (!random_target_ref words) with _ -> None) with
  | Some w -> w
  | None -> cycle_fixed_target ()

let safe_score_guess target guess =
  match (try Some (!score_guess_ref target guess) with _ -> None) with
  | Some scored -> scored
  | None -> Array.make word_length Absent

let safe_keyboard_hint guesses ch = try !keyboard_hint_ref guesses ch with _ -> None

(* Falls back to true, not false, so a broken ref doesn't block every guess. *)
let safe_is_valid_guess words guess = try !is_valid_guess_ref words guess with _ -> true

let safe_is_win scored = try !is_win_ref scored with _ -> false

let session = ref (initial_state (safe_random_target word_list))

let class_of_status = function
  | Correct -> "wd-correct"
  | Present -> "wd-present"
  | Absent -> "wd-absent"

let tile cls ch =
  Printf.sprintf "<div class=\"wd-tile %s\">%s</div>" cls
    (match ch with None -> "" | Some c -> String.make 1 (Char.uppercase_ascii c))

let scored_row (guess, scored) =
  String.concat ""
    (List.init word_length (fun i ->
         tile (class_of_status scored.(i)) (Some guess.[i])))

(* Filled tiles show but aren't colored -- that would give the answer away early. *)
let current_row s =
  String.concat ""
    (List.init word_length (fun i ->
         if i < String.length s.current then tile "wd-filled" (Some s.current.[i])
         else tile "" None))

let blank_row = String.concat "" (List.init word_length (fun _ -> tile "" None))

let board_html s =
  let played = List.length s.guesses in
  let shown = played + if s.over then 0 else 1 in
  let rows =
    List.rev_map scored_row s.guesses
    @ (if s.over then [] else [ current_row s ])
    @ List.init (max 0 (max_guesses - shown)) (fun _ -> blank_row)
  in
  "<div class=\"wd-board\">"
  ^ String.concat "" (List.map (fun r -> "<div class=\"wd-row\">" ^ r ^ "</div>") rows)
  ^ "</div>"

let key_button s pos label wide =
  let hint =
    if String.length pos <> 1 then ""
    else
      match safe_keyboard_hint s.guesses pos.[0] with
      | None -> ""
      | Some st -> " " ^ class_of_status st
  in
  Printf.sprintf "<button class=\"wd-key%s%s\" data-xo-pos=\"%s\">%s</button>"
    (if wide then " wd-wide" else "")
    hint pos label

let letter_keys s letters =
  String.concat ""
    (List.map
       (fun c ->
         key_button s (String.make 1 c)
           (String.make 1 (Char.uppercase_ascii c))
           false)
       (List.of_seq (String.to_seq letters)))

let keyboard_html s =
  let krow inner = "<div class=\"wd-krow\">" ^ inner ^ "</div>" in
  krow (letter_keys s "qwertyuiop")
  ^ krow (letter_keys s "asdfghjkl")
  ^ krow
      (key_button s "Enter" "Enter" true
      ^ letter_keys s "zxcvbnm"
      ^ key_button s "Backspace" "&#9003;" true)

let status_html s =
  if not s.over then
    Printf.sprintf "<p>guess %d of %d</p>" (List.length s.guesses + 1) max_guesses
  else
    match s.guesses with
    | (_, scored) :: _ when safe_is_win scored -> "<p><b>got it!</b></p>"
    | _ ->
        Printf.sprintf "<p>out of guesses &mdash; the word was <b>%s</b></p>"
          (String.uppercase_ascii s.target)

let refresh () =
  let s = !session in
  Game_lib.render
    (board_html s ^ status_html s
    ^ "<p><button data-xo-pos=\"new_game\">New game</button></p>"
    ^ keyboard_html s)

(* PROVIDED -- not a problem: builds the NEW state after a submitted
   guess, the same way Game of Life's next_generation returns a fresh
   board rather than mutating one in place. *)
let record_guess state guess =
  let scored = safe_score_guess state.target guess in
  {
    state with
    guesses = (guess, scored) :: state.guesses;
    current = "";
    over = safe_is_win scored || List.length state.guesses + 1 >= max_guesses;
  }

let is_letter c = c >= 'a' && c <= 'z'

(* Anything besides one lowercase letter, Enter, or Backspace is not a move. *)
let handle_key key =
  let s = !session in
  if not s.over then
    match key with
    | "Enter" when String.length s.current = word_length && safe_is_valid_guess word_list s.current ->
        session := record_guess s s.current
    | "Backspace" ->
        session :=
          { s with current = String.sub s.current 0 (max 0 (String.length s.current - 1)) }
    | k
      when String.length k = 1
           && is_letter (Char.lowercase_ascii k.[0])
           && String.length s.current < word_length ->
        session := { s with current = s.current ^ String.lowercase_ascii k }
    | _ -> ()

let new_game () = session := initial_state (safe_random_target word_list)

(* The on-screen keyboard's clicks reuse the same key names as real keydowns. *)
let () = Game_lib.on_key (fun k -> handle_key k; refresh ())

let () =
  Game_lib.on_click (fun payload ->
      (if payload = "new_game" then new_game () else handle_key payload);
      refresh ())

(* Repaints whenever some OTHER cell (random_target, score_guess, ...)
   finishes running -- see src/game_host.ml's [repaint_all]. *)
let () = Game_lib.on_repaint refresh

let () = refresh ()
```
:::

### Problem 1: `random_target`

Pick today's target uniformly at random from an array of words.

:::quiz code id=wd-q1
`Random.int n` returns a random integer from `0` up to (but not including) `n`. `Array.length a` gives the number of elements in `a`, the way `String.length` does for a string.

```ocaml
let random_target words = failwith "not implemented"

(* Piping needed for the game to work. Can be ignored. *)
let () = random_target_ref := random_target
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  let words = [| "abcde"; "fghij"; "klmno" |] in
  let picks = List.init 200 (fun _ -> random_target words) in
  check (List.for_all (fun w -> Array.mem w words) picks)
    "every pick comes from the given array";
  check (List.mem "fghij" picks || List.mem "klmno" picks)
    "200 picks from a 3-word array turn up something other than just the first word";
  print_endline "all tests passed"
```

[Cheat sheet: Problem 1](cheatsheets/wordle/problem-1.html)

:::

The `let () = random_target_ref := random_target` line is plumbing that registers your function with the board. A similar line ends most of the problems below; you can ignore it each time.

:::solution
Reference solution:

```ocaml
let random_target words = words.(Random.int (Array.length words))
```

`Random.int (Array.length words)` gives a uniformly random index into the array; indexing at that index gives the word.

:::

### Problem 2: `score_guess`, first pass

`score_guess target guess` scores one guess. Element `i` of the result describes `guess.[i]`: `Correct` if it matches `target.[i]` exactly, `Present` if that letter shows up somewhere else in `target`, `Absent` if it doesn't appear in `target` at all.

:::quiz code id=wd-q2
Compare position by position, and when a position doesn't match, fall back to checking whether the letter is in the target anywhere. `Array.init n f` builds a fresh array of length `n`, filling slot `i` with whatever `f i` returns. That gets you one `letter_status` per letter position without writing a loop. `String.contains s c` tells you whether character `c` occurs anywhere in string `s`.

This version gets repeated letters wrong. The Stretch problem below fixes it.

```ocaml
let score_guess target guess = failwith "not implemented"

let () = score_guess_ref := score_guess
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  check (score_guess "speed" "erase" = [| Present; Absent; Absent; Present; Present |])
    "speed/erase has no repeated letters, so this pass already scores it correctly";
  check (score_guess "house" "house" = [| Correct; Correct; Correct; Correct; Correct |])
    "an exact match is Correct in every position";
  check (score_guess "chair" "zzzzz" = [| Absent; Absent; Absent; Absent; Absent |])
    "a letter missing from the target everywhere is Absent everywhere";
  print_endline "all tests passed"
```

[Cheat sheet: Problem 2](cheatsheets/wordle/problem-2.html)

:::

:::solution
Reference solution -- knowingly incomplete, see the Stretch problem below:

```ocaml
let score_guess target guess =
  Array.init (String.length target) (fun i ->
      if guess.[i] = target.[i] then Correct
      else if String.contains target guess.[i] then Present
      else Absent)
```

`Array.init n f` builds an array of length `n` by calling `f` on every index from `0` to `n - 1`. Here `f i` looks at position `i` of both strings: an exact match is `Correct`; otherwise `String.contains target guess.[i]` checks whether the letter shows up anywhere in `target` at all.

:::

### Problem 3: `is_win`

Did a scored guess win the game? All five letters `Correct` means yes.

:::quiz code id=wd-q3
`Array.for_all p a` returns `true` when `p` holds for every element of `a`, and `false` as soon as one element fails it.

```ocaml
let is_win scored = failwith "not implemented"

let () = is_win_ref := is_win
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  check (is_win [| Correct; Correct; Correct; Correct; Correct |] = true) "all five Correct wins";
  check (is_win [| Correct; Present; Correct; Correct; Correct |] = false) "one non-Correct entry does not win";
  check (is_win [| Absent; Absent; Absent; Absent; Absent |] = false) "no Correct entries does not win";
  print_endline "all tests passed"
```

[Cheat sheet: Problem 3](cheatsheets/wordle/problem-3.html)

:::

:::solution
Reference solution:

```ocaml
let is_win scored = Array.for_all (fun s -> s = Correct) scored
```

`Array.for_all` checks a condition against every element and combines the results with "and" -- exactly "every letter is `Correct`", read directly off the name. This works against whichever `score_guess` is currently in scope, buggy or not: it only ever looks at the shape of the result.

:::

### Problem 4: `keyboard_hint`

`keyboard_hint guesses ch` decides what the on-screen key for letter `ch` should currently show, given every guess submitted so far.

:::quiz code id=wd-q4
Walk `guesses`, and every scored letter in every guess that matches `ch`, and keep the best status seen: `Correct` outranks `Present`, which outranks `Absent`, which outranks a letter never guessed at all (`None`). A letter guessed `Present` once and `Correct` later should end up `Correct`, not flicker back down. `String.iteri f s` walks string `s` and hands `f` the position along with the character sitting there. That's how you line a letter up with its entry in `scored`.

```ocaml
let keyboard_hint guesses ch = failwith "not implemented"

let () = keyboard_hint_ref := keyboard_hint
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  let history = [ ("candy", [| Correct; Present; Absent; Absent; Absent |]) ] in
  check (keyboard_hint history 'c' = Some Correct) "a Correct letter shows Correct";
  check (keyboard_hint history 'a' = Some Present) "a Present letter shows Present";
  check (keyboard_hint history 'n' = Some Absent) "an Absent letter shows Absent (this is the greying out)";
  check (keyboard_hint history 'z' = None) "a letter never guessed shows None";
  let upgraded =
    [ ("apple", [| Absent; Absent; Absent; Absent; Absent |]);
      ("candy", [| Correct; Present; Absent; Absent; Absent |]) ]
  in
  check (keyboard_hint upgraded 'a' = Some Present)
    "Absent in an earlier guess, Present in a later one: the later, higher status wins";
  let never_downgraded =
    [ ("chair", [| Correct; Correct; Correct; Correct; Correct |]);
      ("candy", [| Correct; Present; Absent; Absent; Absent |]) ]
  in
  check (keyboard_hint never_downgraded 'a' = Some Correct)
    "Correct in an earlier guess never flickers back down to a later Present";
  print_endline "all tests passed"
```

[Cheat sheet: Problem 4](cheatsheets/wordle/problem-4.html)

:::

:::solution
Reference solution:

```ocaml
let keyboard_hint guesses ch =
  let rank = function
    | None -> 0
    | Some Absent -> 1
    | Some Present -> 2
    | Some Correct -> 3
  in
  let rec go guesses best =
    match guesses with
    | [] -> best
    | (guess, scored) :: rest ->
      let best = ref best in
      String.iteri
        (fun i c ->
          if c = ch then
            let candidate = Some scored.(i) in
            if rank candidate >= rank !best then best := candidate)
        guess;
      go rest !best
  in
  go guesses None
```

`rank` turns each of the four possibilities into a number in the order the rules want. `go` walks `guesses` one at a time, carrying the best status seen so far in `best`. For each guess, `String.iteri` hands back every character alongside its index, so `scored.(i)` lines up with the letter sitting at that same position in `guess`. Every time it sees `ch`, it compares the new sighting against the running best and keeps whichever ranks higher: a later, worse sighting of the same letter can never overwrite a better one already found. Starting `best` at `None` is what makes a never-guessed letter come out `None` at the end. Rank 0 loses to everything except another never-guessed letter.

:::

### Problem 5: `is_valid_guess`

Real Wordle only accepts a guess that's itself a real word. Right now this page accepts anything five letters long, including nonsense.

:::quiz code id=wd-q5
Is `guess` a member of `words`?

```ocaml
let is_valid_guess words guess = failwith "not implemented"

let () = is_valid_guess_ref := is_valid_guess
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  check (is_valid_guess word_list "house") "a real word from word_list is valid";
  check (not (is_valid_guess word_list "zzzzz")) "five letters that spell nothing is not valid";
  check (not (is_valid_guess [| "house" |] "horse")) "only checks the given array, not the real dictionary";
  print_endline "all tests passed"
```

[Cheat sheet: Problem 5](cheatsheets/wordle/problem-5.html)

:::

:::solution
Reference solution:

```ocaml
let is_valid_guess words guess = Array.mem guess words
```

`Array.mem` is exactly "is this element anywhere in this array" -- membership in `word_list` is the whole rule, nothing else to write.

:::

### Problem 6: `count_letter`

A helper for the fix in the Stretch problem below.

:::quiz code id=wd-q6
How many times does character `c` occur in `word`? `String.iter f s` runs `f` on each character of `s` in turn. It's Problem 4's `String.iteri` with the index left out.

```ocaml
let count_letter word c = failwith "not implemented"
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  check (count_letter "batch" 'b' = 1) "one occurrence counts as 1";
  check (count_letter "batch" 'z' = 0) "no occurrence counts as 0";
  check (count_letter "abbey" 'b' = 2) "a repeated letter counts every occurrence";
  print_endline "all tests passed"
```

[Cheat sheet: Problem 6](cheatsheets/wordle/problem-6.html)

:::

:::solution
Reference solution:

```ocaml
let count_letter word c =
  let n = ref 0 in
  String.iter (fun ch -> if ch = c then incr n) word;
  !n
```

`String.iter` walks every character; the counter only moves for the one that matches `c`.

:::

### Stretch, Hard: `score_guess`, fix the repeated-letter bug

Rewrite `score_guess`, same name as Problem 2, so `score_guess "batch" "abbey"` comes out `[| Present; Present; Absent; Absent; Absent |]` instead of Problem 2's `[| Present; Present; Present; Absent; Absent |]`. The rule, precisely:

- `Correct`: `guess.[i] = target.[i]`
- `Present`: `guess.[i]` occurs in `target`, but this occurrence isn't `Correct`
- `Absent`: `guess.[i]` doesn't occur in `target` at all, or all its occurrences are already claimed by other letters in this guess

:::quiz code id=wd-q7
Use `count_letter` to seed a per-letter remaining-claims count: how many of each letter `target` still has to give out. Spend every `Correct` match against that budget in one full pass before handing out any `Present`, and let a claim run out.

Two functions you'll want for the budget. `Array.make n v` creates an array of length `n` with every slot holding `v`, and you can overwrite a slot afterwards with `arr.(i) <- new_value`. `Char.code c` gives you a character's numeric code, so `Char.code c - Char.code 'a'` turns a lowercase letter into a slot number from 0 to 25, and `Char.chr` converts a code back into a character.

```ocaml
let score_guess target guess = failwith "not implemented"

let () = score_guess_ref := score_guess
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  check (score_guess "batch" "abbey" = [| Present; Present; Absent; Absent; Absent |])
    "a second repeated letter with no budget left is Absent, not Present";
  check (score_guess "speed" "erase" = [| Present; Absent; Absent; Present; Present |])
    "a case with no repeated letters is unchanged from the first pass";
  check (score_guess "house" "house" = [| Correct; Correct; Correct; Correct; Correct |])
    "an exact match is still Correct in every position";
  print_endline "all tests passed"
```

[Cheat sheet: Stretch](cheatsheets/wordle/stretch.html)

:::

This `let` REPLACES Problem 2's `score_guess`: once your solution above has run, every cell below it (including Problem 2's own hidden test, if it re-runs, and every problem from here on) sees this version. Nothing special makes that happen -- it's the same "later binding of the same name wins" rule this whole page already runs on, just noticed twice in a row for one function.

:::solution
Reference solution:

```ocaml
let score_guess target guess =
  let n = String.length target in
  let result = Array.make n Absent in
  let remaining =
    Array.init 26 (fun i -> count_letter target (Char.chr (i + Char.code 'a')))
  in
  let idx c = Char.code c - Char.code 'a' in
  for i = 0 to n - 1 do
    if guess.[i] = target.[i] then begin
      result.(i) <- Correct;
      remaining.(idx guess.[i]) <- remaining.(idx guess.[i]) - 1
    end
  done;
  for i = 0 to n - 1 do
    if result.(i) <> Correct then begin
      let c = idx guess.[i] in
      if remaining.(c) > 0 then begin
        result.(i) <- Present;
        remaining.(c) <- remaining.(c) - 1
      end
    end
  done;
  result
```

`remaining` starts as "how many of each letter `target` has" (26 counters, one per letter, seeded by `count_letter`; `Char.code`/`Char.chr` convert between a character and its alphabet index). The first loop spends `Correct` matches against it -- all of them, before the second loop hands out a single `Present` -- which is exactly why a letter that's `Correct` in one spot can't also be double-counted as `Present` for a repeat elsewhere. The second loop then spends whatever's left of each letter's budget on `Present` matches, position by position, so a second 'b' with no budget left gets `Absent` instead of a free `Present`.

:::
