import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b-2 border-border bg-secondary-background">
        <nav className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
          <Link href="/home" className="font-heading text-xl font-black">
            PURRPOSE
          </Link>
          <div className="flex items-center gap-4 text-sm font-base">
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
            <Link href="/profile" className="hover:underline underline-offset-4">
              Profile
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl p-4 md:p-6">{children}</main>
    </div>
  );
}
