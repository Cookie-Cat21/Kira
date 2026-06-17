"use client";

import { useState } from "react";
import {
  LiquidGlassFilters,
  GlassButton,
  GlassSaveButton,
  GlassSegmented,
  GlassSwitch,
  GlassChip,
  GlassField,
  GlassSearch,
  GlassDock,
  GlassCard,
  IconGift,
  IconBloom,
  IconSparkle,
  IconBag,
  IconSearch,
  IconArrowUp,
  IconBell,
} from "@/app/components/glass";

/* Liquid Glass — UI kit gallery. A calm, near-monochrome stage; every specimen
   is built from the same material so the set reads as one system. */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="w-full">
      <p className="mb-4 text-[10px] uppercase tracking-[0.32em] text-white/30">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

const DOCK = [
  { label: "Gifts", icon: <IconGift /> },
  { label: "Flowers", icon: <IconBloom /> },
  { label: "Treats", icon: <IconSparkle /> },
  { label: "Hampers", icon: <IconBag /> },
];

const QUICK = ["Under Rs 5,000", "Birthday", "Same-day", "For Amma"];

export default function LiquidGlassGallery() {
  const [refraction, setRefraction] = useState("Off");
  const [range, setRange] = useState("Week");
  const [wifi, setWifi] = useState(true);
  const [alerts, setAlerts] = useState(false);
  const [quick, setQuick] = useState("Birthday");

  const refract = refraction === "On";

  return (
    <main className="relative min-h-screen w-full overflow-hidden" style={{ background: "#09080f" }}>
      <LiquidGlassFilters />

      {/* ── Calm atmosphere ── */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="lg-aura lg-aura-breathe"
          style={{
            top: "-22%",
            left: "50%",
            width: "58rem",
            height: "58rem",
            transform: "translateX(-50%)",
            background: "radial-gradient(circle, rgba(123,118,214,0.42) 0%, rgba(123,118,214,0) 68%)",
          }}
        />
        <div
          className="lg-aura"
          style={{
            bottom: "-26%",
            left: "50%",
            width: "46rem",
            height: "46rem",
            transform: "translateX(-50%)",
            opacity: 0.3,
            background: "radial-gradient(circle, rgba(86,120,150,0.4) 0%, rgba(86,120,150,0) 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(125% 100% at 50% 0%, transparent 46%, rgba(0,0,0,0.55) 100%)" }}
        />
      </div>

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 flex justify-center px-6 pt-6">
        <GlassCard
          radius={16}
          blur={16}
          className="w-auto"
        >
          <div className="flex items-center gap-4">
            <span className="text-[13px] font-medium tracking-tight text-white/85">Liquid Glass</span>
            <GlassSegmented
              aria-label="Refraction"
              options={["Off", "On"]}
              value={refraction}
              onChange={setRefraction}
              size="sm"
            />
          </div>
        </GlassCard>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 pt-20 text-center sm:pt-24">
        <p className="text-[11px] uppercase tracking-[0.42em] text-white/35">UI kit · visionOS material</p>
        <h1 className="mt-5 text-6xl font-light tracking-[-0.035em] text-white sm:text-7xl">Liquid Glass</h1>
        <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/45">
          Eight components, one material. Frosted depth, a hairline of light, and a
          highlight that follows your cursor.
        </p>
      </section>

      {/* ── Specimens ── */}
      <div className="relative z-10 mx-auto grid w-full max-w-3xl gap-12 px-6 pb-44 pt-20">
        <Section label="Buttons">
          <GlassButton variant="primary" icon={<IconGift />}>Send a gift</GlassButton>
          <GlassButton variant="secondary">Browse</GlassButton>
          <GlassButton variant="ghost">Cancel</GlassButton>
          <GlassSaveButton />
        </Section>

        <Section label="Segmented">
          <GlassSegmented
            aria-label="Range"
            options={["Day", "Week", "Month"]}
            value={range}
            onChange={setRange}
          />
          <span className="text-[13px] text-white/35">selected: {range}</span>
        </Section>

        <Section label="Switch">
          <div className="flex items-center gap-3">
            <GlassSwitch checked={wifi} onChange={setWifi} aria-label="Wi-Fi" />
            <span className="text-[13px] text-white/55">Wi-Fi {wifi ? "on" : "off"}</span>
          </div>
          <div className="flex items-center gap-3 pl-2">
            <GlassSwitch checked={alerts} onChange={setAlerts} aria-label="Alerts" />
            <span className="text-[13px] text-white/55">Delivery alerts</span>
          </div>
        </Section>

        <Section label="Chips — quick replies">
          {QUICK.map((q) => (
            <GlassChip key={q} active={quick === q} onClick={() => setQuick(q)}>
              {q}
            </GlassChip>
          ))}
        </Section>

        <Section label="Search">
          <GlassSearch
            className="w-full max-w-md"
            placeholder="Search gifts, flowers, hampers…"
            kbd="⌘K"
            suggestions={[
              { label: "Birthday hampers", recent: true },
              { label: "Roses to Colombo", hint: "same-day" },
              { label: "Chocolate cakes" },
              { label: "Anniversary gifts" },
              { label: "Fruit baskets", hint: "perishable" },
              { label: "For Amma", recent: true },
            ]}
          />
        </Section>

        <Section label="Field">
          <GlassField
            className="w-full max-w-md"
            placeholder="Ask Kira to find a gift…"
            icon={<IconSearch />}
            trailing={
              <button
                type="button"
                aria-label="Send"
                className="lg-press grid size-8 place-items-center rounded-full bg-white text-[#16121f] transition hover:bg-white/90"
              >
                <IconArrowUp width={16} height={16} />
              </button>
            }
          />
        </Section>

        <Section label="Card">
          <GlassCard
            className="w-full max-w-sm text-left"
            displace={refract}
            live={refract}
            eyebrow="Now sending"
            title="Birthday Hamper"
            trailing={<IconGift width={20} height={20} />}
            footer={
              <div className="flex items-center gap-2.5">
                <GlassButton variant="primary" size="sm" className="flex-1">
                  Checkout — Rs 4,500
                </GlassButton>
                <GlassButton variant="ghost" size="sm">Edit</GlassButton>
              </div>
            }
          >
            Colombo · arrives Thursday
          </GlassCard>
        </Section>

        {/* Vivid backdrop so refraction + the Regular/Clear difference are visible. */}
        <Section label="Material — Regular vs Clear">
          <div className="relative w-full overflow-hidden rounded-3xl p-6">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(115deg, #f8da08 0%, #ff7eb3 38%, #7b76d6 70%, #2bd4c0 100%)",
              }}
            />
            <div className="relative grid grid-cols-2 gap-4">
              <GlassCard
                variant="regular"
                displace={refract}
                eyebrow="Regular"
                title="Safe anywhere"
              >
                Adaptive frost — legible over any backdrop.
              </GlassCard>
              <GlassCard
                variant="clear"
                displace={refract}
                eyebrow="Clear"
                title="More glass"
              >
                Transparent + refractive, with a dimming scrim.
              </GlassCard>
            </div>
          </div>
        </Section>

        {/* Edge-lensing before/after — same card, displacement off vs on. */}
        <Section label="Edge lensing — off vs on">
          <div className="relative w-full overflow-hidden rounded-3xl p-6">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #fff 0 14px, #7b76d6 14px 28px)",
                opacity: 0.9,
              }}
            />
            <div className="relative grid grid-cols-2 gap-4">
              <GlassCard displace={false} eyebrow="Frost only" title="Off">
                Plain backdrop blur — no bend.
              </GlassCard>
              <GlassCard displace eyebrow="Lensed" title="On">
                Backdrop magnifies and bends at the rim.
              </GlassCard>
            </div>
          </div>
        </Section>

        <Section label="Dock">
          <GlassDock items={DOCK} />
        </Section>
      </div>

      {/* ── Floating dock ── */}
      <div className="fixed inset-x-0 bottom-7 z-20 flex justify-center px-6">
        <GlassDock
          items={[
            { label: "Gifts", icon: <IconGift />, active: true },
            { label: "Flowers", icon: <IconBloom /> },
            { label: "Treats", icon: <IconSparkle /> },
            { label: "Alerts", icon: <IconBell /> },
          ]}
        />
      </div>
    </main>
  );
}
