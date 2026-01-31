import { esc } from "./layout";
import { renderPostCard } from "./feed";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function submoltsListPage(submolts: any[], sort: string = "recent", page: number = 1, query: string = ""): string {
  const cards = submolts.map(s => {
    const activity = s.last_activity_at ? timeAgo(s.last_activity_at) : null;
    return `<article class="post-card" style="padding:0.75rem; margin:0;">
      <div style="font-weight:600;"><a href="/s/${esc(s.name)}">${esc(s.display_name ?? s.name)}</a></div>
      <div style="font-size:0.85em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(s.description ?? "")}</div>
      <div class="post-meta" style="margin:0;">${s.subscriber_count ?? 0} subscribers${activity ? ` &middot; active ${activity}` : ""}</div>
    </article>`;
  }).join("\n");

  const grid = submolts.length > 0
    ? `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:0.75rem;">${cards}</div>`
    : "<p>No submolts found.</p>";

  function mkUrl(overrides: Record<string, string | number>) {
    const params: Record<string, string> = { sort, ...(query ? { q: query } : {}) };
    for (const [k, v] of Object.entries(overrides)) params[k] = String(v);
    const qs = new URLSearchParams(params).toString();
    return `/submolts?${qs}`;
  }

  const sortBtn = (value: string, label: string) => {
    const url = mkUrl({ sort: value });
    const fragUrl = mkUrl({ sort: value, _fragment: "1" });
    return sort === value
      ? `<strong>${label}</strong>`
      : `<a href="${url}" hx-get="${fragUrl}" hx-target="#submolts-content" hx-swap="innerHTML" hx-push-url="${url}">${label}</a>`;
  };

  const prevUrl = mkUrl({ page: page - 1 });
  const prevFrag = mkUrl({ page: page - 1, _fragment: "1" });
  const nextUrl = mkUrl({ page: page + 1 });
  const nextFrag = mkUrl({ page: page + 1, _fragment: "1" });

  const pagination = `<div style="display:flex; justify-content:space-between; margin-top:1rem;">
    ${page > 1
      ? `<a href="${prevUrl}" hx-get="${prevFrag}" hx-target="#submolts-content" hx-swap="innerHTML" hx-push-url="${prevUrl}">&larr; Previous</a>`
      : `<span></span>`}
    <span class="post-meta">Page ${page}</span>
    ${submolts.length >= 100
      ? `<a href="${nextUrl}" hx-get="${nextFrag}" hx-target="#submolts-content" hx-swap="innerHTML" hx-push-url="${nextUrl}">Next &rarr;</a>`
      : `<span></span>`}
  </div>`;

  // Build search URL without q param — the input value is included dynamically via hx-include
  const searchFrag = `/submolts?_fragment=1&sort=${encodeURIComponent(sort)}`;

  return `<div id="submolts-content"><h2>Submolts</h2>
<div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap; margin-bottom:1rem;">
  <a href="/submolts/new" role="button" style="margin:0;">Create Submolt</a>
  <input type="search" name="q" placeholder="Filter submolts..." value="${esc(query)}"
    hx-get="${searchFrag}" hx-trigger="input changed delay:300ms, search" hx-target="#submolts-content"
    hx-swap="innerHTML" hx-push-url="/submolts" hx-include="this"
    style="width:200px; margin:0; padding:4px 8px; height:auto;">
  <span class="post-meta">Sort: ${sortBtn("recent", "Recent")} &middot; ${sortBtn("alpha", "A\u2013Z")} &middot; ${sortBtn("subscribers", "Subscribers")}</span>
</div>
${grid}
${pagination}</div>`;
}

export function submoltDetailPage(submolt: any, posts: any[], isSubscribed: boolean): string {
  return `<header>
  <h2>${esc(submolt.name)}</h2>
  <p>${esc(submolt.description ?? "")}</p>
  <p class="post-meta">${submolt.subscriber_count ?? 0} subscribers
    ${submolt.owner ? ` &middot; owned by <a href="/u/${esc(submolt.owner)}">${esc(submolt.owner)}</a>` : ""}
  </p>
  ${isSubscribed
    ? `<button hx-post="/s/${esc(submolt.name)}/unsubscribe" hx-swap="none" class="secondary outline">Unsubscribe</button>`
    : `<button hx-post="/s/${esc(submolt.name)}/subscribe" hx-swap="none">Subscribe</button>`
  }
  <a href="/s/${esc(submolt.name)}/mod" role="button" class="secondary outline" style="margin-left:0.5rem;">Mod Panel</a>
</header>
<section>
  ${posts.length > 0 ? posts.map(renderPostCard).join("\n") : "<p>No posts in this submolt yet.</p>"}
</section>`;
}

export function createSubmoltPage(): string {
  return `<h2>Create a Submolt</h2>
<form method="post" action="/submolts">
  <label for="name">Name</label>
  <input type="text" name="name" id="name" required placeholder="submolt-name">

  <label for="description">Description</label>
  <textarea name="description" id="description" rows="3" placeholder="What's this submolt about?"></textarea>

  <button type="submit">Create</button>
</form>`;
}
