import Link from "next/link";
import { TGEM_CHANGELOG } from "@/lib/model/changelog";
import { TGEM_MODEL_VERSION } from "@/lib/model/version";

export default function ChangelogPage() {
  return (
    <main className="tgem-page px-6 py-12">
      <section className="tgem-surface mx-auto max-w-4xl rounded-3xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">TGEM Changelog</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Current model: <strong>{TGEM_MODEL_VERSION}</strong>
        </p>
        <div className="mt-4 space-y-4">
          {TGEM_CHANGELOG.map((entry) => (
            <article key={`${entry.version}:${entry.date}`} className="tgem-surface-subtle rounded-2xl p-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {entry.version} ({entry.date})
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
                {entry.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="mt-5">
          <Link href="/" className="text-sm underline text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300">
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
