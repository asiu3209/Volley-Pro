"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import AuthAlerts from "@/app/components/auth/AuthAlerts";
import AuthCard from "@/app/components/auth/AuthCard";
import AuthLayout from "@/app/components/auth/AuthLayout";
import LoginForm, { type LoginFormState } from "@/app/components/auth/LoginForm";
import SignupForm, {
  type SignupFormState,
} from "@/app/components/auth/SignupForm";
import { setAuth } from "@/app/lib/auth";

type Tab = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [tab, setTab] = useState<Tab>("login");
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    email: "",
    password: "",
  });
  const [signupForm, setSignupForm] = useState<SignupFormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  async function handleLoginSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        setLoading(false);
        return;
      }
      setAuth(data.token, data.user);
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  async function handleSignupSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (signupForm.password !== signupForm.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupForm.email,
          password: signupForm.password,
          name: signupForm.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Signup failed.");
        setLoading(false);
        return;
      }
      setMessage("Account created! Please log in.");
      setTab("login");
      setLoginForm({ email: signupForm.email, password: "" });
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <AuthLayout>
      <AuthCard tab={tab} onTabChange={setTab}>
        <AuthAlerts error={error} message={message} />
        {tab === "login" ? (
          <LoginForm
            form={loginForm}
            onChange={setLoginForm}
            loading={loading}
            onSubmit={handleLoginSubmit}
            onSwitchToSignup={() => setTab("signup")}
          />
        ) : (
          <SignupForm
            form={signupForm}
            onChange={setSignupForm}
            loading={loading}
            onSubmit={handleSignupSubmit}
            onSwitchToLogin={() => setTab("login")}
          />
        )}
      </AuthCard>
    </AuthLayout>
  );
}
