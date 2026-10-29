import ManageClient from "@/app/manage/[token]/ManageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Presenter view · 1stCite",
  robots: { index: false, follow: false },
};

export default async function PresenterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ManageClient access={{ kind: "session", id }} />;
}
