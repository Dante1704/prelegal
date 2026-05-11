import AuthGate from "@/components/AuthGate";
import DocumentCreator from "@/components/DocumentCreator";

export default function Home() {
  return (
    <AuthGate>
      <DocumentCreator />
    </AuthGate>
  );
}
