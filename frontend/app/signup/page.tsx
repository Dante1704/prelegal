"use client";
import { useRouter } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { signup } from "@/lib/auth";

export default function SignUpPage() {
  const router = useRouter();

  async function handleSignUp(email: string, password: string) {
    await signup(email, password);
    router.push("/");
  }

  return <AuthForm mode="signup" onSubmit={handleSignUp} />;
}
