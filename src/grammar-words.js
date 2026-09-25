// English word lists for the sentence builder (src/grammar.js).
//
// Closed-class words are listed in full; open-class words (verbs,
// adjectives) cover everyday learner English. Anything unlisted is tagged
// from its context and its ending, so a missing word degrades to "noun",
// never to an error.

const words = (s) => s.trim().split(/\s+/);

export const DETERMINERS = new Set(words(`a an the this that these those any every each no another either neither`));
// how many / how much: signed after the thing ("some" says how many, so it is not an article)
export const QUANTIFIERS = new Set(words(`some many much few several all both lots more most less enough`));

// pronoun -> its sign gloss. Third person pronouns are pointing in SASL.
export const PRONOUNS = {
  i: "ME", me: "ME", myself: "MYSELF", you: "YOU", yourself: "YOURSELF", yourselves: "YOURSELF",
  he: "HE", him: "HE", himself: "HIMSELF", she: "SHE", her: "SHE", herself: "HERSELF",
  it: "IT", itself: "IT", we: "WE", us: "WE", ourselves: "WE", they: "THEY", them: "THEY", themselves: "THEY",
  someone: "SOMEONE", somebody: "SOMEONE", everyone: "EVERYONE", everybody: "EVERYONE",
  nobody: "NOBODY", "no-one": "NOBODY", something: "SOMETHING", everything: "EVERYTHING", nothing: "NOTHING",
  anything: "ANYTHING", anyone: "ANYONE", anybody: "ANYONE",
};
export const SUBJECT_PRONOUNS = new Set(words(`i you he she it we they`));
export const POINTED = new Set(words(`HE SHE IT THEY HIMSELF HERSELF`));

export const POSSESSIVES = {
  my: "MY", mine: "MY", your: "YOUR", yours: "YOUR", his: "HIS", her: "HER", hers: "HER",
  its: "ITS", our: "OUR", ours: "OUR", their: "THEIR", theirs: "THEIR",
};

export const PREPOSITIONS = new Set(words(`in on at to from with without for of by about under over above below
  behind beside between into onto inside outside near through across around along against among past up down
  off out towards toward upon via during until till since after before like than per`));
// prepositions that mark a place or a destination
export const PLACE_PREPS = new Set(words(`in at to from into inside outside near behind under over above below
  beside between around across through towards toward onto on off`));

export const BE = new Set(words(`be am is are was were been being`));
export const HAVE = new Set(words(`have has had having`));
export const DO = new Set(words(`do does did doing done`));
export const MODALS = {
  will: "FUTURE", shall: "FUTURE", would: "WOULD", can: "CAN", could: "CAN", may: "MAY",
  might: "MAYBE", must: "MUST", should: "SHOULD", ought: "SHOULD",
};

export const NEGATIVES = new Set(words(`not never no`));

// question word -> gloss; two-word questions are joined first
export const WH = {
  what: "WHAT", where: "WHERE", who: "WHO", whom: "WHO", whose: "WHOSE", when: "WHEN", why: "WHY",
  how: "HOW", which: "WHICH", "how many": "HOW-MANY", "how much": "HOW-MUCH", "how old": "HOW-OLD",
  "what time": "WHAT-TIME",
};

export const CONJUNCTIONS = new Set(words(`and but or so`));
export const SUBORDINATORS = new Set(words(`because if when while although though unless whenever until before after since`));

export const GREETINGS = {
  hello: "HELLO", hi: "HELLO", hey: "HELLO", bye: "BYE", goodbye: "GOODBYE", please: "PLEASE",
  thanks: "THANK-YOU", sorry: "SORRY", yes: "YES", ok: "OK", okay: "OK", welcome: "WELCOME",
  "thank you": "THANK-YOU", "good morning": "GOOD MORNING", "good night": "GOOD NIGHT",
  "good afternoon": "GOOD AFTERNOON", "good evening": "GOOD EVENING", "excuse me": "EXCUSE ME",
  "see you": "SEE YOU", sawubona: "HELLO", molo: "HELLO", howzit: "HELLO",
};

export const DAYS = words(`monday tuesday wednesday thursday friday saturday sunday`);
export const MONTHS = words(`january february march april may june july august september october november december`);
export const TIME_NOUNS = new Set(words(`morning afternoon evening night tonight day week weekend month year
  hour minute second moment time today tomorrow yesterday christmas easter holiday holidays birthday
  noon midnight lunchtime dawn season summer winter autumn spring decade century future past`)
  .concat(DAYS, MONTHS.filter((m) => m !== "may" && m !== "march")));
// single words that are a time expression on their own
export const TIME_WORDS = {
  yesterday: "YESTERDAY", today: "TODAY", tomorrow: "TOMORROW", tonight: "TONIGHT", now: "NOW",
  later: "LATER", soon: "SOON", already: "FINISH", recently: "RECENTLY", nowadays: "NOW",
  always: "ALWAYS", sometimes: "SOMETIMES", often: "OFTEN", usually: "USUALLY", never: "NEVER",
  again: "AGAIN", once: "ONCE", twice: "TWICE", early: "EARLY", late: "LATE", everyday: "EVERY DAY",
  daily: "EVERY DAY", weekly: "EVERY WEEK", monthly: "EVERY MONTH", yearly: "EVERY YEAR", ago: "PAST",
  then: "THEN", before: "BEFORE", afterwards: "AFTER", future: "FUTURE", past: "PAST",
  rarely: "RARELY", seldom: "RARELY", normally: "NORMALLY",
};
// how often: no source moves these, so they keep their English place (never is a negative: NOT's place)
export const FREQUENCY = new Set(words(`always sometimes often usually never again once twice rarely seldom normally`));
// words that strengthen the describing word straight after them: VERY BIG, TOO HOT
export const INTENSIFIERS = { very: "VERY", really: "REALLY", too: "TOO", so: "SO", extremely: "VERY", quite: "QUITE" };

