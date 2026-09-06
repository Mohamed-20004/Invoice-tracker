import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/session";

// Middleware already gates page navigation; this re-checks inside mutating
// server actions so they can't be invoked without a valid session.
export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}
