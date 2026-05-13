import Link from "next/link";

//replace text with more accurate text once user experience gets merged
//update: upload state, score names, feedback format, buttons/actions, etc
//can replace score with percentage (since its out of 100 anyways)

export default function Hero() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center">
      <p className="mb-6 rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300">
        AI-powered training for volleyball players
      </p>

      <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
        Improve your volleyball form with AI feedback.
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-400">
        Upload your volleyball clips and get clear feedback on your mechanics,
        positioning, and technique so you know exactly what to work on next.
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/login"
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-gray-200"
        >
          Analyze My Form
        </Link>

        <a
          href="#demo"
          className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          View Demo
        </a>
      </div>

      <div
        id="demo"
        className="mt-16 w-full max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl"
      >
        <div className="rounded-2xl border border-white/10 bg-black p-6 text-left">
          <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-sm text-gray-400">AI Form Analysis</p>
              <h2 className="text-xl font-semibold">Outside Hitter Approach</h2>
            </div>

            <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-400">
              Analysis Complete
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-gray-400">Form Score</p>
              <p className="mt-2 text-3xl font-bold">82/100</p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-gray-400">Jump Timing</p>
              <p className="mt-2 text-xl font-semibold text-green-400">Good</p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-gray-400">Arm Swing</p>
              <p className="mt-2 text-xl font-semibold text-yellow-400">
                Needs Improvement
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-gray-400">Footwork</p>
              <p className="mt-2 text-xl font-semibold text-green-400">
                Stable
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/5 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium">AI Feedback</p>
              <p className="text-sm text-gray-400">Generated from video</p>
            </div>

            <p className="leading-7 text-gray-300">
              Your approach timing is strong, but your arm swing starts slightly
              late. Try loading your hitting arm earlier before takeoff so you
              can create more power through contact.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm font-medium">Recommended Video</p>
              <p className="mt-2 text-sm text-gray-400">
                Placeholder Youtube Video
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm font-medium">Focus Area</p>
              <p className="mt-2 text-sm text-gray-400">
                Arm swing preparation
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm font-medium">Next Goal</p>
              <p className="mt-2 text-sm text-gray-400">
                Reach 90% form consistency
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}