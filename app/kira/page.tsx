import { Suspense } from "react";
import KiraPageClient from "./KiraPageClient";

export const metadata = {
  title: "Kira — Kapruka AI shopping companion",
  description:
    "Ask Kira to find gifts, check delivery, and checkout on Kapruka — Sri Lanka's gifting platform.",
};

export default function KiraPage() {
  return (
    <Suspense fallback={null}>
      <KiraPageClient />
    </Suspense>
  );
}