export const NUMBERS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, thousand: 1000, million: 1000000,
  first: "FIRST", second: "SECOND", third: "THIRD", last: "LAST", next: "NEXT",
};

// places: nouns that make a phrase the scene of the sentence
export const PLACES = new Set(words(`home house school shop store supermarket market mall town city village
  church hospital clinic doctor office work bank library park beach sea river mountain farm station airport
  restaurant cafe hotel kitchen bedroom bathroom room class classroom university college campus garden yard
  street road country world township taxi-rank rank court prison gym pool stadium field zoo museum cinema
  theatre party wedding funeral meeting toilet bed table desk car bus train taxi plane outside inside
  there here everywhere somewhere nowhere upstairs downstairs abroad stop`)
  .concat(words(`africa johannesburg joburg durban pretoria soweto capetown bloemfontein kimberley gqeberha
  polokwane mbombela pietermaritzburg london america england`)));
// the proper names among them: a name, not an ordinary word
export const PLACE_NAMES = new Set(words(`africa johannesburg joburg durban pretoria soweto capetown bloemfontein
  kimberley gqeberha polokwane mbombela pietermaritzburg london america england`));
// two-word places that are one expression and keep their order: NEXT DOOR, not DOOR NEXT
export const FIXED_PLACES = { "next door": "NEXT DOOR" };
export const DEICTIC_PLACES = { there: "THERE", here: "HERE", everywhere: "EVERYWHERE", somewhere: "SOMEWHERE",
  outside: "OUTSIDE", inside: "INSIDE", upstairs: "UPSTAIRS", downstairs: "DOWNSTAIRS", home: "HOME", abroad: "OVERSEAS" };

// irregular past / participle / -s forms -> base
export const IRREGULAR = Object.fromEntries(`
  was:be were:be been:be am:be is:be are:be being:be had:have has:have did:do does:do done:do
  went:go gone:go goes:go ate:eat eaten:eat drank:drink drunk:drink saw:see seen:see came:come
  bought:buy brought:bring thought:think taught:teach caught:catch fought:fight sought:seek
  made:make said:say told:tell sold:sell took:take taken:take gave:give given:give got:get gotten:get
  knew:know known:know grew:grow grown:grow threw:throw thrown:throw flew:fly flown:fly drew:draw
  drawn:draw wrote:write written:write rode:ride ridden:ride drove:drive driven:drive rose:rise risen:rise
  spoke:speak spoken:speak broke:break broken:break chose:choose chosen:choose froze:freeze frozen:freeze
  woke:wake woken:wake stole:steal stolen:steal forgot:forget forgotten:forget began:begin begun:begin
  swam:swim swum:swim sang:sing sung:sing rang:ring rung:ring ran:run sat:sit stood:stand understood:understand
  lost:lose left:leave felt:feel kept:keep slept:sleep met:meet fed:feed led:lead read:read heard:hear
  paid:pay laid:lay lay:lie lain:lie meant:mean sent:send spent:spend built:build lent:lend bent:bend
  found:find ground:grind wound:wind held:hold sold:sell stuck:stick struck:strike hung:hang won:win
  shot:shoot lit:light slid:slide hid:hide hidden:hide bit:bite bitten:bite fell:fall fallen:fall
  wore:wear worn:wear tore:tear torn:tear bore:bear born:bear swore:swear shook:shake shaken:shake
  forgave:forgive forgiven:forgive became:become overcame:overcome dealt:deal dreamt:dream learnt:learn
  burnt:burn spelt:spell smelt:smell spilt:spill knelt:kneel crept:creep swept:sweep wept:weep
  did:do blew:blow blown:blow withdrew:withdraw hit:hit cut:cut put:put set:set let:let shut:shut hurt:hurt
  cost:cost quit:quit spread:spread beat:beat beaten:beat bet:bet fit:fit split:split upset:upset
  sank:sink sunk:sink drank:drink shrank:shrink stank:stink sprang:spring
  children:child men:man women:woman people:person feet:foot teeth:tooth mice:mouse geese:goose
  wives:wife knives:knife lives:life leaves:leaf wolves:wolf halves:half shelves:shelf thieves:thief
  babies:baby ladies:lady countries:country cities:city parties:party families:family
`.trim().split(/\s+/).map((p) => p.split(":")));
export const IRREGULAR_NOUNS = new Set(words(`children men women people feet teeth mice geese wives knives
  lives leaves wolves halves shelves thieves`));
export const PAST_FORMS = new Set(Object.keys(IRREGULAR).filter((w) => !IRREGULAR_NOUNS.has(w)
  && !/^(is|are|am|has|does|goes|being|having|doing)$/.test(w)));

