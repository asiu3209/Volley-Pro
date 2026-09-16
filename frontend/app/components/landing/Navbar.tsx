import Link from "next/link";

type Props = {
  /** Highlight Login when already on the auth page */
  active?: "login" | null;
};

export default function Navbar({ active = null }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f1117]/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          VolleyPro
        </Link>

        <div className="hidden items-center gap-8 text-sm text-gray-300 md:flex">
          <Link href="/#features" className="hover:text-white">
            Features
          </Link>
          <Link href="/#how-it-works" className="hover:text-white">
            How it works
          </Link>
          <Link href="/#demo" className="hover:text-white">
            Demo
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className={`text-sm hover:text-white ${
              active === "login" ? "text-white" : "text-gray-300"
            }`}
          >
            Login
          </Link>

          <Link
            href="/login"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200"
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
}
