import { cn } from "@/lib/utils";

/** Kapruka wordmark — white letters from SVG + yellow smile (not in asset file). */
export default function KaprukaLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn("relative inline-block h-7 w-[7.5rem] sm:h-8 sm:w-[8.75rem]", className)}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/kapruka-logo.svg"
        alt=""
        className="h-full w-full object-contain object-left"
        draggable={false}
      />
      <svg
        viewBox="0 0 625 110"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      >
        <path
          fill="#f8da08"
          d="M402.986267,67.193703 C411.020386,61.704575 416.238495,54.617882 418.415070,45.324123 C424.890198,45.324123 431.318146,45.324123 437.750275,45.324123 C437.129608,66.508202 416.547272,90.716156 386.719543,92.762413 C356.255249,94.852348 331.226654,71.531693 328.261810,45.118824 C334.079407,45.118824 339.857269,44.962524 345.612488,45.253811 C346.731842,45.310467 348.364868,46.921478 348.743073,48.133221 C353.218384,62.471653 368.281891,74.652725 385.670837,72.854988 C391.454773,72.257019 396.988068,69.234306 402.986267,67.193703 z"
        />
      </svg>
    </span>
  );
}
