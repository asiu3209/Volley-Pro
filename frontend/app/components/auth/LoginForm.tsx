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
      <div className="flex items-center justify-end">
        <button
          type="button"
          className="text-xs text-gray-400 hover:text-white"
        >
          Forgot password?
        </button>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-gray-200 transition-colors disabled:opacity-60"
      >
        {loading ? "Logging in..." : "Log In"}
      </button>
      <p className="text-center text-xs text-gray-400">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="text-white hover:text-gray-200 font-semibold"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}

export type { LoginFormState };
