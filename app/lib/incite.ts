/**
 * InCite Index — composite engagement score for talks.
 *
 * Three independent dimensions (each 0–100):
 *   - Interest:    how much attention the talk attracted (views, dwell, reach)
 *   - Interaction: how much people engaged with it (comments, saves, library adds)
 *   - Sentiment:   the valence of engagement (-1 to +1, displayed as -100 to +100)
 *
 * Composite score (0–100) is a multiplicative combination so a talk needs all
 * three dimensions to score high. Pure attention without engagement caps out.
 *
 * For the demo, scores are computed deterministically from the talk's id so
 * they are stable across page loads. Real event data will replace this in
 * Phase 2 (per the conversation about altmetrics architecture).
 */

export type InCiteScore = {
  interest: number; // 0-100
  interaction: number; // 0-100
  sentiment: number; // -100 to +100
  composite: number; // 0-100
};

/** Deterministic pseudo-random in [0, 1) from a seed string. */
function seededRand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Map to [0, 1)
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

  // Base scores from deterministic noise, biased toward middle-high
  // (most talks are middling, a few are great, a few are weak)
  let interest = Math.round(35 + r1 * 60);
  let interaction = Math.round(25 + r2 * 65);
  let sentiment = Math.round((r3 - 0.35) * 140); // skewed positive

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

  // Composite: multiplicative so all three matter
  // Normalize sentiment from [-100, 100] to a [0.5, 1.5] multiplier
  const sentMult = 1 + sentiment / 200;
  const composite = Math.round(
    Math.min(100, ((interest * interaction) / 100) * sentMult)
  );

  return { interest, interaction, sentiment, composite };
}

/** Color for a composite score badge. */
export function inciteColor(composite: number): { bg: string; text: string; ring: string } {
  if (composite >= 80) return { bg: "bg-emerald-100", text: "text-emerald-800", ring: "ring-emerald-300" };
  if (composite >= 65) return { bg: "bg-blue-100", text: "text-blue-800", ring: "ring-blue-300" };
  if (composite >= 50) return { bg: "bg-amber-100", text: "text-amber-800", ring: "ring-amber-300" };
  if (composite >= 35) return { bg: "bg-orange-100", text: "text-orange-800", ring: "ring-orange-300" };
  return { bg: "bg-gray-100", text: "text-gray-600", ring: "ring-gray-300" };
}
