"use client";

import { useState, useEffect } from "react";

/** Only renders children after delay (ms). Use so fast loads show nothing, slow loads show skeleton. */
export function DelayedSkeleton({
  delay = 280,
  children,
}: {
  delay?: number;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;
  return <>{children}</>;
}
