import KiraExperience from "@/app/components/KiraExperience";

// The challenge brief demands an immersive conversation as the MAIN surface —
// "not a tiny widget in a corner". The full-screen Kira chat is the front door;
// the storefront lives at /shop as a secondary surface Kira links into.
export default function HomePage() {
  return <KiraExperience />;
}
