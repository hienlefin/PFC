import { redirect } from "next/navigation";

/** Multi-club SaaS UX removed — product is single PFC club. */
export default function ClubsRedirect() {
  redirect("/");
}
