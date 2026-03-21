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
    <main className="min-h-screen bg-gray-100 p-8">
      <section className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-gray-800">{description}</p>
        <p className="mt-2 text-sm text-gray-700">
          Plan: <strong>{user.plan}</strong>
        </p>
        <p className="mt-2 text-sm text-gray-700">
          This add-on is wired to league config and entitlements. Active leagues:
          {" "}
          {enabledLeagues.map((l) => l.label).join(", ")}
        </p>
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Coming soon. Upgrade CTA and live features can plug in here without route rewrites.
        </div>
        <div className="mt-5">
          <Link href="/" className="text-sm text-gray-800 underline">
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}

