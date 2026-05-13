interface LoginFormState {
  email: string;
  password: string;
}

import type { FormEvent } from "react";

interface Props {
  form: LoginFormState;
  onChange: (next: LoginFormState) => void;
  loading: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onSwitchToSignup: () => void;
}

export default function LoginForm({
  form,
  onChange,
  loading,
  onSubmit,
  onSwitchToSignup,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
          className="w-full bg-gray-700 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition"
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
          className="w-full bg-gray-700 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition"
          required
        />
      </div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          className="text-xs text-orange-500 hover:text-orange-400"
        >
          Forgot password?
        </button>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-60"
      >
        {loading ? "Logging in..." : "Log In"}
      </button>
      <p className="text-center text-xs text-gray-400">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="text-orange-500 hover:text-orange-400 font-semibold"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}

export type { LoginFormState };
