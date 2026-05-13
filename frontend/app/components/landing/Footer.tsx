import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/landing" className="text-lg font-semibold tracking-tight">
            VolleyPro
          </Link>

          <p className="mt-3 max-w-md text-sm leading-6 text-gray-400">
            AI-powered volleyball form analysis that helps players understand
            their technique, improve their mechanics, and train with more
            purpose.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-sm text-gray-400 sm:flex-row sm:items-center sm:gap-6">
          {/* 
            Update these links once the final routes/sections are decided.
            These currently point to landing page sections or placeholder routes.
          */}
          <a href="#features" className="hover:text-white">
            Features
          </a>

          <a href="#product-preview" className="hover:text-white">
            Product Preview
          </a>

          <a href="#demo" className="hover:text-white">
            Demo
          </a>

          <Link href="/login" className="hover:text-white">
            Login
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 VolleyPro. All rights reserved.</p>

        <div className="flex gap-5">
          {/* 
            Replace these with real pages if the project adds them.
            For now, they can stay as placeholders or be removed.

          <a href="#" className="hover:text-gray-300">
            Privacy
          </a>

          <a href="#" className="hover:text-gray-300">
            Terms
          </a>

          <a href="#" className="hover:text-gray-300">
            Contact
          </a>
          */}
        </div>
      </div>
    </footer>
  );
}