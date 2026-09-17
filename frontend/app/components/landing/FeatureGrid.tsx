export default function FeatureGrid() {
    //can change around features that are actually in app
  const features = [
    {
      title: "AI form analysis",
      description:
        "Upload a volleyball clip and get feedback on your mechanics, timing, posture, and movement.",
    },
    {
      title: "Clear improvement tips",
      description:
        "VolleyPro explains what you did well, what needs work, and what to focus on during your next practice.",
    },
    {
      title: "Video-based feedback",
      description:
        "Analyze real playing or training footage instead of guessing what went wrong after a rep.",
    },
    {
      title: "Track your progress",
      description:
        "Compare your form over time and see whether your technique is becoming more consistent.",
    },
    {
      title: "Built for players",
      description:
        "Designed for volleyball athletes who want simple, useful feedback without needing a full coaching setup.",
    },
    {
      title: "Practice smarter",
      description:
        "Turn every uploaded clip into a specific action step, drill, or focus area for your next session.",
    },
  ];

  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium text-gray-400">Features</p>

        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Feedback that turns video into improvement.
        </h2>

        <p className="mt-5 text-lg leading-8 text-gray-400">
          VolleyPro helps players understand their technique with AI-powered
          feedback that is simple, visual, and easy to act on.
        </p>
      </div>

      <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <h3 className="text-lg font-semibold text-white">
              {feature.title}
            </h3>

            <p className="mt-3 leading-7 text-gray-400">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}