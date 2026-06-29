import KiraExperience from "@/app/components/KiraExperience";
import KiraGlassShell from "@/app/components/store/KiraGlassShell";

export default function HomePage() {
  return (
    <div className="fixed inset-0 h-dvh min-h-dvh">
      <KiraGlassShell radius={0} className="h-full">
        <KiraExperience glassChrome />
      </KiraGlassShell>
    </div>
  );
}
