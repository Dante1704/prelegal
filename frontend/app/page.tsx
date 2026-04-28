import NdaCreator from "@/app/components/NdaCreator";
import mutualNdaTemplate from "@/lib/mutual-nda-template";

export default function Home() {
  return <NdaCreator template={mutualNdaTemplate} />;
}
