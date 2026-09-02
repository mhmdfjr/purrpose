import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

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
      <header className="border-b-2 border-border bg-secondary-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-heading text-xl font-black tracking-tight">
            PURRPOSE<span className="text-[var(--color-hustle)]">.</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-heading font-bold hover:underline underline-offset-4"
          >
            ← Kembali ke landing
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4 md:p-8 bg-background">
        {children}
      </main>
      <footer className="border-t-2 border-border bg-secondary-background py-4 text-center text-xs font-bold">
        © {new Date().getFullYear()} Purrpose • Border 2px • Hard shadow
      </footer>
    </div>
  );
}
