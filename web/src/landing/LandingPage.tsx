// Landing page at "/" (round 6): the stand banner. Says "food ordering" + "undo" in one second.
// Laptop first (the hero fits one screen at 1280×800 and 1440×900), fully responsive on a phone.
// Only sound: a tap on button presses. No emojis. Never names or shows the real delivery app.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PAGE } from "@shared/api";
import { Doodles, Icon, Mascot, sound, type IconName, type Pose } from "../ui";
import { LogoMarquee } from "../buyer/logos";
import { Logo } from "../buyer/ui";

const QR_SRC = "/img/qr-join.svg";

/** Section content flows in when it scrolls into view. */
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`${shown ? "ui-flow-in" : "opacity-0"} ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** A link styled as a button. Tap sound on press, springy press. */
function LinkButton({ href, children, primary = false, big = false, className = "" }: { href: string; children: ReactNode; primary?: boolean; big?: boolean; className?: string }) {
  return (
    <a
      href={href}
      onClick={() => sound.tap()}
      className={`ui-press inline-flex items-center justify-center gap-2 rounded-card font-bold ${big ? "h-16 px-8 text-[20px]" : "h-12 px-5 text-body"} ${
        primary ? "bg-forest text-white" : "border-2 border-forest bg-white text-forest"
      } ${className}`}
    >
      {children}
    </a>
  );
}

/** The verified QR code to /join. Always on white, never recoloured or cropped. */
function QrCard({ big }: { big: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-[28px] bg-white shadow-xl ring-1 ring-line ${big ? "p-7" : "p-5"}`}>
      <img
        src={QR_SRC}
        alt="QR code: opens Ctrl+Z Eats to grab cheap food near campus"
        draggable={false}
        className={big ? "aspect-square w-[240px] lg:w-[clamp(260px,38vh,340px)]" : "aspect-square w-[170px]"}
        style={{ imageRendering: "pixelated" }}
      />
      <p className={`mt-4 max-w-[260px] text-center font-semibold text-ink lg:max-w-none ${big ? "text-body lg:text-h3" : "max-w-[200px] text-small lg:max-w-[200px]"}`}>
        <Icon name="phone" size={big ? 22 : 16} className="mr-1.5 -mt-1 align-middle text-forest" />
        Scan to grab cheap food near campus
      </p>
    </div>
  );
}

/** One line at a time, crossfading every ~2.5 s. */
function RotatingLine({ lines }: { lines: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), 2500);
    return () => clearInterval(t);
  }, [lines.length]);
  return (
    <p className="relative min-h-[3.5rem] text-h3 font-medium text-stone sm:min-h-[2rem]" aria-live="polite">
      <span key={i} className="ui-fade-in block">
        {lines[i]}
      </span>
    </p>
  );
}

function AudienceCard(props: {
  label: string;
  pose: Pose;
  title: string;
  lines: string[];
  punch: string;
  cta: string;
  href: string;
  tint: boolean;
}) {
  return (
    <div className={`relative isolate h-full overflow-hidden rounded-[28px] p-7 sm:p-9 ${props.tint ? "bg-mint" : "bg-white ring-1 ring-line"}`}>
      <div className="absolute inset-0 -z-10">
        <Doodles variant="food" tone={props.tint ? "forest" : "ink"} opacity={0.05} drift={false} />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-small font-bold tracking-wide text-forest uppercase">{props.label}</p>
          <h2 className="mt-2 text-[34px] leading-tight font-bold text-ink sm:text-[40px]">{props.title}</h2>
        </div>
        <Mascot pose={props.pose} motion="bob" size={120} className="shrink-0" />
      </div>
      <div className="mt-4">
        <RotatingLine lines={props.lines} />
      </div>
      <p className="mt-4 text-h3 font-bold text-forest">{props.punch}</p>
      <LinkButton href={props.href} primary className="mt-6">
        {props.cta}
        <Icon name="arrowRight" size={20} />
      </LinkButton>
    </div>
  );
}

const STEPS: { n: number; pose: Pose; icon: IconName; title: string; text: string }[] = [
  { n: 1, pose: "pointing", icon: "undo", title: "Tap Ctrl+Z", text: "on an order that's already cooking." },
  { n: 2, pose: "thinking", icon: "sparkle", title: "Zee, our AI agent, prices it", text: "and writes the listing." },
  { n: 3, pose: "thumbsup", icon: "trendDown", title: "The price drops live", text: "Students nearby get pinged." },
  { n: 4, pose: "jumping", icon: "bag", title: "First tap wins", text: "pays, and picks it up at the counter with a new code." },
];

const LINES: { icon: IconName; text: string }[] = [
  { icon: "undo", text: "You can't cancel once it's cooking. With us, you can Ctrl+Z it." },
  { icon: "store", text: "The buyer collects at the counter, so the food never passes between strangers." },
  { icon: "clock", text: "The listing timer follows Health Canada's food safety guidance." },
];

const GOOD: { icon: IconName; who: string; what: string }[] = [
  { icon: "user", who: "Seller", what: "Money back" },
  { icon: "bag", who: "Buyer", what: "A fresh meal for less" },
  { icon: "store", who: "Restaurant", what: "No wasted order" },
  { icon: "leaf", who: "Planet", what: "No food in the trash" },
];

