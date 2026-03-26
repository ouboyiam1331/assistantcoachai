const capabilities = [
  {
    title: "Team Analysis",
    text: "Break down teams beyond surface-level stats.",
  },
  {
    title: "Matchup Reads",
    text: "Evaluate edges, risks, and weekly game context.",
  },
  {
    title: "Pick'em Support",
    text: "Help users make smarter, more confident picks.",
  },
  {
    title: "Competitive Insight",
    text: "Turn raw football information into decision-ready analysis.",
  },
];

export default function AboutWhatTGEMDoes() {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-8 py-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700 dark:text-red-400">
        What TGEM Is Designed To Do
      </p>
      <h2 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
        A smarter way to study teams, matchups, and picks
      </h2>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {capabilities.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/60"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
