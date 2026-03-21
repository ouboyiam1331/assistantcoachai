import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 text-gray-900">
      <div className="mb-8">
        <Link href="/" className="text-sm underline hover:text-gray-700">
          Back to Home
        </Link>
      </div>

      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-600">Effective date: March 20, 2026</p>

      <section className="mt-10 space-y-6 text-sm leading-7">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of TGEM Sports. By
          using the service, you agree to these Terms.
        </p>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Use of Service</h2>
          <p>
            You may use the service only in compliance with applicable laws and these
            Terms. You agree not to misuse, disrupt, or attempt unauthorized access to
            the platform.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Analytics and Content Disclaimer</h2>
          <p>
            TGEM Sports provides analytics, projections, and informational content.
            Outputs are estimates and not guarantees of outcomes.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">No Gambling or Financial Advice</h2>
          <p>
            Content is for informational and entertainment purposes only and is not
            gambling, betting, legal, tax, or financial advice.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Intellectual Property</h2>
          <p>
            The TGEM model outputs, branding, and site content are protected by
            applicable intellectual property laws. Do not copy, resell, or redistribute
            protected content without permission.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Third-Party Data and Services</h2>
          <p>
            We may rely on third-party data providers and services. Availability,
            completeness, and accuracy of third-party content are not guaranteed.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, TGEM Sports is not liable for
            indirect, incidental, special, consequential, or punitive damages arising
            from your use of the service.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Termination</h2>
          <p>
            We may suspend or terminate access if these Terms are violated or if needed
            to protect the platform, users, or legal compliance.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Changes to Terms</h2>
          <p>
            We may update these Terms. Continued use of the service after updates means
            you accept the revised Terms.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Contact</h2>
          <p>
            For terms questions, contact{" "}
            <a className="underline hover:text-gray-700" href="mailto:support@tgemsports.com">
              support@tgemsports.com
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
