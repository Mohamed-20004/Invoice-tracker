import Link from "next/link";
import { logout } from "@/actions/auth";

// Every page in this group reads live DB data — never prerender at build.
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/invoices", label: "Invoices" },
  { href: "/payments", label: "Payments" },
  { href: "/review-queue", label: "Review queue" },
  { href: "/settings", label: "Settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-brand-800 text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap text-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="mr-2 shrink-0 font-bold sm:mr-4">🔧</span>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded px-3 py-2 hover:bg-brand-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="shrink-0">
            <button
              type="submit"
              className="rounded px-3 py-2 text-sm text-brand-100 hover:bg-brand-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-8">{children}</main>
    </div>
  );
}
