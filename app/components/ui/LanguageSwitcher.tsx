"use client";

import { cn } from "@/lib/utils";

export default function LanguageSwitcher({
  language,
  onChange,
  className,
  prominent = false,
}: {
  language: "en" | "si" | "ta";
  onChange: (lang: "en" | "si" | "ta") => void;
  className?: string;
  prominent?: boolean;
}) {
  const langs = [
    { id: "en" as const, label: "EN", hint: "English" },
    { id: "si" as const, label: "සිං", hint: "Sinhala" },
    { id: "ta" as const, label: "தமி", hint: "Tamil" },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border p-0.5",
        prominent
          ? "border-kap-purple/20 bg-white shadow-sm"
          : "border-kira-border bg-[#f5f5f7]",
        className
      )}
      role="group"
      aria-label="Reply language"
    >
      {langs.map((lang) => (
        <button
          key={lang.id}
          type="button"
          onClick={() => onChange(lang.id)}
          title={lang.hint}
          aria-pressed={language === lang.id}
          className={cn(
            "min-h-10 min-w-10 rounded-full px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kap-purple/30",
            language === lang.id
              ? "bg-kap-purple text-white shadow-sm"
              : "text-kira-muted hover:text-kira-text"
          )}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
