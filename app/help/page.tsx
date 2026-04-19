import Link from "next/link";

export const metadata = { title: "Help — 1stCite" };

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="text-sm text-blue-600 hover:underline inline-block mb-8">
          ← Back to conference
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight mb-6">How to use 1stCite</h1>

        <div className="space-y-6 text-sm text-gray-900 leading-relaxed">

          <Section title="Browsing talks">
            <p>
              The conference page shows all sessions and talks. Click any talk
              title to view its slide deck. You can browse freely without
              signing in.
            </p>
          </Section>

          <Section title="Interacting with talks">
            <p>
              Sign in to use the three action icons on each talk card:
            </p>
            <div className="mt-3 space-y-3">
              <IconRow
                icon={<StarOutline />}
                label="Interested"
                desc="Star talks that catch your eye. These appear in your My Talks list."
              />
              <IconRow
                icon={<ChairOutline />}
                label="Attend"
                desc="Mark talks you plan to attend in person. This builds your personal schedule and flags time conflicts between parallel sessions."
              />
              <IconRow
                icon={<DiscOutline />}
                label="Save to Library"
                desc="Save talks you want to come back to later. These are talks worth reviewing — the ones you'd photograph in today's world."
              />
            </div>
            <p className="mt-3 text-gray-500">
              Each icon works independently. A talk can be starred, attended,
              saved, or any combination. Clicking attend automatically stars
              the talk too.
            </p>
          </Section>

          <Section title="My Talks">
            <p>
              The <strong>My Talks</strong> page collects everything you've interacted with.
              Three tabs let you filter:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>All</strong> — your upcoming schedule on top, library below</li>
              <li><strong>Schedule</strong> — only talks you marked to attend, with conflict warnings</li>
              <li><strong>Library</strong> — talks you saved, plus reminders for things you starred or attended but haven't saved yet</li>
            </ul>
          </Section>

          <Section title="Viewing slides">
            <p>
              Click any talk title to open the slide viewer. Swipe or use
              Prev/Next to navigate slides. On desktop, comments appear in a
              side panel. On mobile, they appear below the slides.
            </p>
          </Section>

          <Section title="Comments">
            <p>
              Click <strong>Add</strong> to comment on the current slide. Choose a
              visibility:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Public</strong> — visible to everyone</li>
              <li><strong>Note to author</strong> — only the presenter and you can see it</li>
              <li><strong>Personal note</strong> — only you can see it</li>
            </ul>
          </Section>

          <Section title="Schedule conflicts">
            <p>
              If you mark talks in different parallel sessions as "Attend" and
              their time slots overlap, you'll see a conflict warning on your
              My Talks page. This helps you plan which sessions to attend
              without double-booking yourself.
            </p>
          </Section>

        </div>

        <Link href="/" className="text-sm text-blue-600 hover:underline inline-block mt-10">
          ← Back to conference
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold tracking-tight mb-2">{title}</h2>
      {children}
    </section>
  );
}

function IconRow({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 shrink-0 text-gray-700 mt-0.5">{icon}</div>
      <div>
        <span className="font-medium">{label}</span>
        <span className="text-gray-600"> — {desc}</span>
      </div>
    </div>
  );
}

function StarOutline() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function ChairOutline() {
  return (
    <svg className="w-5 h-5" viewBox="-19.82 0 122.88 122.88" fill="none" stroke="currentColor" strokeWidth={6}>
      <path d="M3.28,0h8.62c1.76,0,2.92,1.46,3.2,3.2c3.26,20.54,5.02,41.07,4.93,61.61H79c2.33,0,4.23,1.91,4.23,4.23v8.55 h-3.38v43.71c0,0.7-0.58,1.29-1.29,1.29H67.26c-0.71,0-1.29-0.58-1.29-1.29v-19.02H17.71c-0.7,5.8-1.57,11.6-2.61,17.4 c-0.31,1.73-1.44,3.2-3.2,3.2H3.28c-1.76,0-3.69-1.51-3.2-3.2c11.36-39.56,9-78.23,0-116.48C-0.33,1.49,1.52,0,3.28,0L3.28,0z M65.97,96.4v-18.8H19.85c-0.26,8-0.81,10.81-1.67,18.8H65.97L65.97,96.4z" />
    </svg>
  );
}

function DiscOutline() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="7" y="3" width="10" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5" y="14" width="14" height="5" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
