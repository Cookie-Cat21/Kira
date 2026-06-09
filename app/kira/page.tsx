import KiraExperience from "@/app/components/KiraExperience";

export const metadata = {
  title: "Kira — your shopping companion",
};

// Standalone, full-screen Kira experience (the original chat-first surface).
export default function KiraPage() {
  return <KiraExperience />;
}
