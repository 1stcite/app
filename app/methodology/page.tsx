import Link from "next/link";

export const metadata = {
  title: "Scoring Methodology — 1stCite",
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="text-sm text-blue-600 hover:underline inline-block mb-8">
          ← Back to sessions
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight mb-1">Scoring Methodology</h1>
        <p className="text-xs text-gray-500 mb-10">
          Version <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">v0.5 · 2026-04-16</code> · Applies to all conferences on 1stCite
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

        <Section title="Likes">
          <P>
            A binary signal of approval. Each logged-in user may like a talk
            once. No rating scale. The count is displayed below the engagement
            score as a secondary metric.
          </P>
          <P>
            Likes require the user to have marked the talk as viewed first. This
            ensures likes come from people who have actually engaged with the
            content, not just seen it in a list.
          </P>
          <P>
            Likes are deliberately not folded into the engagement formula.
            Engagement measures attention; likes measure reception. A talk can
            attract enormous attention for controversial reasons while receiving
            few likes — that&apos;s information worth preserving.
          </P>
          <Note>
            For ORCID-authenticated users who have provided their own ORCID,
            likes data is available in the detail view as an audience composition
            breakdown (by field, seniority, geography).
          </Note>
        </Section>

        <Section title="Slide attention">
          <P>
            In the talk detail view, each slide shows a comment count — the
            number of comments posted on that specific slide. This provides a
            simple, interpretable measure of which slides drew the most response.
          </P>
          <P>
            No minimum threshold is applied. A slide with zero comments simply
            shows zero. The bar chart scales relative to the most-commented slide
            in the talk.
          </P>
        </Section>

        <Section title="Questions by slide">
          <P>
            Public comments and notes-to-author are classified in the background
            by AI as either a question or a non-question. The question count per
            slide is shown alongside the total comment count.
          </P>
          <P>
            A slide with many questions may be the most interesting, novel, or
            unclear slide in the deck. The presenter is in the best position to
            interpret the signal.
          </P>
        </Section>

        <Section title="Comment sentiment (author-only)">
          <P>
            An overall sentiment summary is provided to the presenter only. All
            comments on the talk — including public comments and private
            notes-to-author — are categorized as praise, neutral, or critical.
          </P>
          <P>
            The summary shows a simple count in each category. This is not
            displayed publicly. It is a tool for the presenter to gauge overall
            reception without reading every comment individually.
          </P>
          <Note>
            Personal notes (visible only to the note-taker) are excluded from
            the sentiment summary.
          </Note>
        </Section>

        <Section title="Comment tags">
          <P>
            The three existing comment tags remain unchanged: public comment,
            note to author, and personal note. The AI classification layer
            (question detection, sentiment categorization) runs in the background
            with no change to the user-facing comment interface.
          </P>
        </Section>

        <Section title="Sort options">
          <P>
            The session index supports three sort modes: program order (default),
            engagement (descending), and likes (descending). Sorting is
            per-session.
          </P>
        </Section>

        <Section title="ORCID integration">
          <P>
            Sign in with ORCID is the primary login method (OAuth). Email
            fallback available. No login required to view talks via shared links.
            Commenting, saving, and liking require login.
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
              Like counts can be influenced by presenter visibility and network
              effects.
            </li>
            <li>
              AI comment classification (question detection, sentiment) is
              imperfect. Misclassification can shift per-slide and summary
              signals.
            </li>
            <li>
              Per-slide comment counts require sufficient commenting activity,
              which may not occur at smaller conferences.
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

        <Link href="/" className="text-sm text-blue-600 hover:underline inline-block mt-8">
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
