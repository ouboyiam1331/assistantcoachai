import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 text-gray-900">
      <div className="mb-8">
        <Link href="/" className="text-sm underline hover:text-gray-700">
          Back to Home
        </Link>
      </div>

      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-600">Effective date: March 20, 2026</p>

      <section className="mt-10 space-y-6 text-sm leading-7">
        <p>
          TGEM Sports (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provides analytics content and tools for
          college football. This Privacy Policy describes what information we collect,
          how we use it, and your choices.
        </p>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Information We Collect</h2>
          <p>
            We may collect usage and device information such as pages visited, browser
            type, approximate location, and interaction events. If accounts or contact
            forms are enabled, we may collect account identifiers and submitted contact
            details.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">How We Use Information</h2>
          <p>
            We use information to operate and improve the site, secure the service,
            analyze traffic, and support advertising and monetization features.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Cookies and Similar Technologies</h2>
          <p>
            We and third-party providers may use cookies or similar technologies for
            performance, analytics, personalization, and advertising.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Third-Party Services</h2>
          <p>
            We may use third-party tools, including analytics and ad platforms (such as
            Google AdSense), that may collect and process data according to their own
            policies.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Data Retention</h2>
          <p>
            We retain data for as long as needed to provide and improve the service,
            comply with legal obligations, and resolve disputes.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Your Choices</h2>
          <p>
            You can adjust browser settings to limit cookies. Depending on your
            location, you may have rights to access, delete, or correct personal data.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Children&apos;s Privacy</h2>
          <p>
            The service is not directed to children under 13, and we do not knowingly
            collect personal information from children under 13.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Updates are posted on
            this page with a revised effective date.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Contact</h2>
          <p>
            For privacy questions, contact{" "}
            <a className="underline hover:text-gray-700" href="mailto:contact@tgemsports.com">
              contact@tgemsports.com
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
