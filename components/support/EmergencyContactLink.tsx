"use client";

import { type MouseEvent, type ReactNode, useCallback } from "react";

type EmergencyContactLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export function EmergencyContactLink({
  href,
  className,
  children,
}: EmergencyContactLinkProps) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey
      ) {
        return;
      }

      event.preventDefault();
      window.open(href, "_blank", "noopener,noreferrer");
    },
    [href],
  );

  return (
    <a
      href={href}
      rel="noopener noreferrer"
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
