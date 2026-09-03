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
import Marquee from "@/components/ui/marquee";

function MarqueeStrip() {
  const items = [
    "HUSTLE • ",
    "HUMBLE • ",
    "BALANCE • ",
    "REPEAT • ",
    "STAY PURRPOSEFUL • ",
  ];
  return <Marquee items={items} />;
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-border bg-secondary-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="font-heading text-xl font-black tracking-tight"
        >
          PURRPOSE<span className="text-hustle">.</span>
        </Link>
        <nav className="hidden items-center gap-6 font-heading font-bold md:flex">
          <Link href="#about" className="hover:underline underline-offset-4">
            About
          </Link>
          <Link href="#how" className="hover:underline underline-offset-4">
            How it works
          </Link>
          <Link
            href="/leaderboard"
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
            <Link href="#about">Pelajari</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-accent text-black hover:translate-x-boxShadowX hover:translate-y-boxShadowY"
          >
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
            <Badge className="bg-accent text-black border-border px-3 py-1 text-xs font-black">
              <Sparkles className="mr-1 size-3" /> BALANCE = HUSTLE × HUMBLE
            </Badge>

            <h1 className="font-heading text-4xl font-black leading-[0.9] tracking-tight md:text-6xl">
              Balance Ur Day,
              <br />
              Get{" "}
              <span className="inline-block border-2 border-border bg-hustle px-2 text-white shadow-shadow">
                Productive.
              </span>
              <span className="inline-block border-2 border-border bg-humble px-2 text-black shadow-shadow ml-2">
                .
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-foreground/80">
              Purrpose helps u to track{" "}
              <span className="border-b-2 border-accent font-bold">Hustle</span>{" "}
              (work, study, build) and{" "}
              <span className="border-b-2 border-accent font-bold">Humble</span>{" "}
              (rest, reflection, recharge) without punishment. Get highest{" "}
              <span className="border-b-2 border-accent font-bold">
                Balance Index
              </span>{" "}
              , climb ur leaderboard, claim ur badge.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-accent text-black border-border text-base font-black"
              >
                <Link href="/login">
                  Start Now <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="neutral"
                size="lg"
                className="text-base font-bold"
              >
                <Link href="#about">Learn the concept</Link>
              </Button>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1">
                <span className="size-2 bg-hustle border border-border" />{" "}
                Non-punitive
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 bg-humble border border-border" />{" "}
                Weekly reset
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 bg-accent border border-border" />{" "}
                Kota-level rank
              </span>
            </div>
          </div>

          {/* right visual */}
          <div className="relative mx-auto w-full max-w-105 md:ml-auto">
            {/* stacked cards - neobrutalism */}
            <div className="relative">
              <Card className="relative z-10 border-hustle bg-secondary-background p-0 shadow-shadow rotate-[-1.5deg]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-hustle">
                      <Briefcase className="size-5" strokeWidth={2.5} /> HUSTLE
                    </CardTitle>
                    <Badge className="bg-hustle text-white border-border">
                      4.2 pts
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between border-2 border-border bg-(--neo-gray-100) p-2">
                    <span className="font-bold">Deep work - 2h</span>
                    <span className="flex items-center gap-1 text-xs font-black">
                      <Check className="size-3" strokeWidth={2.5} /> DONE
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-2 border-border bg-white p-2">
                    <span className="font-bold">Learn Next.js - 1.5h</span>
                    <span className="text-xs">Lv 3 •••○○</span>
                  </div>
                  <div className="h-2 border-2 border-border bg-white">
                    <div className="h-full w-[68%] bg-hustle" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Today's total: 3.5h • Score 7.1
                  </p>
                </CardContent>
              </Card>

              <Card className="absolute -bottom-6 -right-2 z-20 w-[88%] border-humble bg-secondary-background p-0 shadow-shadow rotate-[1.2deg] md:-right-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-humble">
                      <BedDouble className="size-5" strokeWidth={2.5} /> HUMBLE
                    </CardTitle>
                    <Badge className="bg-humble text-black border-border">
                      3.8 pts
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between border-2 border-border bg-white p-2">
                    <span className="font-bold">Chill walk - 1h</span>
                    <span className="flex items-center gap-1 text-xs font-black">
                      <Check className="size-3" strokeWidth={2.5} /> DONE
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-2 border-border bg-(--neo-gray-100) p-2 opacity-80">
                    <span className="font-bold">Journaling - 0.5h</span>
                    <span className="text-xs">Lv 2 ••○○○</span>
                  </div>
                  <div className="h-2 border-2 border-border bg-white">
                    <div className="h-full w-[52%] bg-humble" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Balance recovery : Score 83/100
                  </p>
                </CardContent>
              </Card>

              {/* floating accent */}
              <div className="absolute -top-4 -left-2 z-30 hidden border-2 border-border bg-accent px-3 py-2 font-heading text-xs font-black shadow-shadow md:block">
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
            <Badge variant="neutral" className="font-black">
              ABOUT : WHY IS PURRPOSE?
            </Badge>
            <h2 className="mt-3 font-heading text-3xl font-black leading-none md:text-4xl">
              Balance productivity without{" "}
              <span className="bg-accent px-1 border-2 border-border">
                guilt.
              </span>
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-foreground/70">
            Unfinished task is fine. Empty state is inviting, not judging.
            Weekly report framing insight, not character assessment.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-secondary-background">
            <CardHeader>
              <div className="flex size-10 items-center justify-center border-2 border-border bg-hustle shadow-shadow">
                <Zap className="size-5 text-white" strokeWidth={2.5} />
              </div>
              <CardTitle className="text-xl">Hustle</CardTitle>
              <p className="text-sm text-foreground/70">
                Productive pressure : score from level × duration, daily cap
                anti grind.
              </p>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-1 font-bold">
                <li className="flex gap-2">
                  <Check className="size-4 shrink-0" strokeWidth={2.5} /> 5
                  Level “Pressure”
                </li>
                <li className="flex gap-2">
                  <Check className="size-4 shrink-0" strokeWidth={2.5} />{" "}
                  Duration & Date
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border bg-secondary-background">
            <CardHeader>
              <div className="flex size-10 items-center justify-center border-2 border-border bg-humble shadow-shadow">
                <Heart className="size-5 text-black" strokeWidth={2.5} />
              </div>
              <CardTitle className="text-xl">Humble</CardTitle>
              <p className="text-sm text-foreground/70">
                Easy calculated recovery : sleep, read, walk, journaling, etc.
              </p>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-1 font-bold">
                <li className="flex gap-2">
                  <Check className="size-4 shrink-0" strokeWidth={2.5} /> 5
                  Level “Relaxation”
                </li>
                <li className="flex gap-2">
                  <Check className="size-4 shrink-0" strokeWidth={2.5} />{" "}
                  Balance &gt; purrfect
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border bg-accent text-black">
            <CardHeader>
              <div className="flex size-10 items-center justify-center border-2 border-border bg-secondary-background shadow-shadow">
                <BarChart3 className="size-5" strokeWidth={2.5} />
              </div>
              <CardTitle className="text-xl">Balance Index</CardTitle>
              <p className="text-sm">
                0-100 weekly score. Balance indicator: The closer to the center,
                the better.
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-3 border-2 border-border bg-humble">
                <div className="h-full w-[62%] bg-hustle border-r-2 border-border" />
              </div>
              <div className="mt-2 flex justify-between text-xs font-black">
                <span>Hustle</span>
                <span>62</span>
                <span>Humble</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <ImageCard
            imageUrl="https://picsum.photos/seed/purr1/600/400"
            caption="Daily checklist, 2 stacks of ur Hustle/Humble."
            className="w-full rotate-[0.4deg]"
          />
          <ImageCard
            imageUrl="https://picsum.photos/seed/purr2/600/400"
            caption="Weekly gauge balance + rule-based / AI enhanced advice."
            className="w-full rotate-[-0.6deg]"
          />
          <ImageCard
            imageUrl="https://picsum.photos/seed/purr3/600/400"
            caption="Leaderboard : ur city rank, badge Gold/Silver/Bronze."
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
      badge: "01 - DAILY",
      title: "Add task, mark as done",
      desc: "Choose category, level 1-5, duration in hours. Complete → score level×duration directly added. Incomplete = ‘Have no time’, not failed.",
      icon: Briefcase,
      color: "var(--color-hustle)",
    },
    {
      badge: "02 - WEEKLY",
      title: "View Balance 0-100",
      desc: "Weekly report calculates balance index, total Hustle/Humble scores, and improvement suggestions with AI enhancement.",
      icon: BarChart3,
      color: "var(--color-accent)",
    },
    {
      badge: "03 - COMPETE",
      title: "Climb the leaderboard",
      desc: "Leaderboard per city. Balance ur day and compete with users. Top 3 get a badge to collect and share.",
      icon: Trophy,
      color: "var(--color-info)",
    },
  ];

  return (
    <section
      id="how"
      className="bg-secondary-background border-t-2 border-border"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <h2 className="font-heading text-3xl font-black md:text-4xl">
            Start Purrpose with{" "}
            <span className="border-2 border-border bg-info px-2 text-white shadow-shadow">
              Only 3 Steps.
            </span>
            ``
          </h2>
          <p className="max-w-md text-sm text-foreground/70">
            Conventional flow (clear navigation, standard hierarchy),
            gamification is just an approach, not to confuse.
          </p>
        </div>

        <Carousel className="mt-8" opts={{ align: "start" }}>
          <CarouselContent>
            {slides.map((s) => (
              <CarouselItem key={s.badge} className="md:basis-1/2 lg:basis-1/3">
                <Card className="h-full border-border bg-background">
                  <CardHeader>
                    <Badge className="w-fit border-border bg-white text-black font-black">
                      {s.badge}
                    </Badge>
                    <div
                      className="mt-3 flex size-12 items-center justify-center border-2 border-border shadow-shadow"
                      style={{ background: s.color }}
                    >
                      <s.icon
                        className="size-6 text-white"
                        strokeWidth={2.5}
                        style={{
                          color:
                            s.color === "var(--color-accent)" ||
                            s.color === "var(--color-humble)"
                              ? "black"
                              : "white",
                        }}
                      />
                    </div>
                    <CardTitle className="text-xl leading-tight">
                      {s.title}
                    </CardTitle>
                    <p className="text-sm leading-relaxed text-foreground/70">
                      {s.desc}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-border bg-white p-3 text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <Users className="size-4" strokeWidth={2.5} />
                        Group: Jakarta • Rank #3 • Score 42.1
                      </div>
                      <div className="mt-2 h-2 border border-border bg-(--neo-gray-100)">
                        <div
                          className="h-full bg-black"
                          style={{
                            width:
                              s.badge === "01 — DAILY"
                                ? "70%"
                                : s.badge === "02 — WEEKLY"
                                  ? "62%"
                                  : "88%",
                          }}
                        />
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
          <p className="text-xs font-bold tracking-widest">← Swipe to see →</p>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-background border-t-2 border-border">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <Card className="border-2 border-border bg-accent p-0 shadow-shadow">
          <CardContent className="p-6 md:p-10">
            <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div>
                <h3 className="font-heading text-3xl font-black leading-none md:text-4xl">
                  Ready to balance today?
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed">
                  Sign up, set your city & timezone, add 1 Hustle + 1 Humble.
                  See your balance index this week. Free, no penalties.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="bg-info text-white border-black font-black"
                  >
                    <Link href="/login">
                      Login / Register <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="neutral"
                    size="lg"
                    className="font-bold bg-white"
                  >
                    <Link href="#about">Learn more</Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-border bg-humble p-3 shadow-shadow">
                  <div className="text-xs font-black">TODAY</div>
                  <div className="mt-1 font-heading text-2xl font-black">
                    3 TASKS
                  </div>
                  <div className="text-xs">2 Hustles • 1 Humble</div>
                </div>
                <div className="border-2 border-border bg-hustle p-3 text-white shadow-shadow">
                  <div className="text-xs font-black">STREAK</div>
                  <div className="mt-1 font-heading text-2xl font-black">
                    5 DAYS
                  </div>
                  <div className="text-xs">Stay balanced!</div>
                </div>
                <div className="col-span-2 border-2 border-border bg-secondary-background p-3 shadow-shadow">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span>BALANCE</span>
                    <span>83/100</span>
                  </div>
                  <div className="mt-2 h-3 border-2 border-border bg-hustle">
                    <div className="h-full w-[83%] bg-humble" />
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
            <Link href="/login" className="hover:underline">
              Login
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
