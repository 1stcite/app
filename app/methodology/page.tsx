import Link from "next/link";

export const metadata = {
  title: "Scoring Methodology — 1stCite",
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:underline inline-block mb-8"
        >
          ← Back to sessions
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          Scoring Methodology
        </h1>
        <p className="text-xs text-gray-500 mb-10">
          Version <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">v0.4 · 2026-04-16</code> · Applies to all conferences on 1stCite
        </p>

        <Section title="Engagement">
          <P>
            An attention composite capturing aggregate audience behavior as a
            single number. It rewards three actions representing successively
            deeper commitment: showing up, saving for later, and speaking.
          </P>
          <Formula>Engagement = scheduled + (saves × 2) + (comments × 3)</Formula>
          <P>
            Displayed as a raw count with no threshold. Hover any engagement
            score to see the breakdown: viewers, median view time (decimal
            minutes), comments, and commenters.
          </P>
          <Note>
            <strong>Why weight comments at 3×?</strong> A comment costs far more
            attention than a scheduled view. The weighting prevents talks with
            high passive traffic from outranking talks that moved their audience
            to respond.
          </Note>
        </Section>

        <Section title="Thumbs-up">
          <P>
            A binary signal of approval. Each logged-in user may give a talk one
            thumbs-up. No rating scale. The count is displayed below the
            engagement score as a secondary metric.
          </P>
          <P>
            Thumbs-up is deliberately not folded into the engagement formula.
            Engagement measures attention; thumbs-up measures reception. A talk
            can attract enormous attention for controversial reasons while
            receiving few thumbs-up — that&apos;s information worth preserving.
          </P>
          <Note>
            For ORCID-authenticated users who have provided their own ORCID,
            thumbs-up data is available in the detail view as an audience
            composition breakdown (by field, seniority, geography).
          </Note>
        </Section>

        <Section title="Controversy (per-slide)">
          <P>
            In the talk detail view, each slide&apos;s attention bar is colored to
            indicate disagreement among commenters. Controversy is derived from
            variance in tone among public comments classified as non-questions on
            that specific slide.
          </P>
          <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed mb-4">
            <li>
              <strong>Cool (green)</strong> — commenters broadly agree.
            </li>
            <li>
              <strong>Warm (orange → red)</strong> — commenters disagree about
              the content of that slide.
            </li>
            <li>
              <strong>Gray</strong> — below threshold (3–4 non-question public
              comments on that slide).
            </li>
          </ul>
          <P>
            The controversy heatmap is visible to all users in the talk detail
            view.
          </P>
        </Section>

        <Section title="Confusion (per-slide, presenter-only)">
          <P>
            A parallel signal visible only on the presenter&apos;s dashboard. Derived
            from question density on each slide. Questions identified by AI
            classification of public comments and notes-to-author.
          </P>
          <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed mb-4">
            <li>
              Questions from public comments and notes-to-author feed the
              confusion computation.
            </li>
            <li>Personal notes feed nothing.</li>
          </ul>
          <P>
            Confusion is not a judgment of clarity. A slide with many questions
            may simply be the most interesting or novel slide. The presenter is
            in the best position to interpret the signal.
          </P>
        </Section>

        <Section title="Comment classification">
          <P>
            Every public comment and note-to-author is classified in the
            background by AI as either a question or a non-question. This
            classification drives the controversy and confusion computations. The
            three existing comment tags (public comment, note to author, personal
            note) remain unchanged — no user-facing UI change.
          </P>
        </Section>

        <Section title="Sort options">
          <P>
            The session index supports three sort modes: program order (default),
            engagement (descending), and thumbs-up (descending). Sorting is
            per-session.
          </P>
        </Section>

        <Section title="ORCID integration">
          <P>
            Sign in with ORCID is the primary login method (OAuth). Email
            fallback available. No login required to view talks via shared links.
            Commenting, saving, and thumbs-up require login.
          </P>
          <P>
            ORCID data (field, seniority, publication count, geography) is cached
            locally and used for audience composition breakdowns in the detail
            view — visible only to users who have disclosed their own ORCID.
          </P>
        </Section>

        <Section title="What is not shown at launch">
          <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed mb-4">
            <li>No sentiment score (1–5 or otherwise) on the index or anywhere public.</li>
            <li>No InCite composite metric.</li>
            <li>No variance/error bars on the index.</li>
            <li>No color-coded sentiment swatches.</li>
          </ul>
          <P>
            All remain in the design roadmap for introduction once the platform
            has established trust and the commenter base supports statistically
            meaningful signals.
          </P>
        </Section>

        <Section title="Limitations">
          <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed mb-4">
            <li>Engagement rewards activity, not quality.</li>
            <li>
              Thumbs-up counts can be influenced by presenter visibility and
              network effects.
            </li>
            <li>
              AI comment classification is imperfect. Misclassification shifts
              controversy and confusion signals.
            </li>
            <li>
              Per-slide controversy requires sufficient comments on individual
              slides, which may not occur at smaller conferences.
            </li>
            <li>
              None of these metrics are intended as a quality judgment of the
              underlying research.
            </li>
          </ul>
        </Section>

        <Section title="Versioning">
          <P>
            Changes to formulas, thresholds, and classification logic are
            versioned. The current version tag appears at the top of this page
            and in the API payload for every score.
          </P>
        </Section>

        <Link
          href="/"
          className="text-sm text-blue-600 hover:underline inline-block mt-8"
        >
          ← Back to sessions
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold tracking-tight mb-3">{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-900 leading-relaxed mb-3">{children}</p>;
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3 font-mono text-sm my-4">
      {children}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-gray-600 pl-3.5 border-l-2 border-gray-200 my-4">
      {children}
    </div>
  );
}
