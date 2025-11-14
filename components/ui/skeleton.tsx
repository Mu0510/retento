import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "text" | "rect" | "circle";
};

export function Skeleton({ className = "", variant = "rect", ...rest }: SkeletonProps) {
  const baseClass =
    "animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700";
  const variantClass =
    variant === "circle"
      ? "rounded-full"
      : variant === "text"
        ? "h-4 rounded"
        : "rounded-lg";
  return <div className={`${baseClass} ${variantClass} ${className}`} {...rest} />;
}
