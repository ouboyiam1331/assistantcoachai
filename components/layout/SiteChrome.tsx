"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdSlot from "@/components/ui/AdSlot";

type SiteChromeProps = {
  children: ReactNode;
};

const LEGAL_PATHS = new Set(["/privacy-policy", "/terms-of-service"]);
const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/team-analysis", label: "Team Analysis" },
  { href: "/pickem", label: "Pick'em" },
  { href: "/about", label: "About" },
];

export default function SiteChrome({ children }: SiteChromeProps) {
  const pathname = usePathname();
  const isLegalPage = LEGAL_PATHS.has(pathname ?? "");

  return (
    <div className="flex min-h-screen flex-col">
      {!isLegalPage ? (
        <div className="px-4 pt-3">
          <AdSlot placement="TOP" />
        </div>
      ) : null}

      {!isLegalPage ? (
        <header className="border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 dark:border-gray-800 dark:bg-gray-950/95 dark:supports-[backdrop-filter]:bg-gray-950/90">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-full pr-3 transition hover:bg-gray-100 dark:hover:bg-gray-900"
              aria-label="TGEM Sports home"
            >
              <span className="overflow-hidden rounded-2xl border border-gray-800/80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_rgba(255,255,255,0)_35%),linear-gradient(180deg,_#111827_0%,_#020617_100%)] p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
                <Image
                  src="/branding/tgem-logo.svg"
                  alt="TGEM Sports logo"
                  width={40}
                  height={40}
                  priority
                  className="h-10 w-10 rounded-xl object-contain"
                />
              </span>
              <span className="hidden text-base font-bold text-gray-900 sm:inline dark:text-gray-100">
                TGEM Sports<sup className="tgem-tm">TM</sup>
              </span>
              <span className="sr-only sm:hidden">TGEM Sports</span>
            </Link>

            <nav aria-label="Main navigation" className="flex flex-wrap items-center justify-end gap-2">
              {NAV_LINKS.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-950"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-gray-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>
      ) : null}

      <div className="flex-1">{children}</div>

      {!isLegalPage ? (
        <div className="px-4 pb-3">
          <AdSlot placement="BOTTOM" />
        </div>
      ) : null}

      <footer className="border-t border-gray-200 bg-white px-4 py-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
          <p>
            {isLegalPage ? (
              <>
                &copy; 2026 TGEM Sports<sup className="tgem-tm">TM</sup>. Powered by TGEM
                <sup className="tgem-tm">TM</sup>
              </>
            ) : (
              <>
                &copy; 2026 TGEM Sports<sup className="tgem-tm">TM</sup>. Powered by the
                Tactical Game Evaluation Model<sup className="tgem-tm">TM</sup>
              </>
            )}
          </p>

          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-gray-900 hover:underline dark:hover:text-gray-100">
              About TGEM Sports
            </Link>
            <Link
              href="/privacy-policy"
              className="hover:text-gray-900 hover:underline dark:hover:text-gray-100"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-of-service"
              className="hover:text-gray-900 hover:underline dark:hover:text-gray-100"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
