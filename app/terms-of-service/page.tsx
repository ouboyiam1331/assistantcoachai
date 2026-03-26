import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <main className="tgem-page px-6 py-12 text-gray-900 dark:text-gray-100">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8">
          <Link href="/" className="text-sm underline hover:text-gray-700 dark:hover:text-gray-300">
            Back to Home
          </Link>
        </div>

        <section className="tgem-surface rounded-3xl px-8 py-10">
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Effective date: March 20, 2026</p>

          <section className="mt-10 space-y-6 text-sm leading-7 text-gray-700 dark:text-gray-300">
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your use of TGEM Sports. By
              using the service, you agree to these Terms.
            </p>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Use of Service</h2>
              <p>
                You may use the service only in compliance with applicable laws and these
                Terms. You agree not to misuse, disrupt, or attempt unauthorized access to
                the platform.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Analytics and Content Disclaimer</h2>
              <p>
                TGEM Sports provides analytics, projections, and informational content.
                Outputs are estimates and not guarantees of outcomes.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No Gambling or Financial Advice</h2>
              <p>
                Content is for informational and entertainment purposes only and is not
                gambling, betting, legal, tax, or financial advice.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Intellectual Property</h2>
              <p>
                The TGEM model, its methodology, model documentation, source code logic,
                outputs, branding, and site content are proprietary to TGEM Sports and are
                protected by applicable intellectual property laws. No part of the site or
                TGEM outputs may be copied, reproduced, republished, scraped, sold,
                licensed, distributed, reverse engineered, or used to create derivative
                works without prior written permission from TGEM Sports.
              </p>
              <p>
                Limited personal, non-commercial use of the service is permitted, but that
                permission does not transfer any ownership rights in the TGEM model or its
                outputs. Unauthorized reproduction or commercial use of TGEM content is
                prohibited.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Third-Party Data and Services</h2>
              <p>
                We may rely on third-party data providers and services. Availability,
                completeness, and accuracy of third-party content are not guaranteed.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, TGEM Sports is not liable for
                indirect, incidental, special, consequential, or punitive damages arising
                from your use of the service.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Termination</h2>
              <p>
                We may suspend or terminate access if these Terms are violated or if needed
                to protect the platform, users, or legal compliance.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Changes to Terms</h2>
              <p>
                We may update these Terms. Continued use of the service after updates means
                you accept the revised Terms.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Contact</h2>
              <p>
                For terms questions, contact{" "}
                <a className="underline hover:text-gray-700 dark:hover:text-gray-300" href="mailto:support@tgemsports.com">
                  support@tgemsports.com
                </a>
                .
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
