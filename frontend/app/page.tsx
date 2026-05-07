import AuthGate from "@/components/AuthGate";
import NdaCreator from "@/components/NdaCreator";
import mutualNdaTemplate from "@/lib/mutual-nda-template";

export default function Home() {
  return (
    <AuthGate>
      <NdaCreator template={mutualNdaTemplate} />
    </AuthGate>
  );
}
