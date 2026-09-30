// Uno por Ciento · service worker
// Recibe los recordatorios push y maneja los botones "Hecho" / "En 30 min".

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Uno por Ciento", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Uno por Ciento";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      renotify: !!data.tag,
      data: { url: data.url || "/", habitId: data.habitId },
      actions: data.actions || [],
    })
  );
});

async function focusOrOpen(url) {
  const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const c of all) {
    if (new URL(c.url).origin === self.location.origin) {
      await c.focus();
      c.postMessage({ type: "navigate", url });
      return;
    }
  }
  await self.clients.openWindow(url);
}

async function refreshClients() {
  const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  all.forEach((c) => c.postMessage({ type: "refresh" }));
}

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  const { url, habitId } = n.data || {};
  n.close();

  if ((event.action === "done" || event.action === "later") && habitId) {
    event.waitUntil(
      fetch("/api/push/action", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, action: event.action }),
      })
        .then((res) => {
          if (!res.ok) return focusOrOpen(url || "/");
          return refreshClients();
        })
        .catch(() => focusOrOpen(url || "/"))
    );
    return;
  }
  event.waitUntil(focusOrOpen(url || "/"));
});
