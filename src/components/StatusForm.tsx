"use client";

import { useActionState, useState } from "react";
import {
  updateOrderStatus,
  type StatusChangeState,
} from "@/actions/admin-orders";

type Option = { value: string; label: string };

const initialState: StatusChangeState = { error: null };

const fieldClass =
  "mt-1 w-full rounded-lg border border-craft/40 bg-white px-3 py-2.5 text-charcoal outline-none focus:border-forest focus:ring-1 focus:ring-forest";

export default function StatusForm({
  orderNo,
  options,
}: {
  orderNo: string;
  options: Option[];
}) {
  const [state, formAction, pending] = useActionState(
    updateOrderStatus,
    initialState
  );
  const [value, setValue] = useState(options[0]?.value ?? "");
  const cancelling = value === "CANCELLED";

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="orderNo" value={orderNo} />

      <div>
        <label htmlFor="status" className="text-sm font-medium">
          নতুন অবস্থা
        </label>
        <select
          id="status"
          name="status"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={fieldClass}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {cancelling && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          বাতিল করলে পণ্যের স্টক ফেরত যাবে, আর অবস্থা পরিবর্তন করা যাবে না।
        </p>
      )}

      <div>
        <label htmlFor="note" className="text-sm font-medium">
          নোট (ঐচ্ছিক, শুধু অ্যাডমিন দেখবে)
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          maxLength={300}
          className={fieldClass}
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
        onClick={(e) => {
          if (cancelling && !window.confirm("সত্যিই অর্ডারটি বাতিল করবেন?")) {
            e.preventDefault();
          }
        }}
        className={
          "w-full rounded-lg px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto " +
          (cancelling ? "bg-red-700 hover:bg-red-800" : "bg-forest hover:bg-forest/90")
        }
      >
        {pending ? "হচ্ছে…" : cancelling ? "অর্ডার বাতিল করুন" : "অবস্থা বদলান"}
      </button>
    </form>
  );
}