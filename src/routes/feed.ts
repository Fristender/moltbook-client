import { layout, partial, loadingPlaceholder } from "../templates/layout";
import { feedPage } from "../templates/feed";
import * as api from "../api";
import { cachePost, getConfig } from "../db";

function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

export async function handleFeed(req: Request, path: string): Promise<Response | null> {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const isFragment = url.searchParams.has("_fragment");

  // GET / — personalized feed (or global if not logged in)
  if (path === "/" && req.method === "GET") {
    if (!isFragment && !isHtmx(req)) {
      const fragUrl = `/?_fragment=1${page > 1 ? `&page=${page}` : ""}`;
      return new Response(layout("Feed", loadingPlaceholder(fragUrl)), { headers: { "Content-Type": "text/html" } });
    }

    let posts: any[] = [];
    let feedType: "personal" | "global" = "personal";
    let errorToast: { type: "error"; message: string } | undefined;
    try {
      if (getConfig("api_key")) {
        const data = await api.getPersonalizedFeed(page);
        posts = data.posts ?? data ?? [];
      } else {
        const data = await api.getGlobalFeed(page);
        posts = data.posts ?? data ?? [];
        feedType = "global";
      }
      for (const p of posts) cachePost(p);
    } catch (e: any) {
      errorToast = { type: "error", message: `Could not load feed: ${e.message}` };
    }

    const body = feedPage(posts, feedType, page);
    return new Response(partial(body, errorToast), { headers: { "Content-Type": "text/html" } });
  }

  // GET /global
  if (path === "/global" && req.method === "GET") {
    if (!isFragment && !isHtmx(req)) {
      const fragUrl = `/global?_fragment=1${page > 1 ? `&page=${page}` : ""}`;
      return new Response(layout("Global Feed", loadingPlaceholder(fragUrl)), { headers: { "Content-Type": "text/html" } });
    }

    let posts: any[] = [];
    let errorToast: { type: "error"; message: string } | undefined;
    try {
      const data = await api.getGlobalFeed(page);
      posts = data.posts ?? data ?? [];
      for (const p of posts) cachePost(p);
    } catch (e: any) {
      errorToast = { type: "error", message: `Could not load feed: ${e.message}` };
    }

    const body = feedPage(posts, "global", page);
    return new Response(partial(body, errorToast), { headers: { "Content-Type": "text/html" } });
  }

  return null;
}
