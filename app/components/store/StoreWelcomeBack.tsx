"use client";

import WelcomeBackReorder from "@/app/components/WelcomeBackReorder";

/** Client wrapper for store pages — welcome-back reorder strip. */
export default function StoreWelcomeBack() {
  return (
    <div className="pointer-events-auto relative z-[40] px-4 pt-3 sm:px-8">
      <WelcomeBackReorder />
    </div>
  );
}
