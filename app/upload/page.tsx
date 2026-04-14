import AdminGuard from "@/app/components/AdminGuard";
import UploadPageClient from "./UploadPageClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AdminGuard>
      <UploadPageClient />
    </AdminGuard>
  );
}
