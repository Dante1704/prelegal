"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, isAuthenticated } from "@/lib/auth";

export default function Header() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  function signOut() {
    clearToken();
    router.push("/signin");
  }

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-3">
      <div className="flex items-center">
        <span className="text-lg font-bold tracking-tight" style={{ color: "#209dd7" }}>
          Prelegal
        </span>
        <span className="ml-3 text-sm text-gray-500">Document Creator</span>
      </div>
      {authed && (
        <button
          onClick={signOut}
          className="rounded px-3 py-1 text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#753991" }}
        >
          Sign out
        </button>
      )}
    </header>
  );
}
