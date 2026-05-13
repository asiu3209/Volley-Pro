import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-white/10">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/landing" className="text-lg font-semibold tracking-tight">
          Volley-Pro
        </Link>

        <div className="hidden items-center gap-8 text-sm text-gray-300 md:flex">
          <a href="#features" className="hover:text-white">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-white">
            How it works
          </a>
          <a href="#demo" className="hover:text-white">
            Demo
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-300 hover:text-white">
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