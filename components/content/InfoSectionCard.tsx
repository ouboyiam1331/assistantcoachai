import type { ReactNode } from "react";

type InfoSectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default function InfoSectionCard({
  title,
  description,
  children,
}: InfoSectionCardProps) {
  return (
    <section className="tgem-surface rounded-3xl px-8 py-8">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      {description ? (
        <p className="mt-3 max-w-3xl text-base leading-8 text-gray-700 dark:text-gray-300">
          {description}
        </p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}
