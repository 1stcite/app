/**
 * InCite Index — composite engagement score for talks.
 *
 * Three independent dimensions (each 0–100):
 *   - Interest:    how much attention the talk attracted (views, dwell, reach)
 *   - Interaction: how much people engaged with it (comments, saves, library adds)
 *   - Sentiment:   the positive valence of engagement (higher is better)
 *
 * Composite score (0–100) is a multiplicative combination so a talk needs
 * all three dimensions to score high. Pure attention without engagement
 * caps out.
 *
 * For the demo, scores are computed deterministically from the talk's id so
 * they are stable across page loads. Real event data will replace this in
 * Phase 2 (per the conversation about altmetrics architecture).
 */

export type InCiteScore = {
  interest: number; // 0-100
  interaction: number; // 0-100
  sentiment: number; // 0-100 (no negatives — higher is better)
  composite: number; // 0-100
};

/** Deterministic pseudo-random in [0, 1) from a seed string. */
function seededRand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Compute a mock InCite score for a talk. Stable across calls.
 *
 * Optionally accepts real-ish inputs (view count, comment count, save count)
 * to nudge the score in the right direction once we have any real data.
 */
export function computeInCite(
  talkId: string,
  inputs?: { views?: number; comments?: number; saves?: number }
): InCiteScore {
  const r1 = seededRand(talkId + ":interest");
  const r2 = seededRand(talkId + ":interaction");
  const r3 = seededRand(talkId + ":sentiment");

  // Base scores from deterministic noise, biased toward middle-high.
  // Most talks score in the 40-80 range; a few outliers on each end.
  let interest = Math.round(35 + r1 * 60);
  let interaction = Math.round(25 + r2 * 65);
  // Sentiment skews positive in scientific audiences — most comments
  // are supportive or constructive, with a minority questioning or critical.
  let sentiment = Math.round(50 + r3 * 45); // biased to 50-95 range

  // Nudge by real inputs if we have them
  if (inputs) {
    if (typeof inputs.views === "number") {
      interest = Math.min(100, Math.round(interest * 0.6 + Math.min(100, inputs.views / 5) * 0.4));
    }
    if (typeof inputs.comments === "number" || typeof inputs.saves === "number") {
      const c = (inputs.comments || 0) * 4 + (inputs.saves || 0) * 2;
      interaction = Math.min(100, Math.round(interaction * 0.6 + Math.min(100, c) * 0.4));
    }
  }

  // Clamp all dimensions to [0, 100]
  interest = Math.max(0, Math.min(100, interest));
  interaction = Math.max(0, Math.min(100, interaction));
  sentiment = Math.max(0, Math.min(100, sentiment));

  // Composite: geometric-style mean so a weakness in any dimension pulls
  // the composite down. Cube root of the product gives a balanced score
  // where (80,80,80) → 80 and (90,90,30) → ~58.
  const composite = Math.round(Math.cbrt(interest * interaction * sentiment));

  return { interest, interaction, sentiment, composite };
}

/** Color for a composite score badge. Uniform across all scores — the
 * number itself is the information, and the color should not imply
 * "good" vs "bad" judgment. We use a single emerald palette for every
 * score, which reads as positive and platform-branded without tiering. */
export function inciteColor(_composite: number): { bg: string; text: string; ring: string } {
  return { bg: "bg-emerald-100", text: "text-emerald-800", ring: "ring-emerald-300" };
}
