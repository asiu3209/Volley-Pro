import Link from "next/link";

export default function Hero() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-20 text-center sm:py-24">
      <p className="mb-5 text-sm text-gray-400">
        Volleyball coaching from your own clips
      </p>

      <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-6xl">
        Upload a clip. Get clear form feedback.
      </h1>

      <p className="mt-5 max-w-xl text-base leading-7 text-gray-400 sm:text-lg">
        Pick a skill, box your player, and get a score plus tips you can use at
        the next practice.
      </p>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/login"
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-gray-200"
        >
          Start analyzing
        </Link>
        <Link
          href="/#how-it-works"
          className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          How it works
        </Link>
      </div>

      <div
        id="demo"
        className="mt-14 w-full max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-4 text-left"
      >
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-sm text-gray-400">Sample report</p>
              <h2 className="text-lg font-semibold text-white">Attack</h2>
            </div>
            <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-400">
              8.2 / 10
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs text-gray-500">Strength</p>
              <p className="mt-1 text-sm text-gray-200">Solid approach timing</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs text-gray-500">Fix next</p>
              <p className="mt-1 text-sm text-gray-200">Load the arm earlier</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs text-gray-500">Skills covered</p>
              <p className="mt-1 text-sm text-gray-200">
                Serve · Set · Block · Attack · Pass
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
