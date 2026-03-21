"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdSlot from "@/components/ui/AdSlot";

type SiteChromeProps = {
  children: ReactNode;
};

const LEGAL_PATHS = new Set(["/privacy-policy", "/terms-of-service"]);

export default function SiteChrome({ children }: SiteChromeProps) {
  const pathname = usePathname();
  const isLegalPage = LEGAL_PATHS.has(pathname ?? "");

  return (
    <div className="min-h-screen flex flex-col">
      {!isLegalPage ? (
        <div className="px-4 pt-3">
          <AdSlot placement="TOP" />
        </div>
      ) : null}

      <div className="flex-1">{children}</div>

      {!isLegalPage ? (
        <div className="px-4 pb-3">
          <AdSlot placement="BOTTOM" />
        </div>
      ) : null}

      <footer className="border-t border-gray-200 bg-white px-4 py-3 text-center text-sm text-gray-700">
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
      </footer>
    </div>
  );
}
