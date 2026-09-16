import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="text-lg font-semibold tracking-tight text-white">
            VolleyPro
          </Link>
          <p className="mt-2 max-w-sm text-sm text-gray-400">
            AI coaching from your volleyball clips.
          </p>
        </div>

        <div className="flex flex-wrap gap-5 text-sm text-gray-400">
          <Link href="/#features" className="hover:text-white">
            Features
          </Link>
          <Link href="/#how-it-works" className="hover:text-white">
            How it works
          </Link>
          <Link href="/#demo" className="hover:text-white">
            Demo
          </Link>
          <Link href="/login" className="hover:text-white">
            Login
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-6 text-sm text-gray-500">
        <p>© 2026 VolleyPro</p>
      </div>
    </footer>
  );
}
