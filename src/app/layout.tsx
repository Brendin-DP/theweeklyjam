import "../styles/globals.css";
import Link from "next/link";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
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
      </body>
    </html>
  );
}
