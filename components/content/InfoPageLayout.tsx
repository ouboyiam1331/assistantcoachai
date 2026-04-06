import type { ReactNode } from "react";
import Link from "next/link";

type InfoPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
  children: ReactNode;
};

export default function InfoPageLayout({
  eyebrow,
  title,
  description,
  ctaHref,
  ctaLabel,
  children,
}: InfoPageLayoutProps) {
  return (
    <main className="tgem-page px-6 py-12 text-gray-900 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="tgem-surface rounded-3xl px-8 py-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-700 dark:text-gray-300">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-bold text-gray-900 dark:text-gray-100 sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 text-base leading-8 text-gray-700 dark:text-gray-300">
              {description}
            </p>
            {ctaHref && ctaLabel ? (
              <div className="mt-8">
                <Link
                  href={ctaHref}
                  className="inline-flex rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                >
                  {ctaLabel}
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        {children}
      </div>
    </main>
  );
}
