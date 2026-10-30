import { getDb } from '@/app/lib/db';
import { getRequestConference } from '@/app/lib/guards';
import ViewPosterClient from './ViewPosterClient';

export const dynamic = 'force-dynamic';

export default async function ViewPosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // A talk on the program with no slides yet gets a simple page instead of the viewer
  const talk = await (async () => {
    try {
      const db = await getDb();
      return await db.collection('posters').findOne(
        { id, awaitingSlides: true, deletedAt: { $exists: false } },
        { projection: { id: 1, title: 1, presenterName: 1, presenterOrg: 1, sessionId: 1, abstract: 1 } }
      );
    } catch {
      return null;
    }
  })();
  if (!talk) return <ViewPosterClient posterId={id} />;

  const conf = await getRequestConference().catch(() => null);
  const db = await getDb();
  const session = talk.sessionId ? await db.collection('sessions').findOne({ id: talk.sessionId }) : null;
  const speaker = [talk.presenterName, talk.presenterOrg].filter(Boolean).join(', ');

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3 mb-6">
          <a href="/" className="text-sm text-blue-600 hover:underline">← Back</a>
          {conf?.logo && (
            <a href="/" title="Back to the conference">
              <img src={conf.logo} alt={conf.name} className="h-10 w-auto object-contain" />
            </a>
          )}
        </div>
        <div className="bg-white border rounded-xl p-6 space-y-3">
          <h1 className="text-xl font-semibold text-gray-900">{String(talk.title ?? '')}</h1>
          {speaker && <p className="text-sm text-gray-700">{speaker}</p>}
          {session && (
            <p className="text-sm text-gray-500">
              {[session.name, session.location].filter(Boolean).join(' · ')}
            </p>
          )}
          {talk.abstract && <p className="text-sm text-gray-700 whitespace-pre-wrap">{String(talk.abstract)}</p>}
          <div className="rounded-lg bg-gray-50 border px-4 py-3 text-sm text-gray-600">
            The slides for this talk haven&apos;t been posted yet.
          </div>
          <a
            href={`/present?talk=${encodeURIComponent(id)}`}
            className="inline-block rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium"
          >
            Are you the presenter? Add your slides
          </a>
        </div>
      </div>
    </main>
  );
}
