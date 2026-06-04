import "@/styles/globals.css";
import { Sidebar } from "@/components/sidebar";
import { AuthProvider } from "@/components/auth-provider";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Hospital Odontológico",
  description: "Gestión clínica y financiera odontológica de alta fidelidad",
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🦷</text></svg>',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="h-full bg-slate-50">
      <body className="min-h-full bg-slate-50 antialiased">
        <AuthProvider>
          <Sidebar />
          <main className="pl-64">
            <div className="mx-auto max-w-7xl p-8">{children}</div>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
