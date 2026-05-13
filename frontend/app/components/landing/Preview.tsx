export default function Preview() {
  //update once user experience is finalized
  //replace score cards with actual metrics
  //replace video
  //replace feedback
  //utube vid
  return (
    <section id="product-preview" className="mx-auto max-w-7xl px-6 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium text-gray-400">Preview</p>

        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
          See what your form is doing in seconds.
        </h2>

        <p className="mt-5 text-lg leading-8 text-gray-400">
          VolleyPro turns a regular volleyball clip into clear feedback on your
          movement, timing, and technique.
        </p>
      </div>

      <div className="mt-14 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-black p-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Uploaded Clip</p>
                <h3 className="text-lg font-semibold text-white">
                  Outside Hitter Approach
                </h3>
              </div>

              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-300">
                00:12
              </span>
            </div>

            <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-black/60">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-black">
                  ▶
                </div>
                <p className="mt-4 text-sm text-gray-400">
                  Video preview placeholder
                </p>
              </div>
            </div>

            {/* replace above ^^ once we have a demo video (if we want whole section to be the demo video, replace whole section)
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video
                className="aspect-video w-full object-cover"
                src="/volleypro-demo.mp4"
                poster="/volleypro-demo-poster.png"
                autoPlay
                muted
                loop
                playsInline
              />
            </div> */}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-black/50 p-4">
                <p className="text-sm text-gray-400">Approach</p>
                <p className="mt-1 text-lg font-semibold text-green-400">
                  Strong
                </p>
              </div>

              <div className="rounded-2xl bg-black/50 p-4">
                <p className="text-sm text-gray-400">Arm Swing</p>
                <p className="mt-1 text-lg font-semibold text-yellow-400">
                  Late
                </p>
              </div>

              <div className="rounded-2xl bg-black/50 p-4">
                <p className="text-sm text-gray-400">Landing</p>
                <p className="mt-1 text-lg font-semibold text-green-400">
                  Stable
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl bg-white/5 p-4">
            <div className="rounded-2xl bg-black/50 p-5">
              <p className="text-sm text-gray-400">Overall Form Score</p>
              <div className="mt-3 flex items-end gap-3">
                <p className="text-5xl font-bold text-white">82/100</p>
                <p className="pb-1 text-sm text-green-400">
                  Good foundation
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-black/50 p-5">
              <p className="font-medium text-white">AI Feedback</p>
              <p className="mt-3 leading-7 text-gray-400">
                Your approach timing is solid, but your hitting arm loads a
                little late. Start your arm preparation earlier as you take your
                final two steps to create more power at contact.
              </p>
            </div>

            <div className="rounded-2xl bg-black/50 p-5">
              <p className="font-medium text-white">Recommended Video</p>
              <p className="mt-3 text-gray-400">
                Placeholder youtube video
              </p>
            </div>

            <div className="rounded-2xl bg-black/50 p-5">
              <p className="font-medium text-white">Focus Area</p>
              <div className="mt-4 h-3 rounded-full bg-white/10">
                <div className="h-3 w-3/4 rounded-full bg-white" />
              </div>
              <p className="mt-3 text-sm text-gray-400">
                Arm swing preparation, 75% consistency
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}