import AdminGuard from "@/app/components/AdminGuard";
import EditPageClient from "./EditPageClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AdminGuard>
      <EditPageClient />
    </AdminGuard>
  );
}
