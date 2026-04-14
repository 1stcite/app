/**
 * InCite Index — two-axis engagement metric for talks.
 *
 * Two independent dimensions, each 0-100:
 *   - Engagement: how much attention and interaction a talk attracted
 *                 (combines what we previously tracked as Interest and
 *                 Interaction). High = many people viewed, dwelled,
 *                 commented, saved, and added to library.
 *   - Sentiment:  the valence of those reactions. High = supportive,
 *                 enthusiastic. Low = critical, questioning.
 *
 * The two axes carry genuinely different information and shouldn't
 * be collapsed into a single composite. A high-engagement low-sentiment
 * talk is "controversial but important." A high-sentiment low-engagement
 * talk is "universally liked but few people noticed." Both are valid.
 *
 * Visualization: the two axes are rendered as a cross — engagement
 * is the horizontal bar width, sentiment is the vertical bar height,
 * with the engagement number anchored at the center.
 *
 * For the demo, scores are computed deterministically from the talk's
 * id so they are stable across page loads. Real event data will
 * replace this in Phase 2.
 */

export type InCiteScore = {
  engagement: number; // 0-100
  sentiment: number; // 0-100
  // Sub-dimensions of engagement, kept for the detail breakdown
  interest: number; // 0-100
  interaction: number; // 0-100
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
 */
export function computeInCite(
  talkId: string,
  inputs?: { views?: number; comments?: number; saves?: number }
): InCiteScore {
  const r1 = seededRand(talkId + ":interest");
  const r2 = seededRand(talkId + ":interaction");
  const r3 = seededRand(talkId + ":sentiment");

  let interest = Math.round(35 + r1 * 60);
  let interaction = Math.round(25 + r2 * 65);
  let sentiment = Math.round(50 + r3 * 45);

  if (inputs) {
    if (typeof inputs.views === "number") {
      interest = Math.min(100, Math.round(interest * 0.6 + Math.min(100, inputs.views / 5) * 0.4));
    }
    if (typeof inputs.comments === "number" || typeof inputs.saves === "number") {
      const c = (inputs.comments || 0) * 4 + (inputs.saves || 0) * 2;
      interaction = Math.min(100, Math.round(interaction * 0.6 + Math.min(100, c) * 0.4));
    }
  }

  interest = Math.max(0, Math.min(100, interest));
  interaction = Math.max(0, Math.min(100, interaction));
  sentiment = Math.max(0, Math.min(100, sentiment));

  // Engagement is the geometric mean of interest and interaction,
  // so a weakness in either dimension pulls it down.
  // sqrt(80*80) = 80, sqrt(90*30) ≈ 52
  const engagement = Math.round(Math.sqrt(interest * interaction));

  return { engagement, sentiment, interest, interaction };
}

/** Color palette — uniform across all scores, no implicit tiering. */
export function inciteColor(_score?: number): { bg: string; text: string; ring: string } {
  return { bg: "bg-emerald-100", text: "text-emerald-800", ring: "ring-emerald-300" };
}
