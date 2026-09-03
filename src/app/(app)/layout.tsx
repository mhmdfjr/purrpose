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
            PURRPOSE<span className="text-hustle">.</span>
            <span className="text-humble">.</span>
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

      {children}

      <footer className="border-t-2 border-border bg-secondary-background">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
            <div className="font-heading font-black">
              PURRPOSE: Track Hustle & Humble.
            </div>
            <div className="flex gap-4 text-xs font-bold">
              <Link href="/home" className="hover:underline">
                Home
              </Link>
              <Link href="/report" className="hover:underline">
                Report
              </Link>
              <Link href="/leaderboard" className="hover:underline">
                Leaderboard
              </Link>
              <Link href="/profile" className="hover:underline">
                Profile
              </Link>
            </div>
          </div>
          <p className="mt-3 text-xs text-foreground/60">
            © {new Date().getFullYear()} Purrpose. Built with Luv by Mr. Sun.
          </p>
        </div>
      </footer>
    </div>
  );
}
