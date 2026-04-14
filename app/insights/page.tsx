import AdminGuard from "@/app/components/AdminGuard";
import InsightsPageClient from "./InsightsPageClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AdminGuard>
      <InsightsPageClient />
    </AdminGuard>
  );
}
