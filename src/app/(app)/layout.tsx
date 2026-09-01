import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { UserMenu } from "@/components/UserMenu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const hasAdminCred = !!process.env.FIREBASE_SERVICE_ACCOUNT || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const user = await getCurrentUser();
  if (!user) {
    // Local dev without Admin credential: skip SSR redirect, let client AuthContext handle (avoids loop when sessionSkipped)
    if (process.env.NODE_ENV !== "production" && !hasAdminCred) {
      console.warn("[AppLayout] skipping SSR redirect — no Admin credential for local dev (sessionSkipped)");
    } else {
      redirect("/login");
    }
  }
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b-2 border-border bg-secondary-background">
        <nav className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3">
          <Link href="/home" className="font-heading text-xl font-black shrink-0">
            PURRPOSE
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 text-sm font-base flex-wrap justify-end">
            <Link href="/home" className="hover:underline underline-offset-4 px-1">
              Home
            </Link>
            <Link href="/report" className="hover:underline underline-offset-4 px-1">
              Report
            </Link>
            <Link href="/leaderboard" className="hover:underline underline-offset-4 px-1">
              Leaderboard
            </Link>
            <Link href="/profile" className="hover:underline underline-offset-4 px-1">
              Profile
            </Link>
            <UserMenu />
          </div>
        </nav>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl p-4 md:p-6">{children}</main>
    </div>
  );
}
