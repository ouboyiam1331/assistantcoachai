import Link from "next/link";
import { TGEM_CHANGELOG } from "@/lib/model/changelog";
import { TGEM_MODEL_VERSION } from "@/lib/model/version";

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <section className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-gray-900">TGEM Changelog</h1>
        <p className="mt-2 text-sm text-gray-700">
          Current model: <strong>{TGEM_MODEL_VERSION}</strong>
        </p>
        <div className="mt-4 space-y-4">
          {TGEM_CHANGELOG.map((entry) => (
            <article key={`${entry.version}:${entry.date}`} className="rounded-md border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900">
                {entry.version} ({entry.date})
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-800">
                {entry.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="mt-5">
          <Link href="/" className="text-sm underline">
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}

