import Link from "next/link";

export const metadata = { title: "Scoring Methodology — 1stCite" };

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="text-sm text-blue-600 hover:underline inline-block mb-8">← Back to sessions</Link>

        <h1 className="text-2xl font-semibold tracking-tight mb-1">Scoring Methodology</h1>
        <p className="text-xs text-gray-500 mb-10">
          Version <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">v0.6 · 2026-04-17</code> · Applies to all conferences on 1stCite
        </p>

        <Section title="Engagement">
          <P>An attention composite capturing aggregate audience behavior as a single number. It rewards three actions representing successively deeper commitment: showing up, saving for later, and speaking.</P>
          <Formula>Engagement = scheduled + (saves × 2) + (comments × 3)</Formula>
          <P>Displayed as a raw count with no threshold. Hover any engagement score to see the breakdown: viewers, median view time (decimal minutes), commenters, comments, and saves.</P>
          <Note><strong>Why weight comments at 3×?</strong> A comment costs far more attention than a scheduled view. The weighting prevents talks with high passive traffic from outranking talks that moved their audience to respond.</Note>
        </Section>

        <Section title="Save to Library">
          <P>Save-to-library is the single positive engagement gesture. Each logged-in user may save a talk once. No rating scale, no applause button — a save means &quot;this is worth keeping.&quot;</P>
          <P>Saves are folded into the engagement formula at 2× weight. They also appear as a standalone metric in the insights dashboard because the save rate (saves ÷ viewers) is a useful signal of talk quality independent of raw traffic.</P>
        </Section>

        <Section title="Attendance checkbox">
          <P>When a user saves a talk, an inline checkbox appears: &quot;I attended this talk.&quot; Default unchecked. The save completes regardless of whether they check it.</P>
          <P>The attendance flag is stored as metadata on the save record and feeds two downstream uses:</P>
          <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed mb-4">
            <li>Presenter dashboard reports saves segmented by attended vs. archive-only (e.g. &quot;saved by 47 people, 31 of whom attended the talk&quot;).</li>
            <li>Comments from users who saved-and-attended are weighted 2× in the per-slide controversy computation, because attendees have context the archive-only viewer does not.</li>
          </ul>
        </Section>

        <Section title="Schedule vs. Save">
          <P>Schedule and save are separate actions with separate meanings. Schedule = &quot;I intend to see this&quot; (pre-conference). Save = &quot;this is worth keeping&quot; (post-engagement). Both contribute to the engagement formula — scheduling at 1× (as part of the &quot;scheduled&quot; count) and saving at 2×.</P>
        </Section>

        <Section title="Slide attention">
          <P>In the talk detail view, each slide shows a comment count — the number of comments posted on that specific slide. No minimum threshold. The bar chart scales relative to the most-commented slide in the talk.</P>
        </Section>

        <Section title="Questions by slide">
          <P>Public comments and notes-to-author are classified in the background by AI as either a question or a non-question. The question count per slide is shown alongside the total comment count in the slide attention chart.</P>
        </Section>

        <Section title="Comment sentiment (author-only)">
          <P>An overall sentiment summary is provided to the presenter only. All comments on the talk — including public comments and private notes-to-author — are categorized as praise, neutral, or critical. The summary shows a simple count in each category. Personal notes are excluded.</P>
        </Section>

        <Section title="Comment tags">
          <P>The three existing comment tags remain unchanged: public comment, note to author, and personal note. The AI classification layer (question detection, sentiment categorization) runs in the background with no change to the comment interface.</P>
        </Section>

        <Section title="Sort options">
          <P>The session index supports two sort modes: program order (default) and engagement (descending). Sorting is per-session.</P>
        </Section>

        <Section title="ORCID integration">
          <P>Sign in with ORCID is the primary login method (OAuth). Email fallback available. No login required to view talks via shared links. Commenting, saving, and scheduling require login.</P>
          <P>ORCID data (field, seniority, publication count, geography) is cached locally and used for audience composition breakdowns in the insights dashboard — visible only to users who have disclosed their own ORCID.</P>
        </Section>

        <Section title="What is not shown at launch">
          <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed mb-4">
            <li>No sentiment score (1–5 or otherwise) on the index or anywhere public-facing.</li>
            <li>No InCite composite metric.</li>
            <li>No variance/error bars on the index.</li>
            <li>No color-coded sentiment swatches.</li>
            <li>No thumbs-up, applause, or rating button.</li>
          </ul>
          <P>All remain in the design roadmap for introduction once the platform has established trust.</P>
        </Section>

        <Section title="Limitations">
          <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed mb-4">
            <li>Engagement rewards activity, not quality.</li>
            <li>Save counts can be influenced by presenter visibility and network effects.</li>
            <li>Attendance is self-reported and unverified.</li>
            <li>AI comment classification is imperfect.</li>
            <li>Per-slide comment counts require sufficient commenting activity.</li>
            <li>None of these metrics are intended as a quality judgment of the underlying research.</li>
          </ul>
        </Section>

        <Section title="Versioning">
          <P>Changes to formulas, thresholds, and classification logic are versioned. The current version tag appears at the top of this page and in the API payload for every score.</P>
        </Section>

        <Link href="/" className="text-sm text-blue-600 hover:underline inline-block mt-8">← Back to sessions</Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mb-8"><h2 className="text-base font-semibold tracking-tight mb-3">{title}</h2>{children}</section>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-900 leading-relaxed mb-3">{children}</p>;
}
function Formula({ children }: { children: React.ReactNode }) {
  return <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3 font-mono text-sm my-4">{children}</div>;
}
function Note({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-gray-600 pl-3.5 border-l-2 border-gray-200 my-4">{children}</div>;
}
