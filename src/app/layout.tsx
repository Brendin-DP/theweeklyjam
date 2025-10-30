"use client";
import "../styles/globals.css";
import Link from "next/link";
import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/";
  const supabase = createClient(
    "https://ktctqojjjdxwizztkkmc.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Y3Rxb2pqamR4d2l6enRra21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDQyMjYsImV4cCI6MjA3MjM4MDIyNn0.obILD95-ZimwoI-CQlaXDN2QRr0fInbki1AOWa47O0M"
  );

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user && !isAuthPage) {
        window.location.href = "/";
      }
    })();
  }, [pathname]);
  return (
    <html lang="en">
      <body>
        {isAuthPage ? (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">{children}</div>
        ) : (
          <div className="flex min-h-screen">
            <aside className="w-60 bg-gray-900 text-white p-4">
              <h2 className="text-xl font-bold mb-6">🎸 Guitar Covers</h2>
              <nav className="flex flex-col gap-2">
                <Link href="/dashboard" className="hover:text-gray-300">Dashboard</Link>
                <Link href="/covers" className="hover:text-gray-300">Covers</Link>
                <Link href="/settings" className="hover:text-gray-300">Settings</Link>
              </nav>
            </aside>
            <main className="flex-1 p-8 bg-gray-50">{children}</main>
          </div>
        )}
      </body>
    </html>
  );
}