// everyday verbs (base form). A word here can still be a noun in context ("a drink").
export const VERBS = new Set(words(`
  accept add admire admit advise afford agree allow answer apologise apologize appear apply argue arrange
  arrive ask attack attend avoid bake bathe be bear beat become beg begin behave believe belong bend bet bite
  blame bleed bless blow boil book borrow bother bounce bow break breathe bring brush build burn bury buy call
  calm camp care carry catch celebrate change charge chase chat cheat check cheer chew choose clap clean clear
  climb close coach collect colour color comb come comfort compare compete complain complete confuse connect
  consider contact continue control cook copy correct cost cough count cover crash crawl create cross cry cut
  damage dance dare deal decide decorate deliver depend describe design destroy develop die dig disagree
  disappear discover discuss dislike divide do download drag draw dream dress drink drive drop dry dust earn eat
  educate email encourage end enjoy enter escape examine exercise exist expect experience explain express fail
  fall feed feel fetch fight fill find finish fish fit fix flow fly fold follow forget forgive freeze fry gain
  get give go grab greet grind grow guard guess hang happen hate have hear help hide hit hold hope hug hunt hurry
  hurt imagine improve include inform injure insult interpret introduce invent invite iron join joke judge jump
  keep kick kill kiss kneel knit knock know land last laugh lay lead lean learn leave lend let lick lie lift like
  listen live lock look lose love make manage marry match matter mean measure meet melt mention miss mix move
  need nod notice obey offer open order organise organize own pack paint park pass pay perform pick plan plant
  play point pour practise practice pray prefer prepare present press pretend print promise protect pull pump
  punch punish push put question race rain raise reach read realise realize receive recognise recognize record
  reduce refuse relax remember remind remove rent repair repeat reply report rescue rest return ride ring rise
  rob roll rub run rush save say scare scream search see seem sell send serve set sew shake share shave shine
  shoot shop shout show shower shut sign sing sink sit skip sleep slide slip smell smile smoke sneeze snow solve
  speak spell spend spill spit split spoil spray stand start stay steal step stick stop study succeed suffer
  suggest supply support suppose surprise swallow sweep swim switch take talk taste teach tear tease tell test
  text thank think throw tick tie touch tour train translate travel treat trust try turn type understand undress
  unlock use vanish visit vote wait wake walk want warn wash waste watch water wave wear welcome whisper whistle
  win wink wish wonder work worry wrap write yawn yell zip babysit sign fingerspell chat video phone google
  `));

// everyday adjectives
export const ADJECTIVES = new Set(words(`
  able afraid alive angry annoyed asleep awake bad beautiful best better big bitter black blind blue boring
  brave brilliant broken brown busy calm careful cheap clean clever close cold colourful comfortable cool
  correct crazy cute dangerous dark dead deaf dear delicious different difficult dirty dry dull early easy
  empty excellent excited expensive famous far fast fat fine flat free fresh friendly full funny glad gold
  good great green grey gray guilty happy hard healthy hearing heavy helpful high honest hot huge hungry ill
  important interesting jealous kind large late lazy light little lonely long lost loud lovely low lucky mad
  married mean messy modern naughty sunny windy cloudy rainy foggy stormy snowy misty humid chilly freezing near nervous new nice noisy normal old open orange other pink plain polite
  poor popular possible pretty proud purple quick quiet ready real red rich right rude sad safe same scared
  serious sharp short shy sick silly simple single slow small smart soft sorry sour special strange strict
  strong stupid sure sweet tall terrible thick thin thirsty tidy tired tiny true ugly unhappy upset useful
  warm weak wet white whole wide wild wise wonderful worried wrong yellow young
  `));

// -ly words that are not manner adverbs
export const NOT_ADVERBS = new Set(words(`family only early ugly friendly lovely lonely silly holy belly jelly
  reply apply supply fly july italy rely ally bully daily weekly monthly yearly`));

// a verb and its particle are one sign: WAKE UP, LOOK AFTER, FALL ASLEEP. The dictionary's own
// "VERB PARTICLE" labels count too; these hold even where the dictionary has no clip yet.
export const PHRASAL = new Set(`look at|wake up|get up|stand up|sit down|lie down|calm down|slow down|look after|look for|
  look up|fall asleep|give up|grow up|pick up|put on|take off|turn on|turn off|go out|come back|go back|come in|
  get in|get out|find out|break up|catch up|dress up|move in|move out|pass away|show off|clean up|hurry up|
  shut up|throw away|run away|set up|fill in|sign up|make up|try on|give back|write down|hang up|carry on|
  cut out|drop off|wash up|tidy up|get dressed|get married|get lost|get better|go away|come on|watch out|
  look out|stay up|wait for|take care|fall down|fall over|get off|get on|switch on|switch off|log in|log out`
  .split('|').map((s) => s.trim()));

// one sign that already says "not" (Real SASL dictionary): it replaces the word and NOT together
export const NEG_SIGNS = new Set(["CAN'T", "DON'T KNOW", "DON'T LIKE", "DON'T WANT", "DON'T HAVE", "DON'T UNDERSTAND",
  "DON'T CARE", "DON'T FORGET"]);

// capitalised by convention, but not a person's name: signed as the word
export const CONVENTIONAL_CAPS = new Set(words(`deaf god english afrikaans zulu isizulu xhosa isixhosa sotho sesotho
  tswana setswana venda tshivenda tsonga xitsonga swati siswati ndebele pedi sepedi african american british
  christian muslim jewish hindu christmas easter sasl bible internet`));

