import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/home");
  }
  return (
    <div className="min-h-screen flex flex-col bg-secondary-background">
      <header className="sticky top-0 z-50 border-b-2 border-border bg-secondary-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="font-heading text-xl font-black tracking-tight"
          >
            PURRPOSE<span className="text-[var(--color-hustle)]">.</span>
          </Link>
          <nav className="hidden items-center gap-6 font-heading font-bold md:flex">
            <Link href="/#about" className="hover:underline underline-offset-4">
              About
            </Link>
            <Link href="/#how" className="hover:underline underline-offset-4">
              How it works
            </Link>
            <Link
              href="/#leaderboard"
              className="hover:underline underline-offset-4"
            >
              Leaderboard
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="neutral"
              size="sm"
              asChild
              className="hidden sm:inline-flex"
            >
              <Link href="/">Home</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-[var(--color-accent)] text-black hover:translate-x-boxShadowX hover:translate-y-boxShadowY"
            >
              <Link href="/register">
                Register <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4 md:p-8 bg-background">
        {children}
      </main>
      <footer className="border-t-2 border-border bg-secondary-background">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
            <div className="font-heading font-black">
              PURRPOSE: Track Hustle & Humble.
            </div>
            <div className="flex gap-4 text-xs font-bold">
              <Link href="#about" className="hover:underline">
                About
              </Link>
              <Link href="#how" className="hover:underline">
                How it works
              </Link>
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <Link href="/home" className="hover:underline">
                App
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
