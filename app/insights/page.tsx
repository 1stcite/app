import AdminGuard from "@/app/components/AdminGuard";
import { getRequestSubdomain } from "@/app/lib/guards";
import InsightsPageClient from "./InsightsPageClient";
import IaprdInsightsClient from "./IaprdInsightsClient";

export const dynamic = "force-dynamic";

// IAPRD keeps its original insights mockup (physician / neuroscientist
// segments) for its demo; every other conference gets the organizer view.
export default async function Page() {
  const subdomain = await getRequestSubdomain();
  return <AdminGuard>{subdomain === "iaprd" ? <IaprdInsightsClient /> : <InsightsPageClient />}</AdminGuard>;
}
