"use client";

import { FormEvent } from "react";

type SupportSearchFormProps = {
  inputId: string;
  label: string;
  placeholder: string;
  className?: string;
};

const baseFormClass =
  "flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center";

export function SupportSearchForm({
  inputId,
  label,
  placeholder,
  className,
}: SupportSearchFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <form
      role="search"
      className={className ?? baseFormClass}
      onSubmit={handleSubmit}
    >
      <label
        htmlFor={inputId}
        className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500"
      >
        {label}
      </label>
      <input
        id={inputId}
        type="search"
        name="query"
        inputMode="search"
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#c2255d] focus:outline-none focus:ring-2 focus:ring-[#f3d0dc]"
      />
    </form>
  );
}
