import NdaCreator from "@/components/NdaCreator";
import mutualNdaTemplate from "@/lib/mutual-nda-template";

export default function Home() {
  return <NdaCreator template={mutualNdaTemplate} />;
}
