import Image from "next/image";

type TgemSportsLogoProps = {
  className?: string;
};

export default function TgemSportsLogo({ className = "" }: TgemSportsLogoProps) {
  return (
    <div className={`relative ${className}`} aria-label="TGEM Sports trademark logo">
      <div className="absolute -right-2 top-3 z-10 rounded-full border border-gray-200 bg-white/95 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200">
        TM
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-gray-800/80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_rgba(255,255,255,0)_35%),linear-gradient(180deg,_#111827_0%,_#020617_100%)] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
        <Image
          src="/branding/tgem-logo.svg"
          alt="TGEM Sports logo"
          width={750}
          height={750}
          priority
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}
