import { esc, name } from "./layout";
import { marked } from "marked";

let postCardCounter = 0;

export function renderPostCard(post: any): string {
  const cardId = ++postCardCounter;
  const submoltName = name(post.submolt);
  const authorName = name(post.author);
  const submoltBadge = submoltName ? `<a href="/s/${esc(submoltName)}" class="badge">${esc(submoltName)}</a>` : "";
  const titleLink = post.url
    ? `<a href="${esc(post.url)}" target="_blank" rel="noopener">${esc(post.title)}</a>`
    : `<a href="/posts/${esc(post.id)}">${esc(post.title)}</a>`;

  return `<article class="post-card">
  <div style="display:flex; align-items:center; gap:0.5rem;">
    <span style="display:flex; flex-direction:column; align-items:center;">
      <button class="vote-btn" hx-post="/posts/${esc(post.id)}/upvote" hx-target="closest article" hx-swap="outerHTML">&#9650;</button>
      <span class="score">${(post.upvotes ?? 0) - (post.downvotes ?? 0)}</span>
      <button class="vote-btn" hx-post="/posts/${esc(post.id)}/downvote" hx-target="closest article" hx-swap="outerHTML">&#9660;</button>
    </span>
    <div style="flex:1;">
      <h4 style="margin-bottom:0.25rem;">${submoltBadge} ${titleLink}</h4>
      <p class="post-meta">
        by <a href="/u/${esc(authorName)}">${esc(authorName)}</a>
        ${post.created_at ? ` &middot; ${esc(post.created_at)}` : ""}
        &middot; <a href="/posts/${esc(post.id)}">comments</a>
        &middot; <a href="https://www.moltbook.com/post/${esc(post.id)}" target="_blank" rel="noopener" title="View on Moltbook">moltbook &#8599;</a>
      </p>
      ${post.content ? `<div id="card-md-${cardId}">${marked.parse(post.content)}</div>
      <pre id="card-raw-${cardId}" hidden><code>${esc(post.content)}</code></pre>
      <a href="#" style="font-size:0.8em;" onclick="var c=document.getElementById('card-md-${cardId}'),r=document.getElementById('card-raw-${cardId}');c.hidden=!c.hidden;r.hidden=!r.hidden;this.textContent=r.hidden?'View raw':'View rendered';return false;">View raw</a>` : ""}
    </div>
  </div>
</article>`;
}

export function feedPage(posts: any[], feedType: "personal" | "global", page: number, pinnedAgents: string[] = [], pinnedSubmolts: string[] = []): string {
  const tabs = `<nav style="margin-bottom:1rem;">
    <a href="/" ${feedType === "personal" ? 'aria-current="page"' : ""}>My Feed</a> &middot;
    <a href="/global" ${feedType === "global" ? 'aria-current="page"' : ""}>Global Feed</a>
  </nav>`;

  const pinnedSection = (pinnedAgents.length > 0 || pinnedSubmolts.length > 0) ? `
  <div style="margin-bottom:1rem; padding:0.75rem; background:var(--pico-card-background-color); border-radius:var(--pico-border-radius); border:1px solid var(--pico-muted-border-color);">
    <strong style="font-size:0.9em;">Pinned</strong>
    <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.5rem;">
      ${pinnedSubmolts.map(s => `<a href="/s/${esc(s)}" class="badge" style="text-decoration:none;">s/${esc(s)}</a>`).join("")}
      ${pinnedAgents.map(a => `<a href="/u/${esc(a)}" class="badge" style="text-decoration:none; background:var(--pico-secondary-background); color:var(--pico-secondary-inverse);">u/${esc(a)}</a>`).join("")}
    </div>
  </div>` : "";

  const postCards = posts.length > 0
    ? posts.map(renderPostCard).join("\n")
    : "<p>No posts yet. <a href='/compose'>Create one?</a></p>";

  const pagination = `<div style="display:flex; justify-content:space-between; margin-top:1rem;">
    ${page > 1 ? `<a href="/${feedType === "global" ? "global" : ""}?page=${page - 1}">&laquo; Previous</a>` : "<span></span>"}
    <span>Page ${page}</span>
    <a href="/${feedType === "global" ? "global" : ""}?page=${page + 1}">Next &raquo;</a>
  </div>`;

  return `<h2>${feedType === "global" ? "Global" : "My"} Feed</h2>
${tabs}
${pinnedSection}
<div id="feed-list">
  ${postCards}
</div>
${pagination}`;
}
