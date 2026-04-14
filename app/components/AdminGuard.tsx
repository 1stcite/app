import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";

/**
 * Server component that checks the session and redirects non-admins.
 * Wrap admin-only pages in this. The view-mode toggle does NOT affect
 * this check — view mode is purely about which UI to show on public pages,
 * not about access to admin routes.
 */
export default async function AdminGuard({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (!user.isAdmin) {
    redirect("/?error=admin-required");
  }
  return <>{children}</>;
}
