import Link from "next/link";
import { allLeagues } from "@/lib/leagues/config";
import { getServerUserEntitlements } from "@/lib/entitlements/server";

export default function AddonPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const user = getServerUserEntitlements();
  const enabledLeagues = allLeagues.filter((l) => l.enabled);
  return (
    <main className="tgem-page px-6 py-12">
      <section className="tgem-surface mx-auto max-w-3xl rounded-3xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        <p className="mt-2 text-gray-700 dark:text-gray-300">{description}</p>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Plan: <strong>{user.plan}</strong>
        </p>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          This add-on is wired to league config and entitlements. Active leagues:
          {" "}
          {enabledLeagues.map((l) => l.label).join(", ")}
        </p>
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
          Coming soon. Upgrade CTA and live features can plug in here without route rewrites.
        </div>
        <div className="mt-5">
          <Link href="/" className="text-sm text-gray-900 underline dark:text-gray-100">
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
