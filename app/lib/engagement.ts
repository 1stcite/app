/**
 * Engagement score — attention composite for talks.
 *
 * Formula: scheduled + (saves × 2) + (comments × 3)
 *
 * Displayed as a raw number with no threshold. The components
 * are observable facts about audience behavior, not derived estimates.
 *
 * Thumbs-up is tracked separately and NOT folded into engagement.
 * Engagement measures attention; thumbs-up measures reception.
 *
 * For the demo, scores are computed deterministically from the talk's
 * id so they are stable across page loads. Real event data will
 * replace this once tracking is live.
 */

export type EngagementData = {
  engagement: number;
  viewers: number;
  medianViewTimeMin: number; // decimal minutes
  comments: number;
  commenters: number;
  thumbsUp: number;
  saves: number;
  scheduled: number;
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
 * Compute mock engagement data for a talk. Stable across calls.
 * When real tracking is live, this will be replaced by MongoDB aggregation.
 */
export function computeEngagement(talkId: string): EngagementData {
  const r1 = seededRand(talkId + ":viewers");
  const r2 = seededRand(talkId + ":saves");
  const r3 = seededRand(talkId + ":comments");
  const r4 = seededRand(talkId + ":thumbs");
  const r5 = seededRand(talkId + ":time");

  const viewers = Math.round(60 + r1 * 400);
  const saves = Math.round(5 + r2 * 80);
  const comments = Math.round(r3 * 25);
  const commenters = Math.min(comments, Math.round(comments * (0.5 + r3 * 0.5)));
  const thumbsUp = Math.round(5 + r4 * 130);
  const medianViewTimeMin = Math.round((2 + r5 * 8) * 10) / 10;

  // Scheduled = viewers (everyone who showed up counts as 1 scheduled)
  const scheduled = viewers;
  const engagement = scheduled + saves * 2 + comments * 3;

  return {
    engagement,
    viewers,
    medianViewTimeMin,
    comments,
    commenters,
    thumbsUp,
    saves,
    scheduled,
  };
}