export function LandingPage() {
  return (
    <main className="bg-white text-ink">
      {/* 1. Hero: the stand banner. One screen on a laptop. */}
      <section className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-mint via-mint/60 to-white">
        <div className="absolute inset-0 -z-10">
          <Doodles variant="food" tone="forest" opacity={0.07} />
        </div>

        <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-5 pt-6 sm:px-10 lg:pt-8">
          <div className="ui-flow-in inline-flex self-start rounded-2xl bg-white/90 px-3 py-2 shadow-sm">
            <Logo height={52} />
          </div>

          <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1.35fr_1fr] lg:gap-14 lg:py-4">
            <div className="min-w-0">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
                {/* The kit Mascot sets its own display, so the size switch lives on a wrapper. */}
                <span className="ui-pop-in shrink-0 lg:hidden">
                  <Mascot pose="waving" motion="bob" size={140} />
                </span>
                <span className="ui-pop-in hidden shrink-0 lg:block">
                  <Mascot pose="waving" motion="bob" size={190} />
                </span>
                <h1 className="ui-flow-in ui-delay-1 text-[44px] leading-[1.02] font-bold tracking-tight text-ink sm:text-[60px] lg:text-[clamp(56px,8vh,80px)]">
                  Undo your food order.
                </h1>
              </div>
              <p className="ui-flow-in ui-delay-2 mt-6 max-w-[620px] text-[18px] leading-relaxed text-ink/80 sm:text-[21px]">
                Ordered food you can't cancel anymore? Ctrl+Z it. Someone near campus gets it fresh, for less, and you get money back.
              </p>
              <div className="ui-flow-in ui-delay-3 mt-8 flex flex-wrap items-center gap-4">
                <LinkButton href="/demo" primary big className="ui-pulse-ring">
                  Try it now
                  <Icon name="arrowRight" size={24} />
                </LinkButton>
                <LinkButton href={PAGE.join} big>
                  Get food for less
                </LinkButton>
              </div>
            </div>

            <div className="ui-flow-in ui-delay-2 flex justify-center lg:justify-end">
              <QrCard big />
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1240px] px-5 pb-6 sm:px-10">
          <LogoMarquee copies={6} />
        </div>
      </section>

      {/* 2. Two audiences, two slogans. */}
      <section className="mx-auto grid max-w-[1240px] gap-6 px-5 py-16 sm:px-10 md:grid-cols-2 lg:py-24">
        <Reveal>
          <AudienceCard
            tint
            label="For you, if you regret an order"
            pose="thinking"
            title="Regret your order?"
            lines={["Can't cancel, it's already cooking?", "Plans changed? Can't pick it up anymore?", "Ordered way too much?", "Friend invited you to lunch?"]}
            punch="Ctrl+Z it. Get part of your money back in minutes."
            cta="See the seller side"
            href="/demo"
          />
        </Reveal>
        <Reveal delay={120}>
          <AudienceCard
            tint={false}
            label="For you, if you're hungry"
            pose="bag"
            title="Want cheaper food?"
            lines={["Fresh meals near campus, up to 70% off.", "No delivery fees. No service fees.", "Get pinged when the price drops under your max."]}
            punch="First tap wins. Pick it up at the counter."
            cta="Get food for less"
            href={PAGE.join}
          />
        </Reveal>
      </section>

      {/* 3. How it works + why it's good. */}
      <section className="bg-mint/50 py-16 lg:py-24">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-10">
          <Reveal>
            <h2 className="text-[34px] font-bold text-ink sm:text-[44px]">How it works</h2>
          </Reveal>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, k) => (
              <li key={s.n}>
                <Reveal delay={k * 110} className="h-full">
                  <div className="flex h-full flex-col items-center rounded-[24px] bg-white p-6 text-center shadow-sm ring-1 ring-line">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest font-mono font-bold text-white">{s.n}</span>
                    <Mascot pose={s.pose} motion="bob" size={120} className="mt-3" />
                    <p className="mt-3 text-h3 font-bold text-ink">
                      <Icon name={s.icon} size={20} className="mr-1.5 -mt-1 align-middle text-forest" />
                      {s.title}
                    </p>
                    <p className="mt-1 text-stone">{s.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {LINES.map((l, k) => (
              <Reveal key={l.text} delay={k * 110} className="h-full">
                <div className="flex h-full items-start gap-4 rounded-[24px] bg-white p-6 ring-1 ring-line">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint text-forest">
                    <Icon name={l.icon} size={22} />
                  </span>
                  <p className="text-h3 leading-snug font-semibold text-ink">{l.text}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-16">
            <h2 className="text-[30px] font-bold text-ink sm:text-[36px]">Good for everyone</h2>
          </Reveal>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {GOOD.map((g, k) => (
              <Reveal key={g.who} delay={k * 90} className="h-full">
                <div className="flex h-full items-center gap-3 rounded-[20px] bg-white p-5 ring-1 ring-line">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest text-white">
                    <Icon name={g.icon} size={22} />
                  </span>
                  <div>
                    <p className="font-bold text-ink">{g.who}</p>
                    <p className="text-small text-stone">{g.what}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Footer: the QR again (smaller). */}
      <footer className="mx-auto flex max-w-[1240px] flex-col items-center gap-8 px-5 py-14 sm:px-10 md:flex-row md:justify-between">
        <div className="flex flex-col items-center gap-5 md:items-start">
          <Logo height={44} />
          <LinkButton href="/demo" primary big>
            Try it now
            <Icon name="arrowRight" size={24} />
          </LinkButton>
          <p className="text-small text-stone">Built at McGill · Ctrl+Z Eats</p>
        </div>
        <QrCard big={false} />
      </footer>
    </main>
  );
}
