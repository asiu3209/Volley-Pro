const steps = [
  {
    step: "1",
    title: "Upload a clip",
    detail: "A few seconds of serve, set, block, attack, or pass is enough.",
  },
  {
    step: "2",
    title: "Mark the player",
    detail: "Draw a box around the athlete you want coached.",
  },
  {
    step: "3",
    title: "Get the report",
    detail: "Score, strengths, weaknesses, and tips for your next practice.",
  },
];

export default function Preview() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm text-gray-400">How it works</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Three steps to better reps
        </h2>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {steps.map((item) => (
          <div
            key={item.step}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <p className="text-sm font-medium text-gray-500">Step {item.step}</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
