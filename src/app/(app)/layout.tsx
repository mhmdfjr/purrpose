import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { UserMenu } from "@/components/UserMenu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasAdminCred =
    !!process.env.FIREBASE_SERVICE_ACCOUNT ||
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const user = await getCurrentUser();
  if (!user) {
    // Local dev without Admin credential: skip SSR redirect, let client AuthContext handle (avoids loop when sessionSkipped)
    if (process.env.NODE_ENV !== "production" && !hasAdminCred) {
      console.warn(
        "[AppLayout] skipping SSR redirect — no Admin credential for local dev (sessionSkipped)",
      );
    } else {
      redirect("/login");
    }
  }
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b-2 border-border bg-secondary-background">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3">
          <Link
            href="/home"
            className="font-heading text-xl font-black tracking-tight"
          >
            PURRPOSE<span className="text-[var(--color-hustle)]">.</span>
          </Link>
          <nav className="hidden items-center gap-6 font-heading font-bold md:flex">
            <Link href="/home" className="hover:underline underline-offset-4">
              Home
            </Link>
            <Link href="/report" className="hover:underline underline-offset-4">
              Report
            </Link>
            <Link
              href="/leaderboard"
              className="hover:underline underline-offset-4"
            >
              Leaderboard
            </Link>
            <Link
              href="/profile"
              className="hover:underline underline-offset-4"
            >
              Profile
            </Link>
            <UserMenu />
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
