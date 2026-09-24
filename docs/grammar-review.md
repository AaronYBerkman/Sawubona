# Sentence builder: questions for a Deaf SASL teacher

The sentence builder (`src/grammar.js`) puts English into a suggested SASL sign
order. Its core rules follow published sources and match them:

| Rule | Source | Example the app gives |
|---|---|---|
| Time first | Real SASL, "Sign language grammar"; "Where to place time related signs" | YESTERDAY MAN GIRL KISS |
| Subject, object, verb (English-like order shown as an alternative) | Real SASL, "Sign language grammar" | GIRL BOY KISS |
| Question word last | Real SASL, "Sign language grammar"; "Three types of questions" | LAST WEEK MAN KISS WHO |
| No articles, no "to be", no verb endings | Real SASL, "Sign language grammar" | ME HAPPY |
| Negation after the verb, with a head shake | De Barros & Siebörger 2016; Huddlestone 2017 | ME FISH DON'T LIKE |
| Noun, then colour, size, number | Real SASL, "Where to place an adjective"; DBE CAPS | ME HOUSE WHITE BIG TWO HAVE |
| "Because" as a rhetorical question | Real SASL, "Three types of questions" | ME DOG LIKE WHY? THEY FRIENDLY |
| Directional verbs carry who does it to whom | Real SASL, "Directional verbs" | HELP (from you toward me) |
| Topic, then comment | Real SASL, "Where to place an adjective" | MY BIRTHDAY MAY |

Passing the 548 test sentences means the app does what these rules say. It does
not mean the result is good SASL. The choices below have no clear published
source, so the app made a decision that a fluent signer should check. For each,
write the order you would teach.

| # | English | The app gives | Question | Your order |
|---|---|---|---|---|
| 1 | I can swim. | ME CAN SWIM | Does CAN go before the verb, or last (ME SWIM CAN)? CAN'T already goes last, as a negative. | |
| 2 | She gave him a book. | PAST BOOK GIVE (from her toward him) | In one sentence, with nobody placed yet, do you point to place SHE and HE first? | |
| 3 | My brother is taller than me. | MY BROTHER TALL THAN ME | How are comparisons signed? Is THAN signed? | |
| 4 | I go to work with my friend. | WORK ME GO WITH MY FRIEND | Where does "with my friend" go? | |
| 5 | I went to school by bus. | PAST SCHOOL ME GO BUS | Where does the transport go? | |
| 6 | She is twenty years old. | SHE YEAR OLD TWENTY | SHE AGE TWENTY, or another order? | |
| 7 | What do you do for work? | WORK YOU FOR DO WHAT | Is this asked as YOU WORK WHAT? | |
| 8 | My mother works at the hospital. | HOSPITAL MY MOTHER WORK | Does the place go first for "works at", or after who (MY MOTHER HOSPITAL WORK)? | |
| 9 | If it rains, I will stay home. | FUTURE RAIN HOME ME STAY | Is FUTURE needed with a condition, and where? | |
| 10 | I want you to come. | ME YOU WANT COME | Order of the two people and two verbs? | |
| 11 | How are you? | YOU HOW | Is the everyday greeting HOW YOU, or one sign? | |
| 12 | Nice to meet you. | NICE YOU MEET | NICE MEET YOU, or a fixed greeting? | |

Each answer can become a test case in `test/corpus/`, so the app then follows it.
