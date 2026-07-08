import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/lib/context/ThemeProvider";
import { BaselineProvider } from "@/lib/context/BaselineProvider";
import { Starfield } from "@/components/layout/Starfield";
import { getDb } from "@/lib/db/client";
import { seedStatic } from "@/lib/db/seed-static";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["400", "500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Aegis — EU AI Act Compliance & Governance Platform",
  description: "Eurobank Capital SpA — AI Act compliance and governance reference platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  seedStatic();
  const db = getDb();
  const baselines = db.prepare(`SELECT * FROM regulatory_baselines`).all() as any[];
  const cookieStore = cookies();
  const theme = (cookieStore.get("aegis_theme")?.value as "dark" | "light") ?? "dark";
  const baselineId = cookieStore.get("aegis_baseline")?.value ?? baselines.find((b) => b.is_default)?.id ?? baselines[0]?.id;

  return (
    <html lang="en" className={theme === "dark" ? "dark" : ""}>
      <body className={`${sora.variable} ${inter.variable} antialiased min-h-screen`}>
        <ThemeProvider initialTheme={theme}>
          <BaselineProvider baselines={baselines} initialId={baselineId}>
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0B1220] to-[#050810] dark:block hidden" />
            <Starfield />
            <div className="aurora-layer">
              <div className="aurora-ribbon" />
              <div className="aurora-ribbon-2" />
            </div>
            <div className="relative z-10">{children}</div>
          </BaselineProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
