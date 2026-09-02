import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import ImageCard from "@/components/ui/image-card";
import {
  ArrowRight,
  Briefcase,
  BedDouble,
  Trophy,
  BarChart3,
  Users,
  Check,
  Sparkles,
  Zap,
  Heart,
} from "lucide-react";

function MarqueeStrip() {
  const items = [
    "HUSTLE",
    "•",
    "HUMBLE",
    "•",
    "BALANCE",
    "•",
    "REPEAT",
    "•",
    "STAY PURRPOSEFUL",
    "•",
  ];
  // duplicate for seamless loop
  const row = [...items, ...items, ...items];
  return (
    <div className="relative flex w-full overflow-hidden border-y-2 border-border bg-[var(--color-accent)] text-foreground">
      <div className="flex animate-marquee whitespace-nowrap py-3">
        {row.map((it, i) => (
          <span
            key={`m1-${i}`}
            className="mx-3 text-sm font-heading font-black tracking-widest"
          >
            {it}
          </span>
        ))}
      </div>
      <div className="absolute top-0 flex animate-marquee2 whitespace-nowrap py-3">
        {row.map((it, i) => (
          <span
            key={`m2-${i}`}
            className="mx-3 text-sm font-heading font-black tracking-widest"
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-border bg-secondary-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="font-heading text-xl font-black tracking-tight"
        >
          PURRPOSE<span className="text-[var(--color-hustle)]">.</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-heading font-bold md:flex">
          <Link href="#about" className="hover:underline underline-offset-4">
            About
          </Link>
          <Link href="#how" className="hover:underline underline-offset-4">
            Cara Kerja
          </Link>
          <Link href="/leaderboard" className="hover:underline underline-offset-4">
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
            <Link href="#about">Pelajari</Link>
          </Button>
          <Button asChild className="bg-[var(--color-accent)] text-black hover:translate-x-boxShadowX hover:translate-y-boxShadowY">
            <Link href="/login">
              Login <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="bg-secondary-background">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          {/* left copy */}
          <div className="space-y-6">
            <Badge className="bg-[var(--color-accent)] text-black border-border px-3 py-1 text-xs font-black">
              <Sparkles className="mr-1 size-3" /> HUSTLE × HUMBLE — BALANCE FIRST
            </Badge>

            <h1 className="font-heading text-4xl font-black leading-[0.9] tracking-tight md:text-6xl">
              Seimbang
              <br />
              itu <span className="inline-block border-2 border-border bg-[var(--color-hustle)] px-2 text-white shadow-shadow">produktif</span>
              <span className="inline-block border-2 border-border bg-[var(--color-humble)] px-2 text-black shadow-shadow ml-2">.</span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-foreground/80">
              Purrpose bantu kamu track <b>Hustle</b> (kerja, belajar, build) dan{" "}
              <b>Humble</b> (istirahat, refleksi, recharge) — tanpa hukuman. Capai{" "}
              <span className="border-b-2 border-[var(--color-accent)] font-bold">
                Balance Index
              </span>{" "}
              tinggi, naik leaderboard kota-mu, koleksi badge mingguan.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-[var(--color-accent)] text-black border-border text-base font-black"
              >
                <Link href="/login">
                  Mulai Sekarang <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="neutral" size="lg" className="text-base font-bold">
                <Link href="#about">Pelajari konsep</Link>
              </Button>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1">
                <span className="size-2 bg-[var(--color-hustle)] border border-border" /> Non-punitive
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 bg-[var(--color-humble)] border border-border" /> Weekly reset
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 bg-[var(--color-accent)] border border-border" /> Kota-level rank
              </span>
            </div>
          </div>

          {/* right visual */}
          <div className="relative mx-auto w-full max-w-[420px] md:ml-auto">
            {/* stacked cards - neobrutalism */}
            <div className="relative">
              <Card className="relative z-10 border-[var(--color-hustle)] bg-secondary-background p-0 shadow-shadow rotate-[-1.5deg]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-[var(--color-hustle)]">
                      <Briefcase className="size-5" strokeWidth={2.5} /> HUSTLE
                    </CardTitle>
                    <Badge className="bg-[var(--color-hustle)] text-white border-border">4.2 pts</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between border-2 border-border bg-[var(--neo-gray-100)] p-2">
                    <span className="font-bold">Deep work — 2h</span>
                    <span className="flex items-center gap-1 text-xs font-black"><Check className="size-3" strokeWidth={2.5}/> DONE</span>
                  </div>
                  <div className="flex items-center justify-between border-2 border-border bg-white p-2">
                    <span className="font-bold">Belajar Next.js — 1.5h</span>
                    <span className="text-xs">Lv 3 •••○○</span>
                  </div>
                  <div className="h-2 border-2 border-border bg-white">
                    <div className="h-full w-[68%] bg-[var(--color-hustle)]" />
                  </div>
                  <p className="text-xs text-muted-foreground">Total hari ini: 3.5h • Skor 7.1</p>
                </CardContent>
              </Card>

              <Card className="absolute -bottom-6 -right-2 z-20 w-[88%] border-[var(--color-humble)] bg-secondary-background p-0 shadow-shadow rotate-[1.2deg] md:-right-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-[var(--color-humble)]">
                      <BedDouble className="size-5" strokeWidth={2.5} /> HUMBLE
                    </CardTitle>
                    <Badge className="bg-[var(--color-humble)] text-black border-border">3.8 pts</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between border-2 border-border bg-white p-2">
                    <span className="font-bold">Jalan santai — 1h</span>
                    <span className="flex items-center gap-1 text-xs font-black"><Check className="size-3" strokeWidth={2.5}/> DONE</span>
                  </div>
                  <div className="flex items-center justify-between border-2 border-border bg-[var(--neo-gray-100)] p-2 opacity-80">
                    <span className="font-bold">Journaling — 0.5h</span>
                    <span className="text-xs">Lv 2 ••○○○</span>
                  </div>
                  <div className="h-2 border-2 border-border bg-white">
                    <div className="h-full w-[52%] bg-[var(--color-humble)]" />
                  </div>
                  <p className="text-xs text-muted-foreground">Recovery seimbang — Balance 83/100</p>
                </CardContent>
              </Card>

              {/* floating accent */}
              <div className="absolute -top-4 -left-2 z-30 hidden border-2 border-border bg-[var(--color-accent)] px-3 py-2 font-heading text-xs font-black shadow-shadow md:block">
                BALANCE 83 • LEADERBOARD #3
              </div>
            </div>
            <div className="h-10 md:h-8" />
          </div>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="bg-background border-t-2 border-border">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="neutral" className="font-black">ABOUT — KENAPA PURRPOSE?</Badge>
            <h2 className="mt-3 font-heading text-3xl font-black leading-none md:text-4xl">
              Produktivitas tanpa <span className="bg-[var(--color-accent)] px-1 border-2 border-border">rasa bersalah.</span>
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-foreground/70">
            Task yang tidak selesai tidak mengurangi skor (non-punitive). Empty state mengajak, bukan menghakimi. Weekly report framing insight, bukan penilaian karakter — sesuai <b>DESIGN.md §8 microcopy</b>.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-secondary-background">
            <CardHeader>
              <div className="flex size-10 items-center justify-center border-2 border-border bg-[var(--color-hustle)] shadow-shadow">
                <Zap className="size-5 text-white" strokeWidth={2.5} />
              </div>
              <CardTitle className="text-xl">Hustle</CardTitle>
              <p className="text-sm text-foreground/70">Tekanan produktif — skor dari level × durasi, cap harian anti grind.</p>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-1 font-bold">
                <li className="flex gap-2"><Check className="size-4 shrink-0" strokeWidth={2.5}/> 5 level “Tekanan” (pip •••••)</li>
                <li className="flex gap-2"><Check className="size-4 shrink-0" strokeWidth={2.5}/> Durasi & tanggal harian</li>
                <li className="flex gap-2"><Check className="size-4 shrink-0" strokeWidth={2.5}/> Border rose #FF0052</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border bg-secondary-background">
            <CardHeader>
              <div className="flex size-10 items-center justify-center border-2 border-border bg-[var(--color-humble)] shadow-shadow">
                <Heart className="size-5 text-black" strokeWidth={2.5} />
              </div>
              <CardTitle className="text-xl">Humble</CardTitle>
              <p className="text-sm text-foreground/70">Recovery yang dihitung — tidur, jalan, journaling tetap bernilai.</p>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-1 font-bold">
                <li className="flex gap-2"><Check className="size-4 shrink-0" strokeWidth={2.5}/> 5 level “Relaksasi”</li>
                <li className="flex gap-2"><Check className="size-4 shrink-0" strokeWidth={2.5}/> Seimbang &gt; sempurna</li>
                <li className="flex gap-2"><Check className="size-4 shrink-0" strokeWidth={2.5}/> Border green #00C68D</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border bg-[var(--color-accent)] text-black">
            <CardHeader>
              <div className="flex size-10 items-center justify-center border-2 border-border bg-secondary-background shadow-shadow">
                <BarChart3 className="size-5" strokeWidth={2.5} />
              </div>
              <CardTitle className="text-xl">Balance Index</CardTitle>
              <p className="text-sm">Skor 0–100 mingguan. Indikator posisi di gauge rose↔green — makin tengah, makin seimbang.</p>
            </CardHeader>
            <CardContent>
              <div className="h-3 border-2 border-border bg-white">
                <div className="h-full w-[62%] bg-black" />
              </div>
              <div className="mt-2 flex justify-between text-xs font-black">
                <span>Hustle</span><span>62</span><span>Humble</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <ImageCard
            imageUrl="https://picsum.photos/seed/purr1/600/400"
            caption="Daily — checklist harian, 2 kolom Hustle/Humble (stack di mobile)."
            className="w-full rotate-[0.4deg]"
          />
          <ImageCard
            imageUrl="https://picsum.photos/seed/purr2/600/400"
            caption="Weekly — gauge balance + saran rule-based / AI Enhanced."
            className="w-full rotate-[-0.6deg]"
          />
          <ImageCard
            imageUrl="https://picsum.photos/seed/purr3/600/400"
            caption="Leaderboard — rank kota/provinsi, badge Gold/Silver/Bronze."
            className="w-full rotate-[0.3deg]"
          />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const slides = [
    {
      badge: "01 — DAILY",
      title: "Tambah task, tandai selesai",
      desc: "Pilih kategori, level 1–5 (pip), durasi jam. Selesaikan → skor level×durasi langsung masuk. Belum selesai = ‘Belum sempat’, bukan gagal.",
      icon: Briefcase,
      color: "var(--color-hustle)",
    },
    {
      badge: "02 — WEEKLY",
      title: "Lihat Balance 0–100",
      desc: "Report mingguan hitung balance index, total skor Hustle/Humble, dan saran perbaikan. Ada badge AI Enhanced jika saran dari LLM.",
      icon: BarChart3,
      color: "var(--color-accent)",
    },
    {
      badge: "03 — COMPETE",
      title: "Naik leaderboard kota",
      desc: "Leaderboard per kota (fallback provinsi). Top 3 pakai trophy/medal/award + warna accent/gray-100/info sesuai tier DESIGN.md §7.",
      icon: Trophy,
      color: "var(--color-info)",
    },
  ];

  return (
    <section id="how" className="bg-secondary-background border-t-2 border-border">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <h2 className="font-heading text-3xl font-black md:text-4xl">
            Cara kerja <span className="border-2 border-border bg-[var(--color-info)] px-2 text-white shadow-shadow">3 langkah.</span>
          </h2>
          <p className="max-w-md text-sm text-foreground/70">
            Flow konvensional (navigasi jelas, hierarchy standar) — neobrutalism hanya lapisan visual, bukan UX membingungkan.
          </p>
        </div>

        <Carousel className="mt-8" opts={{ align: "start" }}>
          <CarouselContent>
            {slides.map((s) => (
              <CarouselItem key={s.badge} className="md:basis-1/2 lg:basis-1/3">
                <Card className="h-full border-border bg-background">
                  <CardHeader>
                    <Badge className="w-fit border-border bg-white text-black font-black">{s.badge}</Badge>
                    <div
                      className="mt-3 flex size-12 items-center justify-center border-2 border-border shadow-shadow"
                      style={{ background: s.color }}
                    >
                      <s.icon className="size-6 text-white" strokeWidth={2.5} style={{ color: s.color === "var(--color-accent)" || s.color === "var(--color-humble)" ? "black" : "white" }} />
                    </div>
                    <CardTitle className="text-xl leading-tight">{s.title}</CardTitle>
                    <p className="text-sm leading-relaxed text-foreground/70">{s.desc}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-border bg-white p-3 text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <Users className="size-4" strokeWidth={2.5} />
                        Grup: Jakarta • Rank #3 • Skor 42.1
                      </div>
                      <div className="mt-2 h-2 border border-border bg-[var(--neo-gray-100)]">
                        <div className="h-full bg-black" style={{ width: s.badge === "01 — DAILY" ? "70%" : s.badge === "02 — WEEKLY" ? "62%" : "88%" }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>

        <div className="mt-6 flex justify-center md:hidden">
          <p className="text-xs font-bold tracking-widest">← geser untuk lihat →</p>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-background border-t-2 border-border">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <Card className="border-2 border-border bg-[var(--color-accent)] p-0 shadow-shadow">
          <CardContent className="p-6 md:p-10">
            <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div>
                <h3 className="font-heading text-3xl font-black leading-none md:text-4xl">
                  Siap seimbang hari ini?
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed">
                  Daftar, atur kota & timezone, tambah 1 Hustle + 1 Humble. Lihat balance Index-mu minggu ini. Gratis, tanpa hukuman.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="bg-black text-white border-black font-black hover:bg-black">
                    <Link href="/login">Masuk / Daftar <ArrowRight className="size-4" /></Link>
                  </Button>
                  <Button asChild variant="neutral" size="lg" className="font-bold bg-white">
                    <Link href="#about">Pelajari lagi</Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-border bg-white p-3 shadow-shadow">
                  <div className="text-xs font-black">HARI INI</div>
                  <div className="mt-1 font-heading text-2xl font-black">3 tugas</div>
                  <div className="text-xs">2 Hustle • 1 Humble</div>
                </div>
                <div className="border-2 border-border bg-black p-3 text-white shadow-shadow">
                  <div className="text-xs font-black">STREAK</div>
                  <div className="mt-1 font-heading text-2xl font-black">5 hari</div>
                  <div className="text-xs">Tetap seimbang!</div>
                </div>
                <div className="col-span-2 border-2 border-border bg-secondary-background p-3 shadow-shadow">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span>BALANCE</span><span>83/100</span>
                  </div>
                  <div className="mt-2 h-3 border-2 border-border bg-white">
                    <div className="h-full w-[83%] bg-[var(--color-humble)]" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-2 border-border bg-secondary-background">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
          <div className="font-heading font-black">PURRPOSE — Track hustle & humble.</div>
          <div className="flex gap-4 text-xs font-bold">
            <Link href="#about" className="hover:underline">About</Link>
            <Link href="#how" className="hover:underline">Cara Kerja</Link>
            <Link href="/login" className="hover:underline">Login</Link>
            <Link href="/home" className="hover:underline">App</Link>
          </div>
        </div>
        <p className="mt-3 text-xs text-foreground/60">
          © {new Date().getFullYear()} Purrpose. Built with neobrutalism • Border 2px • Hard shadow — sesuai DESIGN.md.
        </p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-secondary-background text-foreground">
      <Nav />
      <Hero />
      <MarqueeStrip />
      <About />
      <HowItWorks />
      <FinalCTA />
      <Footer />
    </div>
  );
}
