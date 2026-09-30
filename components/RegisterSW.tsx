"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHabits } from "./HabitsProvider";

export default function RegisterSW() {
  const router = useRouter();
  const { reload } = useHabits();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "navigate" && typeof e.data.url === "string") router.push(e.data.url);
      if (e.data?.type === "refresh") reload();
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [router, reload]);
  return null;
}
