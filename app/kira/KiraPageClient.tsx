"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import KiraExperience from "@/app/components/KiraExperience";

export default function KiraPageClient() {
  const searchParams = useSearchParams();
  const seed = useMemo(() => {
    const prompt = searchParams.get("prompt")?.trim();
    return prompt ? { prompt } : null;
  }, [searchParams]);

  return <KiraExperience seed={seed} />;
}
