import type { SVGProps } from "react";

/** Thin line icons (1.5px stroke, currentColor) — the kit's house style. */
const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  width: 18,
  height: 18,
};

const Icon = (p: SVGProps<SVGSVGElement>, path: React.ReactNode) => (
  <svg {...base} {...p}>
    {path}
  </svg>
);

export const IconGift = (p: SVGProps<SVGSVGElement>) =>
  Icon(
    p,
    <>
      <path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" />
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M12 8S10.6 4 8 4a2 2 0 1 0 0 4h4Zm0 0s1.4-4 4-4a2 2 0 1 1 0 4h-4Z" />
    </>
  );

export const IconBloom = (p: SVGProps<SVGSVGElement>) =>
  Icon(
    p,
    <>
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 9.6c.6-2 .2-4 0-4.6-.5.7-1.1 2.6 0 4.6Zm0 4.8c-.6 2-.2 4 0 4.6.5-.7 1.1-2.6 0-4.6Zm2.4-2.4c2-.6 4-.2 4.6 0-.7.5-2.6 1.1-4.6 0Zm-4.8 0c-2 .6-4 .2-4.6 0 .7-.5 2.6-1.1 4.6 0Z" />
    </>
  );

export const IconSparkle = (p: SVGProps<SVGSVGElement>) =>
  Icon(p, <path d="M12 3c.4 3.6 1.4 4.6 5 5-3.6.4-4.6 1.4-5 5-.4-3.6-1.4-4.6-5-5 3.6-.4 4.6-1.4 5-5Z" />);

export const IconBag = (p: SVGProps<SVGSVGElement>) =>
  Icon(
    p,
    <>
      <path d="M6.2 8h11.6l-.9 11.2a1 1 0 0 1-1 .8H8.1a1 1 0 0 1-1-.8L6.2 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  );

export const IconSearch = (p: SVGProps<SVGSVGElement>) =>
  Icon(
    p,
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.6-3.6" />
    </>
  );

export const IconArrowUp = (p: SVGProps<SVGSVGElement>) =>
  Icon(
    p,
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  );

export const IconHeart = (p: SVGProps<SVGSVGElement>) =>
  Icon(p, <path d="M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.65-7 9-7 9Z" />);

/** Solid heart for the "saved" state — fills with currentColor. */
export const IconHeartFilled = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} fill="currentColor" stroke="none" {...p}>
    <path d="M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.65-7 9-7 9Z" />
  </svg>
);

export const IconBell = (p: SVGProps<SVGSVGElement>) =>
  Icon(
    p,
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  );

export const IconCheck = (p: SVGProps<SVGSVGElement>) =>
  Icon(p, <path d="m5 12.5 4.5 4.5L19 7" />);

export const IconClose = (p: SVGProps<SVGSVGElement>) =>
  Icon(
    p,
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  );

export const IconClock = (p: SVGProps<SVGSVGElement>) =>
  Icon(
    p,
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  );
