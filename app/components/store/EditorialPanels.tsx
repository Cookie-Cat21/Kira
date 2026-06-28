"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useKiraDock } from "@/app/context/KiraDockContext";
import Reveal from "./Reveal";

const PANELS = [
  {
    image:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=900&q=80",
    imageAlt: "Gift hamper with flowers",
    title: "Send something they'll remember.",
    subtitle: "Delivered islandwide. Same-day available in Colombo.",
    cta: "Browse gifts",
    href: "/shop/hampers",
    imageLeft: true,
  },
  {
    image:
      "https://images.unsplash.com/photo-1490750967868-88df5691cc8b?w=900&q=80",
    imageAlt: "Fresh flower bouquet",
    title: "Not sure what to get?",
    subtitle:
      "Tell Kira who it's for and she'll find the perfect gift, check delivery, and check you out.",
    cta: "Ask Kira",
    kira: true,
    imageLeft: false,
  },
] as const;

export default function EditorialPanels() {
  const { open } = useKiraDock();

  return (
    <section className="mx-auto w-full max-w-[1280px] space-y-6 px-5 sm:px-8">
      {PANELS.map((panel, i) => (
        <Reveal key={panel.title} delay={i * 80}>
          <div className="grid min-h-[400px] overflow-hidden rounded-2xl border border-white/10 bg-kira-canvas lg:grid-cols-2">
            {panel.imageLeft ? (
              <PanelImage src={panel.image} alt={panel.imageAlt} />
            ) : (
              <PanelCopy panel={panel} onKira={() => open()} />
            )}
            {panel.imageLeft ? (
              <PanelCopy panel={panel} onKira={() => open()} />
            ) : (
              <PanelImage src={panel.image} alt={panel.imageAlt} />
            )}
          </div>
        </Reveal>
      ))}
    </section>
  );
}

function PanelImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative min-h-[240px] lg:min-h-full">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-cover transition-transform duration-700 hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent lg:bg-black/10" />
    </div>
  );
}

function PanelCopy({
  panel,
  onKira,
}: {
  panel: (typeof PANELS)[number];
  onKira: () => void;
}) {
  return (
    <div className="flex flex-col justify-center p-8 sm:p-12">
      <h3 className="display-hero text-3xl text-white sm:text-4xl">{panel.title}</h3>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/55">
        {panel.subtitle}
      </p>
      <div className="mt-8">
        {"kira" in panel && panel.kira ? (
          <button
            type="button"
            onClick={onKira}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-kap-purple to-[#6d4ec9] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(64,41,112,0.45)] transition-transform hover:scale-[1.03] active:scale-95"
          >
            <Sparkles className="size-4 text-kap-yellow" />
            {panel.cta}
            <ArrowRight className="size-4" />
          </button>
        ) : "href" in panel && panel.href ? (
          <Link
            href={panel.href}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-kira-canvas transition-transform hover:scale-[1.03] active:scale-95"
          >
            {panel.cta}
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
