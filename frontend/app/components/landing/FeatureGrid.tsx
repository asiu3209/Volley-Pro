const features = [
  {
    title: "Clip analysis",
    description: "Upload a short video and get coaching on that rep.",
  },
  {
    title: "Skill-specific tips",
    description: "Serve, set, block, attack, or pass — feedback matches the skill.",
  },
  {
    title: "Scores you can track",
    description: "See overall scores and trends across your recent clips.",
  },
  {
    title: "History in one place",
    description: "Reopen past reports anytime from your analysis tab.",
  },
];

export default function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm text-gray-400">Features</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Built for quick, useful feedback
        </h2>
        <p className="mt-3 text-base text-gray-400">
          No long setup. Record, upload, and know what to fix.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <h3 className="text-base font-semibold text-white">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
