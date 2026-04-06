import type { Metadata } from "next";
import InfoPageLayout from "@/components/content/InfoPageLayout";
import InfoSectionCard from "@/components/content/InfoSectionCard";

export const metadata: Metadata = {
  title: "Contact TGEM Sports",
  description:
    "Contact TGEM Sports for support, partnerships, feedback, or general platform questions.",
};

export default function ContactPage() {
  return (
    <InfoPageLayout
      eyebrow="Contact"
      title="Get in touch with TGEM Sports"
      description="If you have a support question, platform idea, partnership inquiry, or general feedback, this page is the best place to start."
    >
      <InfoSectionCard
        title="Contact options"
        description="Use the address that best matches the reason you are reaching out."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <a
            href="mailto:contact@tgemsports.com"
            className="tgem-surface-subtle rounded-2xl p-5 transition hover:bg-[var(--tgem-surface-hover)]"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">General Inquiries</h3>
            <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
              Questions about the platform, business inquiries, and general outreach.
            </p>
            <p className="mt-4 font-semibold text-gray-900 dark:text-gray-100">contact@tgemsports.com</p>
          </a>

          <a
            href="mailto:support@tgemsports.com"
            className="tgem-surface-subtle rounded-2xl p-5 transition hover:bg-[var(--tgem-surface-hover)]"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Support</h3>
            <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
              Issues related to pages, pick&apos;em use, broken routes, or general platform support.
            </p>
            <p className="mt-4 font-semibold text-gray-900 dark:text-gray-100">support@tgemsports.com</p>
          </a>
        </div>
      </InfoSectionCard>

      <InfoSectionCard
        title="What to include"
        description="A little detail makes it easier to respond faster."
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {[
            "Which page or feature you were using",
            "What you expected to happen",
            "What happened instead",
            "Any school, matchup, or route involved",
            "If the issue was on mobile or desktop",
            "Any idea, request, or improvement you want considered",
          ].map((item) => (
            <li key={item} className="tgem-surface-subtle rounded-2xl px-5 py-4 text-sm leading-7 text-gray-700 dark:text-gray-300">
              {item}
            </li>
          ))}
        </ul>
      </InfoSectionCard>
    </InfoPageLayout>
  );
}
