import { Suspense } from "react";
import { getRequestConference, defaultLiveUntil } from "@/app/lib/guards";
import PresentClient from "./PresentClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Share your talk · 1stCite" };

export default async function PresentPage() {
  const conf = await getRequestConference().catch(() => null);
  // Open by default for any conference; organizers can close it or add a code.
  const open = Boolean(conf) && conf?.presenterUploadsOpen !== false;
  const liveUntil = defaultLiveUntil(conf);

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <PresentClient
        conferenceName={conf?.name ?? "1stCite"}
        logo={conf?.logo ?? "/1stcite-logo.png"}
        open={open}
        codeRequired={Boolean(conf?.presenterCode)}
        liveUntilLabel={
          liveUntil
            ? liveUntil.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
            : null
        }
      />
    </Suspense>
  );
}
