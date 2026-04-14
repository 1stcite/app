import AdminGuard from "@/app/components/AdminGuard";
import AdminPageClient from "./AdminPageClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AdminGuard>
      <AdminPageClient />
    </AdminGuard>
  );
}
