"use client";
import { useRouter } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { signin } from "@/lib/auth";

export default function SignInPage() {
  const router = useRouter();

  async function handleSignIn(email: string, password: string) {
    await signin(email, password);
    router.push("/");
  }

  return <AuthForm mode="signin" onSubmit={handleSignIn} />;
}
