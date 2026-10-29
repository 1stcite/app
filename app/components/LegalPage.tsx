import Link from "next/link";

/** Shared layout for the Privacy and Terms pages. */
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <article className="mx-auto max-w-2xl bg-white border rounded-xl p-6 md:p-10 text-gray-800 leading-relaxed">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to the conference
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">Last updated {updated}</p>
        <div className="mt-6 space-y-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-blue-600 [&_a]:underline [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:py-2 [&_th]:pr-3 [&_th]:border-b [&_td]:py-2 [&_td]:pr-3 [&_td]:border-b [&_td]:align-top">
          {children}
        </div>
        <p className="mt-10 text-sm text-gray-500">
          See also <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
        </p>
      </article>
    </main>
  );
}
