"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { auth } from "@/lib/firebase";

const ADMIN_EMAIL = "wilfriedhouinlindjonon91@gmail.com";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setError("Lien invalide ou expire.");
        return;
      }

      const email =
        window.localStorage.getItem("emailForSignIn") || ADMIN_EMAIL;

      try {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        window.localStorage.removeItem("emailForSignIn");

        // Verify it's the admin email
        if (result.user.email !== ADMIN_EMAIL) {
          setError("Acces refuse — cet email n'est pas autorise.");
          await auth.signOut();
          return;
        }

        // Store admin session
        window.localStorage.setItem("ycl_admin_auth", "true");
        router.replace("/admin");
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("Erreur d'authentification. Le lien a peut-etre expire.");
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#0F1117] px-6">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <span className="material-symbols-outlined text-red-400 text-4xl block">
              error
            </span>
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => router.push("/admin/login")}
              className="text-amber-400 text-sm underline"
            >
              Retourner au login
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto" />
            <p className="text-white/60">Authentification en cours...</p>
          </>
        )}
      </div>
    </div>
  );
}