// Ordinary English words, so that a capital at the start of a sentence is not taken for a name
// ("Porridge is healthy" is PORRIDGE, not P-O-R-R-I-D-G-E). Built once from the single words of the
// Real SASL and NID dictionary labels that are in a standard English word list (Webster's 2nd,
// allowing -s/-ed/-ing and British spellings), leaving out words the lists above already cover and
// personal names. It is fixed here, so the answer does not depend on which dictionary is loaded.
export const COMMON = new Set(words(`
  aardvark abandon abbreviate abbreviation abdomen abdominal abduction abide ability ablaze abnormal abolition
  abortion abscess absent absolute absolve absorb abstract absurd abuse academic academy acarophobia accelerate
  accent acceptance access accessible accident accommodation accompany accomplice accomplish accordion account
  accountant accounting acculturate accurate accuse ache achieve acid acknowledge acquired acquisition acronym
  acrophobia act action active activity actor actress acts adapt addition address adjust adjustable
  administration admission adolescent adopt adore adult adultery advanced advantage adventure adventurous advert
  advertise advertisement advisor advocate aeroplane aerosol affair affairs affect affidavit afterbirth age
  agency agenda agent aggressive agitate agitated agony agoraphobia agreement agriculture ah ahead ahem ai
  aichmophobia aid aids aim air aircraft alarm albinism albino album alcohol alcoholic alert algebra algophobia
  alien allergy alligator ally almond almost aloe alone alphabet alright also altar altogether aluminium
  amalgamated amaze amazing ambidextrous ambulance amen amend amendment amniotic amount anaemia anaemic analogy
  analyse ancestor anchor ancient android androphobia angel animal animation animator anime ankle anniversary
  announce annoy annual annually anonym anorexia ant antarctica anthem anthophobia anthropology antibiotics
  antiseptic antisocial antivirus anxiety anxious apart apartment apiphobia apologies apostrophe apparently
  applause apple application appoint appointment appreciate apprentice approach appropriate appropriation
  approve approximate approximately apricot apron ar arbitrary arbour arch archaeology archery architect area
  argument aristocracy arithmetic arm armchair armed armpit army aroma arrays arrest arrival arrow arson art
  arthritis article artificial artist as ascend ascension ashamed assault assegai assembly assertive assessment
  assets assignment assimilate assist assistant assistive association assume asthma astraphobia astronaut
  astronomy atheist athletics atlas atmosphere attach attempt attention attitude attorney attract auction
  audience audio audiologist audiology audit augmented aunt authentication author authoritarian authority autism
  autocracy automatic autonomous autophobia available average avian avocado award aware awareness away awesome
  awful awkward axe axed babble baboon baby bachelor back backache background backward bacon badge badminton bag
  bagel bagpipes bail baker bakery baking balance balcony bald ball ballet balloon bamboo banana band bandage
  bang bangle bankrupt banks banquet baptise baptism bar barbecue bare bargain bark barn barrier bars baseball
  based basic basin basket basketball bat batch bath bathtub battery battle bay bead beak beam bean beanie beard
  beauty bee beef beehive beer beetle beetroot beggar behaviour belcher bell belt bench benefit beret berlin
  berry beware beyond biannual bias bib bibliophobia bicycle bike bikini bilateral bile bilingual bill billion
  biltong bin binoculars biology biometrics biopsy bipolar bird birdseed birth biscuit bit blackboard blackmail
  blacks blade blah blank blanket blasphemy blazer bleach bleeding blessed blinds blister block blocks blood
  blossom blouse blunt blurry blush boar board boarder boarding boast boat bodied body bold bolt bomb bonding
  bone bonus bookmark bookshelf bookshop boomerang boot borderline bored born boss bottle bottom bowl boxing boy
  bra bracelet bracket braid braids brain brainwash brake branch brand branding brandy brass brazil breach bread
  breadwinner breakdown breakfast breast breasts breath bribe brick bricklayer bride bridegroom bridge brief
  brigade bright broccoli bronchitis bronze brooch broom brothel brother brotherly browser bruise bubble buck
  bucket bud buddy budget buffalo bug builder building bulb bulge bulimia bull bulldozer bullet bully bump bumpy
  bun bunk bureaucracy burglar burns bursary burst bush business businessman butchery butter butterfly button
  cabbage cabinet cable caffeine cage cake calculator calendar calf camel camera campaign canada canapes cancel
  cancer candle cane canoe cap capability capable cape captain caption capture caravan carbohydrate carbon card
  cardboard cardiologist cardiology cardiophobia cardiopulmonary career careless carer carpenter carpet carport
  carrot cart cartoon carve case cash cashier casino cast caster casting castle casual cat caterpillar catholic
  cattle cauliflower cave cd ceiling celebrities celery cell cellist cement cemetery cent centimetre central
  centre centrifugal cents cereal ceremony ceres certainly certificate certify cervical chad chai chain chair
  chalk challenge champion chance channel chaos chapter character charger charity checkers cheek cheeky cheers
  cheese cheetah chef chemical chemist chemotherapy cheque cherry chess chest chewing chicken chicks chief
  chiefs child childhood children chimney chimpanzee chin china chips cho chocolate choice choir choke
  cholesterol chop chopstick chrome chronicles chutney cibophobia cider cigar cigarette circle circus citizen
  citizenship claim clamp clan clarify classmate clause claustrophobia claw clay cleaner clerk click clicks
  client cliff climbing cling clip clipper clock closer cloth clothes clothesline clothing cloud clouds cloudy
  clown club clumsy cluster coal coalition coarse coaster coat cobbler coca cochlear cock cockroach cocktail
  cocoa coconut cocoon code coding coffee coffin cognitive coin coke cola collaborate collapse collar colleague
  collide collision colon coloured colouring colours coma combine comedian comedy comet comic coming comma
  command comment commercial commission commitment committee common communicate communication communion
  communist community company compass compassion competent competition complaint compliance complicate
  complicated compliment compost comprehension compress compressor compulsive compulsory computer concatenate
  conceal concentrate concept concern concert conclusion concrete condensation condition conditioner conductor
  conference confess confidence confident confidential confidentiality confirm conflict congratulate
  congratulations conscious consensual consensus consent consequence console conspiracy constant constipated
  constitution construction container content context continent contraception contraceptive contract contribute
  conundrum convergence conversation convince cooked cooperate copilot copper cord core cork corkscrew corn
  corner correction correspondence corridor corrupt corruption cosmetics costume cot cote cottage cotton couch
  council counsel counseling countryside couple coupling courage courier course cousin covid cow coward cowboy
  crab crack cramp cramps crane crayons cream creative credential credit creep cremnophobia cricket crime
  criminology criticize crochet crocodile crop crossing crossword crow crowd crown crucifixion cruel crumbs
  crumpled crush crutches cub cube cucumber cuddle cuff culture cup cupboard cupcake cure curious curler curly
  currency curriculum curry curse curtain curve cushion custard customer cutlery cutter cycle cycling cynophobia
  cytology dactylology dad dagger dairy dam damp dancer danger dart dash data date dating daughter days de
  deadline deafness debate debonairs debt decay deck decoration decrease deep default defeat defend defiant
  deficiency deficit deflation degree dehydration deipnophobia delay delegate delete delft delirium dementia
  democratic demolish demon demonophobia denomination dentist deny deodorant depart department dependent deplete
  deposit depressed depression deputy deranged dermatologist dermatology dermatopathophobia dermatophobia
  descendant desert deserve designer despair dessert detach detail detective deteriorate determine detest
  development device devil dew diabetes diabetic diagnosis diagonal dial dialect diamond diaper diary dice
  dictionary diesel diet digital dignity dimension dimple dining dinner dinosaur dip diploma direct direction
  director dis disability disabled disappoint disapprove disaster disc discard discipline disconnect discount
  discriminate discus discussion disease disgust disgusted dish dishonest dismiss disobey disorder disorders
  disperse dispute disrespect dissatisfy dissolve distance distract distribute distribution district distrust
  disturb ditch dive diver diversity divider division divorce dizzy document documentary documents dog doll
  dollar dolphin domatophobia domestic domineering domino donate donation donkey door doorbell doorknob dop
  doraphobia dormitory dosage dot double doubt dough doughnut dove dragon dragonfly drain drama drawer dressing
  dressmaker dribble drill drip dripping driver driving drizzle drone drooling drown drowsy drug drum drummer
  drunk duck duct dummy dumping dune dunk dutch duty duvet dwarf dye eager eagle ear earring earrings ears earth
  earthquake earthworm easel east eastern eating ecclesiastes ecclesiophobia eclipse economy ecophobia edge edit
  editor education effective egg eggplant elastic elbow election electric electrician electricity electrophobia
  element elementary elephant elevator elf eligible elite ellipse else embarrass embarrassed embrace embroider
  emergency emigrate emotion emotional empathy employed employment empower empowerment encryption endanger enemy
  energy engaged engagement engine engineer enormous enthusiastic entomology entrepreneur envelope environment
  envy epidemiology epilepsy episode equal equality equator equatorial equipment equity er erase ergophobia
  erosion error escalator especially essay esteem ester estranged ethics ethnic ethnology evacuate evaluate
  evaporation even event evidence evil evolve ex exact exaggerate exam examination example except exchange
  exclamation excuse executive exhaust exit exodus expedite expenditure experiment expert expire exploit explore
  explosion export expression extensive extern extinct extinguish extinguisher extra extract extreme eye eyebrow
  eyelash eyes fabulous face facial facilitator fact factor factory faculty faint fair fairness fairy faith fake
  falcon false family fan fancy fantastic fantasy farewell farmer fascinated fashion fasten fasting father fault
  favour fe fear feast feather fed federation fee feedback feeling feisty female fence ferris festival festive
  fever fi fiction fidelity fierce fig fighter file filing film filter final finally finance findings finger
  fingernail fingerprint fingerprints fingers finland fire fired fireman fireplace firewall fisherman fishing
  fist fitted fitting flag flamingo flash flavour flea flexible flight flint flip flirt float flood floor flop
  flops florist floss flour flower flu fluid flush flushed flute foal foam focus fog foil folding fondue food
  fool foot football footprint forbid force ford forehead foreign forest forever forge forgery fork form formal
  format formula fortunate fortunately forward fossil foster foul foundation fountain fourth fowl fox fracture
  fractures frame fraud freckle freedom freezer freezing frequently fried friend fright frighten frog front
  frost frown frozen fruit frustrate frustrated fuel fumes fun function functional fund fur furious further
  fussy galvanised gambia gamble gambler game games garage gardener garlic gas gastroenterologist
  gastroenterology gastroscopy gate gauze gear gecko gender general generation generous genesis genetics genie
  genius gentle geography geology geometry germ german gerontocracy gerontology gesture geyser ghost giant gift
  giggle ginger giraffe girl glass glasses glitter global glory glove glow glucose glue gnome goal goalkeeper
  goat goatee god goggles going golf goodwill goose gooseberry gorilla gospel gossip governing government gown
  grade graduate grafting gram grammar granadilla grand grandchild granddaughter grandfather grandmother
  grandparent grandson grant granulation grape grapefruit grapes graphic grass grasshopper grateful grater grave
  gravity gravy grease greedy greeting grieve grill ground group growl grumpy guava gude guest guesthouse
  guidance guide guidelines guinea guitar guitarist gum gun gutter guy gymnastics habit habitation hagiophobia
  hail hair hairbrush haircut hairdresser half hall hallelujah hallucinations hallway ham hammer hamster hand
  handbag handbook handkerchief handle handshake handsome handwork handwriting hanger hardware harness harp
  harsh hartebeest hat hatch haunted hawks haystack head headache headmaster headphone headstone heal healer
  health heart heartbeat heartbreak heartburn heat heater heaven hedge hedgehog heel heels height helicopter
  heliophobia hell helmet hemisphere hen hepatologist hepatology herb herbalist herbicide hereditary heritage
  hero heroine herpetophobia hesitate hiccup highway hike hiking hill hinge hip hippo hire histology history
  histrionic hitch hobby hockey hoe hole hollow holy homeless homeopath homework honey honeymoon hong honour
  honours hook hookah hooker hoop hoopoe hop hopeful hopeless horizon horizontal hormone horn horrible horror
  horse hosanna hose hospice hospitality hostel hostess hourglass hours housefather housewife hub hubbly huh
  human humble humid humidity hummingbird humour humph hurdle hurricane husband hut hyena hygiene hymn
  hyperactivity hyphen hypnophobia hypnotic ibis ice iced ichthyology ichthyophobia icon id idea identical
  identify identity idiom idle idol igloo ignorance ignorant ignore illegal illuminati illusion illustrate
  illustrator image imbalance imitate immature immediate immune immunology immutable impact impala impartial
  impatient imperfect implant impolite import impossible impressed impulse incarnation inclusion income
  incorrect increase independent indexing indicators indigenous indigo individual indoor industrious industry
  ineffective inexperience infant infection inference inferiority inflation informal information infrastructure
  infusion ingot inherit initialise initiative injection injury inner innocent innovate input inquiry insane
  insect insecure insomnia inspector inspire install instantly instinct institute institution instruct
  insulation insulin insurance integer integration integrity intellectual intelligence intelligent intensive
  intention interactive interest interface interfere intern internal international internist internship
  interpersonal interpreter interrupt intervention interview intestine intimidate intravenous intruder invasion
  invention invest investigate investigator investment involve irresponsible irrigation island issue itch item
  iteration jackal jacket jaguar jail jailbird jam japan jar javelin jaw jazz jeans jeep jelly jellyfish jersey
  jet jetty job jockey jog joint joints joker journal journalist journey judges judo jug juggle juice jumper
  jumping jungle junk just justice juvenile kakistocracy kangaroo karate kayaking kebab keg kennel ketones
  kettle key keyboard kid kidnap kidney kilogram kilometre king kingdom kingfisher kings kit kite kitten kiwi
  kleptomaniac kleptophobia knee knife knitting knob knot knowledge knuckle koala kosher kraal kudu la label
  labour lack ladder lady lake lamb lamberts lame lamentations laminate lamp landscape language lashes launch
  laundry lava law lawn lawyer layout leader leadership leads leaf league leak leap learner learning leash least
  leather lecture lecturer left leg legal lemon lemonade length leopard leprosy lesson letter lettuce level liar
  liberal librarian lice lid life lifeboat lighter lightheaded lighthouse lightning limit limp line linesman
  linguistics link lion lip lipstick liquid liquor list litchi literacy litre litter liver living lizard load
  loan lobby lobe lobola lobster local location log logic login logo lollipop looking loop loose loosen lord
  lorry loss lot lotion lotto lounge lousy lower loyal luck luggage lunch lung lungs mac machine magazine maggot
  magic magma magnet magnificent maid mailbox main maintain maintenance male mali man management manager mandate
  mane mango maniac manipulate manipulation manner manners map maracas marathon marble marijuana mark marmite
  maroon marriage mars mash mask mate material maternity math mathematics matric matron mattress mature maul
  maximum maybe mayonnaise mayor meadowland meal mealtime measles meat mechanic media mediate mediator medical
  medication medicine medium meerkat megalomaniac megaphone melon member memo memory meningitis menstruation
  mental mentally mentor menu mercury mermaid merry mess message metal metallurgy meteor meteorology meter
  method meticulously metre microbiology microphone microscope microwave midday middle migraine mild military
  milk milky mill millimetre mince mind minded miner mineral minister minus minutes mirror miser misinform
  missing mission missionary mistake mister misunderstand misuse mixer mixture mobile mobocracy model moderate
  moderation module mole money mongoose monitor monkey monomaniac monoxide monster months mood moon mop morocco
  morphology mosquito motel moth mother motivate mould mound mourn mouse mouth movement movie mow mower
  mozambique mud muffin mug mulberry multiple multiply mum mumps municipality muscle muscles mushroom music
  musician mussel mustard mutable mutton mutual muzzle mycology mysophobia mystery na nail nails naked name
  napkin nappy narcissistic narrow natal nation national native natural nature nauseous navel navigator navy
  nearly neat necessary neck necklace necktie needle needles needlework negative neglect negotiate neighbour
  nelson nematology neophobia nephew nephrologist nephrology nerve nest net netball network neurologist
  neurology neutral news newspaper nibble nid niece nightdress nightie noise noisemaker nominate non none noodle
  noodles north northern nose nosophobia nostril nosy not note notebook noun nuclear nude nudge numb number
  numbers nun nurse nursery nut nutritionist nyctophobia oar oath obedience obedient obese object objective
  observe obsessed obsessive obvious occupation occupational ocean octopus odd officer official officials oh oil
  ointment older oncology oneself onion only onside opener opera operate operation ophidiophobia ophthalmology
  opinion opportunity oppose opposite oppositional oppress optical option optometrist oral orchard orchestra
  organ organist orientation original ornithology orphan os ostrich others otherwise otolaryngologist otter ouch
  outdoor outer outing outlet output oven overall overdose overeating overflow overseas overweight ow owe owl
  owner ox oxygen oyster pa package pad paddle padlock page pageant pain painful paintbrush painter painting
  pair palace pale palette palladium palm pan pancake pancreas panda pandemic panel pangolin panic panphobia
  pants panty pap papaphobia papaya paper papyrophobia parachute paraffin parallel paralyzed parameter
  parameters paranoia paranoid parasite parasitophobia parcel pardon parent parents paris parking parliament
  parlour parrot part partner partnership passage passenger passionate passport password paste pastor patch path
  patient pattern pause pavement paw pawpaw pea peace peach peacock peak peanut pear pearl pedal peddler
  pedestrian pediculophobia pee peel peen peg pelican pen penalty pencil penguin pension people pepper percent
  perfect performance perfume perhaps period permanent permission perpetrator perseverance person personal
  personality perspire persuade pest pet petition petrol pharmacist pharmacology pharmacophobia pharmacy phew
  philanthropist philology philosophobia philosophy phobophobia phonology phonophobia photo photocopy photograph
  photographer phrase physical physician physiology physiotherapist piano pickup picnic picture pie piece pig
  pigeon piggy pigtail pill pillow pilot pimple pimples pin pinch pineapple pinelands pip pipe pirate pirates
  pit pitch pity pizza placard place placeholder plait planet plank plaster plastic plate platform platinum
  player playground pleasure pliers plough plover plug plum plumber plunger plus plutocracy pneumonia pocket
  poem poet poison poisonous poke polar pole police policeman policewoman policy polish political politician
  politicophobia pollination pollution polo polony polygamy polyphobia pomegranate pondweed pop popcorn pope
  porcupine pork porridge port portable portal porter portrait position positioning positive post postal poster
  postman postnatal postpone pot potato pottery pouch pounce pout poverty powder power powerful pox praise pram
  prawn prayer predator pregnant premier premium prescription presentation presenter president pressure prevent
  previous prey price prick prickly priest primary prince princess principal printer prisoner private privilege
  prize probably problem procedure process producer product production professional professor profit program
  programmer progress project projector promote promotion prompt pronoun proof prop propaganda propeller
  property prophecy prophet proposal prosector prosecutor prostitute protea proteas protection protein protest
  protocol prove proverbs province pruning psalms psychiatrist psychological psychologist psychopath
  psychophobia psychosis psychrophobia ptochology pub public publisher pudding puddle pulpit pulse puma pumpkin
  puncture pupil puppet puppy purpose purse pus pushpin putty puzzle pyjamas pyramid pyromaniac pyrophobia
  python quack quad quadruplet quagga qualification quality quarantine quarter quarterly queen queue quit quite
  quiz quotation quote rabbit raccoon racing rack radar radiant radiation radio radiographer radiology radish
  raft rail railway rainbow raincoat raisin rake ram ramp ranches rand random ranger rape rapport rare rash rat
  rate rather ratio rattle raw ray razor re readable reality really rear reason rebel rebirth receipt recent
  reception receptionist recipe recipient reckless reclining recognition reconciliation recorder recover
  rectangle rector rectum recycle redact reel refer referee refrigerator refund region register registrar
  registration regret regulation rehabilitation rehearse reindeer reinforcement reject rejection relations
  relationship relay release relief religion remain reminder remote renew replace reporter represent
  representative reptile republic request research researcher reserve residence resident residential resolution
  resolve resource resources respect respiratory respond response responsible restless restore result resume
  resurrection resuscitation retain retire retirement revelation revenge revenue reverend review revision rewind
  rhetorical rheumatism rhino rhyme ribbon ribs rice rider ridiculous riding rifle rights rigid rinse rip ripe
  risk rivalry roast robbery robot rock rocket role roller rolling romance romantic roof rooster rope rose rot
  rough round routine row rubber rubbish ruck rucksack rug ruin rule ruler rumour runner running runny rural
  rusk russia sack sacrament safari safety sail sailor salad salary sale salesperson salt samp sanctuary sand
  sandal sanding sandpaper sandwich sane sanitary satan satellite satisfy sauce saucer sausage saving saviour
  saw saxophonist scales scam scan scandal scanner scar scarecrow scarf scary scenario scene schedule schizoid
  schizophrenia science scientist scissors scold scone scooter score scorpion scotophobia scout scrambled
  scratch screen screening screw screwdriver scribble script scrub scrubber scrum sculpt seal sealant seasons
  secret secretary secure security seed seedling seesaw seismology seize select self selfish semester semi
  sender sensible sensitive sentence separate separation sequence serendipity series sermon serologist servant
  server service serviette setting sewing sexy shack shade shadow shallow shame shampoo shape shark sharpener
  shears shebeen sheep sheet shelf shell shellfish shelter shepherd shield shift shin ship shirt shiver sho
  shock shoe shoelace shooters shopkeeper shopping shorts shot shoulder shovel shrimp shrug sibling side
  sideburns sidewalk sidewards sierra sieve sift sight sighted signal signature silent silkworm silver similar
  sin sincerity singer sinus sinusitis sister site sitiophobia sitting size skate skating skeleton ski skill
  skills skin skinny skipping skirt skunk sky slander slang slap slaughter slave sledge sleeping sleepy sleeve
  slice slices slick slime sling slipper slogan sloppy sly smack smash smooth smuggling snack snail snake sniff
  snip sniper snob snooker snore snowball soap soccer social society sociology sock sofa softball software soil
  solder soldier sole solution somerset son song soothe sophisticated sore sort sos soul souls sound soup source
  south sow space spaceship spade spaghetti spanner spar sparkle sparrow spatula speaker spear specialist
  specific specimen speckled spectrophobia speech speed spice spider spin spinach spirit spiteful sponge sponsor
  spool spoon sport sports sportswear spot spotted sprain spread springbok springboks sprinkle sprinkler sprouts
  spur spy square squash squeeze squid squirrel st stab stable staff stage stairs stairway stale stalk stammer
  stamp standard stapler star starter starve stasiphobia state statement states statistician statue steady steak
  steam steep steers stepbrother stepfather stepmother stepsister stereotype stethoscope stew steward sticker
  sticky stigma still sting stink stir stitches stocking stocks stoep stomach stone stones stool storeroom stork
  storm story stove straight straightaway strand strategy stratocracy straw strawberry stress stretch stretcher
  string stroke structure struggle stuck student stutter sty style subject submarine subscribe subsidy subtitle
  subtract subtraction success succulent suck suffocate sugar suicide suit sulk sum sun sunburn sunflower
  sunglasses sunrise sunset sunshine super supervisor supper surf surgeon surname surrender survey suspicious
  sustain swan swear sweeper sweetener sweets swell swift swimming swimsuit swing swipe swollen sword symbol
  symmetrophobia symptom syndrome synergy syntax syringe syrup system tablecloth tablet tackle tadpole tail
  tailor taking talent tambo tambourine tame tank tantrum tap tape tapestry tapinophobia target tart tavern tax
  tea teacher team teamwork teapot teaspoon technical technician technology teenage teeth telecommunications
  telegram teleophobia telephone television temperature tender tennis tense tent term terminate terminology
  testament testify testimony textbook thalassophobia thanatophobia thankful theater theatrophobia theft theme
  theocracy theology theophobia therapist therapy thermometer thief thigh thimble thing thorn thought thread
  threat thrill thriller throat thumb thunder thunderstorm tic ticket tickle tiger tight tighten tights tiler
  tiles timber timetable tinnitus tissue title toad toast toasted toaster toddler toe toffee together tollgate
  tom tomato tong tongue tonsils too tool toolbox tooth toothache toothbrush top topic topophobia torch tornado
  torrential tortoise total tough tourette tourism tourist tow towel tower toxicology toxiphobia toy trace track
  tractor traditional traffic trail trailer trainer training tram trampoline transfer transparent transplant
  transport trap trash trauma tray treasure treasurer tree tremble tremor trial triangle trick trigger trip
  tripe triplet trolley trophy trouble trousers truck trump trumpet trunk trustworthy truth tube tuberculophobia
  tuberculosis tug tumble tumour tunnel turban turkey turquoise turtle tusk twig twin twist twitter typewriter
  typist tyre ugh ulcer ultrasonic umbrella umpire unacceptable uncle uncomfortable unconscious underline
  underneath underpants undertaker underweight undoubtedly uneducated unemployed unequal uneven ungrateful
  unhealthy uniform union unique unit unite united unity unknown unlike unprepared untrustworthy update
  upholstery upload upwards urban urologist useless user usual vacate vacation vaccination vaccine vacuum
  valentine valley valuable value valve vampire van vapour variables vase vegetable vegetarian vehicle verb
  verbal verse version versus vertical very vest veterinarian vibrate vice vicious victim victory view villain
  vincent violation violence violent violet violin virology virtual virus visible visitor visual vitamin
  vocabulary vodka voice void volcano volleyball volume volunteer vomit vulnerable vulture wag wage wagon waist
  waiter waiting waitress walking wall wallet walrus war ward wardrobe warming wart washcloth washing wasp
  watchman waterfall waterfront watering watermelon wax way weary weather weave web weed weet weigh weight weird
  weld welder well wellington wellness went west western whale whatever wheat wheel wheelbarrow wheezing
  wherever whip whiplash whisk whiskers whiskey whisky whoever wholesale whooping wi width wife wig wiggle
  wildebeest willing wind windmill window windy wine wing winner wipe wire wireless witch withdraw within
  witness witnesses wits wizard wobble wolf woman wood woodpecker woodwork wool worcester word worker workshop
  worm worse worsen worship worst worth wound wow wrench wrestling wrinkle wrist writer yeah yet yo yoga yoghurt
  yolk york youth zebra zimbabwe zipper zombie zoology zoom
`));
