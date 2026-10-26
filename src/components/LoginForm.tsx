"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/actions/admin-auth";

const inputClass =
  "mt-1 w-full rounded-lg border border-craft/40 bg-white px-3 py-2.5 text-charcoal outline-none focus:border-forest focus:ring-1 focus:ring-forest";

const initialState: LoginState = { error: null };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form
      action={formAction}
      className="mt-6 space-y-4 rounded-xl border border-craft/30 bg-white p-6"
    >
      <div>
        <label htmlFor="email" className="text-sm font-medium">
          ইমেইল
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          defaultValue={state.email ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium">
          পাসওয়ার্ড
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          className={inputClass}
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-forest px-6 py-3 font-semibold text-white hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "যাচাই হচ্ছে…" : "লগইন"}
      </button>
    </form>
  );
}