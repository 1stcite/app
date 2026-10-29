"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { uploadPdf, MAX_PDF_MB } from "@/app/lib/uploadPdf";

type Props = {
  conferenceName: string;
  logo: string;
  open: boolean;
  codeRequired: boolean;
  liveUntilLabel: string | null;
};

type Stage = "form" | "uploading" | "saving" | "done";

export default function PresentClient({ conferenceName, logo, open, codeRequired, liveUntilLabel }: Props) {
  const sp = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  const [presenterCode, setPresenterCode] = useState(sp.get("code") ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);

  const [stage, setStage] = useState<Stage>("form");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [manageUrl, setManageUrl] = useState<string | null>(null);
  const [posterId, setPosterId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fullManageUrl =
    manageUrl && typeof window !== "undefined" ? `${window.location.origin}${manageUrl}` : manageUrl ?? "";

  function pickFile(f: File | undefined) {
    if (!f) return;
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim());
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Choose your slide deck (PDF).");
    if (!consent) return setError("Please confirm you're authorized to share this deck.");

    try {
      setStage("uploading");
      setProgress(0);
      const fileUrl = await uploadPdf(file, { present: true, presenterCode }, setProgress);

      setStage("saving");
      const r = await fetch("/api/present", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presenterCode, name, email, organization, title, abstract, fileUrl, consent }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Something went wrong saving your talk.");

      setManageUrl(j.manageUrl);
      setPosterId(j.posterId);
      setStage("done");
      window.scrollTo({ top: 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setError(/not authorized/i.test(msg) ? "That presenter code doesn't match. Check your acceptance email." : msg);
      setStage("form");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullManageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const header = (
    <>
    <a href="/" className="inline-block mb-4 text-sm text-blue-600 hover:underline">
      ← Back to the conference
    </a>
    <div className="flex items-center gap-3 mb-6">
      <img src={logo} alt="" className="h-12 w-auto object-contain" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{conferenceName}</p>
        <h1 className="text-2xl font-bold text-gray-900">Share your talk</h1>
      </div>
    </div>
    </>
  );

  if (!open) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-xl">
          {header}
          <div className="bg-white border rounded-xl p-6 text-gray-700">
            Presenter uploads aren&apos;t open for this conference right now. Please check with the organizers.
          </div>
        </div>
      </main>
    );
  }

  if (stage === "done" && manageUrl) {
    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      `Your 1stCite link for "${title}"`
    )}&body=${encodeURIComponent(
      `Manage your talk and see who engaged with it:\n${fullManageUrl}\n\nKeep this link private. Anyone with it can edit or remove your talk.`
    )}`;

    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-xl space-y-5">
          {header}
          <div className="bg-white border border-emerald-200 rounded-xl p-6 space-y-4">
            <p className="text-lg font-semibold text-emerald-700">Your talk is live for {conferenceName} attendees.</p>
            <div>
              <p className="text-sm font-medium text-gray-900">Your private presenter link</p>
              <p className="text-sm text-gray-600 mt-1">
                This is the only way back to your talk&apos;s settings and report. Save it now.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  readOnly
                  value={fullManageUrl}
                  className="flex-1 min-w-0 rounded-md border bg-gray-50 px-3 py-2 text-sm font-mono"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="shrink-0 rounded-md bg-gray-900 text-white px-3 py-2 text-sm font-medium"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <a href={mailto} className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                Email this link to myself
              </a>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href={manageUrl} className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium">
                Open my presenter page
              </a>
              {posterId && (
                <a href={`/view/${posterId}`} className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700">
                  See it as attendees will
                </a>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const busy = stage === "uploading" || stage === "saving";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        {header}

        <div className="bg-white border rounded-xl p-5 mb-5 text-sm text-gray-700 space-y-2">
          <p>
            Most attendees will miss your session because they&apos;re in another track. Upload your deck and they can
            flip through it on their phones, ask questions on specific slides, and ask to follow up with you.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>
              <strong>Upload your slide deck saved as a PDF</strong> (in PowerPoint or Keynote: File → Export → PDF),
              one slide per page. A poster saved as a single-page PDF won&apos;t display well here.
            </li>
            <li>Easiest from a laptop, where your deck is.</li>
            <li>Optional and free. Upload a trimmed version if some slides shouldn&apos;t leave the room.</li>
            <li>Shared with {conferenceName} attendees on the conference site, not posted elsewhere.</li>
            <li>
              You can replace it or take it down at any time
              {liveUntilLabel ? `. It comes down automatically after ${liveUntilLabel} unless you extend it.` : "."}
            </li>
          </ul>
        </div>

        <form onSubmit={onSubmit} className="bg-white border rounded-xl p-5 space-y-4">
          {codeRequired && (
            <Field label="Presenter code" hint="From your acceptance email">
              <input
                value={presenterCode}
                onChange={(e) => setPresenterCode(e.target.value)}
                required
                autoComplete="off"
                autoCapitalize="none"
                className="input"
              />
            </Field>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Your name">
              <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className="input" />
            </Field>
            <Field label="Company or institution">
              <input
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                autoComplete="organization"
                className="input"
              />
            </Field>
          </div>

          <Field label="Email" hint="Not shown to attendees. Used only so you can get back to your talk.">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="input"
            />
          </Field>

          <Field label={`Slide deck as PDF (up to ${MAX_PDF_MB} MB)`}>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files?.[0]);
              }}
              className="cursor-pointer rounded-md border-2 border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-600 hover:border-blue-400 hover:bg-blue-50"
            >
              {file ? (
                <span className="font-medium text-gray-900">
                  {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              ) : (
                <>Drop your PDF here or click to choose</>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </Field>

          <Field label="Talk title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className="input" />
          </Field>

          <Field label="One-paragraph summary" hint="Optional. Helps attendees find your talk in search.">
            <textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              rows={4}
              className="input"
            />
          </Field>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
            <span>
              I&apos;m authorized to share this deck with {conferenceName} attendees, and I understand people who ask
              questions or request a follow-up will be identified to me by name. I agree to the{" "}
              <a href="/terms" target="_blank" className="text-blue-600 underline">terms</a> and{" "}
              <a href="/privacy" target="_blank" className="text-blue-600 underline">privacy</a> policy.
            </span>
          </label>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded p-2">{error}</div>}

          <button
            disabled={busy}
            className="w-full rounded-md bg-blue-600 text-white py-2.5 font-medium disabled:opacity-60"
          >
            {stage === "uploading" ? `Uploading… ${progress}%` : stage === "saving" ? "Publishing…" : "Publish my talk"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
