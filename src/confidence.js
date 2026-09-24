// How sure a "What did I sign?" guess is.

/**
 * How sure a guess is, from how far the top guess stands clear of the next:
 * the gap in the summed scores, per three models. Measured on NID signers
 * against Real SASL clips (README, "How sure a guess is"): in lessons of 5 to
 * 20 words a gap of 3 or more was right 83-91% of the time, 2 to 3 was
 * 54-69%, under 2 was 30-40%. Across the whole dictionary even a clear gap was
 * right only about half the time, so there it never says "sure".
 */
export function confidence(pool, views = 3, lesson = true) {
  if (pool.length < 2) return null;
  const gap = ((pool[0].score - pool[1].score) * 3) / (views || 3);
  if (!lesson) {
    return gap >= 3
      ? { band: 'maybe', label: 'Maybe', text: 'Across the whole dictionary, guesses this clear were right about half the time.' }
      : { band: 'unsure', label: 'Not sure', text: 'Across the whole dictionary, guesses like this were right about one time in ten; check all three.' };
  }
  if (gap >= 3) return { band: 'sure', label: 'Sure', text: 'Guesses this clear were right about nine times in ten.' };
  if (gap >= 2) return { band: 'maybe', label: 'Maybe', text: 'Guesses like this were right about six times in ten.' };
  return { band: 'unsure', label: 'Not sure', text: 'Guesses like this were right about one time in three; check all three.' };
}
