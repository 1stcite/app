import AdminGuard from "@/app/components/AdminGuard";
import PresentersAdminClient from "./PresentersAdminClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AdminGuard>
      <PresentersAdminClient />
    </AdminGuard>
  );
}
