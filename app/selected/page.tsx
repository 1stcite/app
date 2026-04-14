import { redirect } from "next/navigation";

export default function SelectedRedirect() {
  redirect("/my-talks");
}
