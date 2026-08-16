import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";

declare const self: {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const TODAY_PATH = "/api/v1/me/today";
const TODAY_CACHE = "arise-today";
const TODAY_MAX_AGE_SECONDS = 60 * 60;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(({ request, url }) => request.method === "GET" && url.pathname === TODAY_PATH, networkFirstToday);

async function networkFirstToday({ request }: { request: Request }): Promise<Response> {
  const cache = await caches.open(TODAY_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set("sw-cached-at", String(Date.now()));
      await cache.put(
        request,
        new Response(await response.clone().arrayBuffer(), {
          status: response.status,
          statusText: response.statusText,
          headers,
        }),
      );
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached && !isTodayCacheExpired(cached)) return cached;
    throw new TypeError("Failed to fetch");
  }
}

function isTodayCacheExpired(response: Response): boolean {
  const stamped = Number(response.headers.get("sw-cached-at"));
  const cachedAt = Number.isFinite(stamped) ? stamped : Date.parse(response.headers.get("date") ?? "");
  if (!Number.isFinite(cachedAt)) return false;
  return Date.now() - cachedAt > TODAY_MAX_AGE_SECONDS * 1000;
}
