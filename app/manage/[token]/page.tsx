import ManageClient from "./ManageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your talk · 1stCite",
  robots: { index: false, follow: false },
};

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ManageClient access={{ kind: "token", token }} />;
}
