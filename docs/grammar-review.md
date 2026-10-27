# Sentence builder: questions for a Deaf SASL teacher

The sentence builder (`src/grammar.js`) puts English into a suggested SASL sign
order. Its core rules follow published sources and match them:

| Rule | Source | Example the app gives |
|---|---|---|
| Time first | Real SASL, "Sign language grammar"; "Where to place time related signs" | YESTERDAY MAN GIRL KISS |
| Who, what, then the action; the verb-first order of relaxed conversation shown as the alternative | Real SASL, "Sign language grammar" and lessons; Real SASL Day 8, signed by Deaf presenters (YESTERDAY GIRLFRIEND MY KISS); Wehrmeyer 2025 for the alternative | ME APPLE EAT (also ME EAT APPLE) |
| WANT, TRY, NEED, SHOULD first, then the thing, then the action | Wright 2017 (SHOULD SCHOOL NORTH-WEST GO) | ME WANT SIGN LANGUAGE LEARN |
| NOT is optional: the head shake and frown make it negative | De Barros & Siebörger 2016; Real SASL Day 8 (YESTERDAY ME WORK, no NOT) | YESTERDAY ME WORK (NOT) |
| ME is optional when it is clear | Real SASL Day 8 (BROTHER TWO HAVE); Wehrmeyer 2025 | (ME) BROTHER TWO HAVE |
| A verb that moves between people or places comes last | Real SASL, "Directional verbs"; Napoli & Sutton-Spence 2014 | ME KEY TABLE PUT |
| How long, clock times and AFTER SCHOOL are time, so they go first | Wright 2017 (time clause-initial); DBE CAPS (numeral incorporation) | TEN YEAR HERE ME LIVE |
| Comparing: the other side first, then MORE; THAN not signed | Wright 2017 | HER SISTER SHE TALL MORE |
| Age is AGE and the number | Wright 2017 (AGE SIX) | SHE AGE TWENTY |
| Question word last | Real SASL, "Sign language grammar"; "Three types of questions" | LAST WEEK MAN KISS WHO |
| No articles, no "to be", no verb endings | Real SASL, "Sign language grammar" | ME HAPPY |
| Negation after the verb, with a head shake | De Barros & Siebörger 2016; Huddlestone 2017 | ME FISH DON'T LIKE |
| Noun, then colour, size, number | Real SASL, "Where to place an adjective"; DBE CAPS | ME HOUSE WHITE BIG TWO HAVE |
| "Because" as a rhetorical question | Real SASL, "Three types of questions" | ME DOG LIKE WHY? THEY FRIENDLY |
| Directional verbs carry who does it to whom | Real SASL, "Directional verbs" | HELP (from you toward me) |
| Topic, then comment | Real SASL, "Where to place an adjective" | MY BIRTHDAY MAY |

Passing the 588 test sentences means the app does what these rules say. It does
not mean the result is good SASL. The choices below have no clear published
source, so the app made a decision that a fluent signer should check. For each,
write the order you would teach.

| # | English | The app gives | Question | Your order |
|---|---|---|---|---|
| 1 | I can swim. | ME CAN SWIM | Does CAN go before the verb, or last (ME SWIM CAN)? CAN'T already goes last, as a negative. | |
| 2 | She gave him a book. | PAST BOOK GIVE (from her toward him) | In one sentence, with nobody placed yet, do you point to place SHE and HE first? | |
| 3 | My brother is taller than me. | ME MY BROTHER TALL MORE | Wright 2017 shows MORE between two set-up spaces and no THAN. Is this how you teach it? | |
| 4 | I go to work with my friend. | WORK ME GO WITH MY FRIEND | Where does "with my friend" go? | |
| 5 | I went to school by bus. | PAST SCHOOL ME GO BUS | Where does the transport go? | |
| 6 | She is twenty years old. | SHE AGE TWENTY | Wright 2017 has AGE SIX. Is SHE AGE TWENTY right? | |
| 7 | What do you do for work? | WORK YOU FOR DO WHAT | Is this asked as YOU WORK WHAT? | |
| 8 | My mother works at the hospital. | HOSPITAL MY MOTHER WORK | Does the place go first for "works at", or after who (MY MOTHER HOSPITAL WORK)? | |
| 9 | If it rains, I will stay home. | FUTURE RAIN HOME ME STAY | Is FUTURE needed with a condition, and where? | |
| 10 | I want you to come. | ME WANT YOU COME | Order of the two people and two verbs? | |
| 11 | How are you? | YOU HOW | Is the everyday greeting HOW YOU, or one sign? | |
| 12 | Nice to meet you. | NICE MEET YOU | Is this a fixed greeting? | |

Each answer can become a test case in `test/corpus/`, so the app then follows it.

## Sources

- Wehrmeyer, E. (2025). Structure of simple declarative clauses in South African Sign Language. *Sign Language & Linguistics* 28(1), 104-139. Corpus of 40 narratives by 25 signers in three provinces: basic SVO, SV most common, no copula, frequent dropped pronouns.
- Wright, D. (2017). *A preliminary description of South African Sign Language syntax*. MA dissertation, University of the Witwatersrand. One Soweto signer's narrative; no frequencies.
- Napoli, D. J. & Sutton-Spence, R. (2014). Order of the major constituents in sign languages. *Frontiers in Psychology* 5:376. Generalisations across 42 sign languages.
- Department of Basic Education. CAPS South African Sign Language Home Language, Gr R-3, 4-6, 7-9. Lists the grammar topics but gives almost no word-order rules.
- Real SASL, 21-day course and lesson videos (caption text in the project archive). Day 8's eight practice sentences, signed by four Deaf presenters, were read sign by sign with the app's recognition and checked by eye; they are test/corpus/real-sasl-signed.json.
