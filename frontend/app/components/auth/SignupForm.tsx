interface SignupFormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

import type { FormEvent } from "react";

interface Props {
  form: SignupFormState;
  onChange: (next: SignupFormState) => void;
  loading: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onSwitchToLogin: () => void;
}

export default function SignupForm({
  form,
  onChange,
  loading,
  onSubmit,
  onSwitchToLogin,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Full Name
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          className="w-full bg-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 transition"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
          className="w-full bg-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 transition"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Password
        </label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => onChange({ ...form, password: e.target.value })}
          className="w-full bg-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 transition"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Confirm Password
        </label>
        <input
          type="password"
          value={form.confirmPassword}
          onChange={(e) =>
            onChange({ ...form, confirmPassword: e.target.value })
          }
          className="w-full bg-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 transition"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-gray-200 transition-colors disabled:opacity-60"
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>
      <p className="text-center text-xs text-gray-400">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-white hover:text-gray-200 font-semibold"
        >
          Log in
        </button>
      </p>
    </form>
  );
}

export type { SignupFormState };
