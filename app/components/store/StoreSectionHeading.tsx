import Link from "next/link";

export default function StoreSectionHeading({
  title,
  href,
  linkLabel = "View All →",
  subtitle,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  subtitle?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-3xl uppercase tracking-tight text-white sm:text-4xl">
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="shrink-0 rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
          >
            {linkLabel}
          </Link>
        )}
      </div>
      {subtitle && (
        <p className="mt-1.5 text-sm text-white/45">{subtitle}</p>
      )}
    </div>
  );
}
