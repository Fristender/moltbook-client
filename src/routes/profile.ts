import { layout, partial } from "../templates/layout";
import { profilePage } from "../templates/profile";
import * as api from "../api";
import { logAction, getConfig, pinAgent, unpinAgent, isAgentPinned } from "../db";

function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

export async function handleProfile(req: Request, path: string): Promise<Response | null> {
  // GET /u/:name
  const profileMatch = path.match(/^\/u\/([^/]+)$/);
  if (profileMatch && req.method === "GET") {
    const name = decodeURIComponent(profileMatch[1]);
    try {
      const agent = await api.getProfile(name);
      const profile = agent.agent ?? agent;
      const posts = agent.recentPosts ?? agent.recent_posts ?? profile.recentPosts ?? profile.recent_posts ?? [];
      const isPinned = isAgentPinned(name);
      const body = profilePage(profile, posts, false, isPinned);
      if (isHtmx(req)) return new Response(partial(body), { headers: { "Content-Type": "text/html" } });
      return new Response(layout(name, body), { headers: { "Content-Type": "text/html" } });
    } catch (e: any) {
      return new Response(layout("Error", `<p>Could not load profile: ${e.message}</p>`), { headers: { "Content-Type": "text/html" }, status: 404 });
    }
  }

  // POST /u/:name/follow
  const followMatch = path.match(/^\/u\/([^/]+)\/follow$/);
  if (followMatch && req.method === "POST") {
    const name = decodeURIComponent(followMatch[1]);
    try {
      await api.followAgent(name);
      logAction("follow", name);
      if (isHtmx(req)) return new Response(partial("", { type: "success", message: `Followed ${name}` }), { headers: { "Content-Type": "text/html" } });
      return Response.redirect(`/u/${name}`, 303);
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /u/:name/unfollow
  const unfollowMatch = path.match(/^\/u\/([^/]+)\/unfollow$/);
  if (unfollowMatch && req.method === "POST") {
    const name = decodeURIComponent(unfollowMatch[1]);
    try {
      await api.unfollowAgent(name);
      logAction("unfollow", name);
      if (isHtmx(req)) return new Response(partial("", { type: "success", message: `Unfollowed ${name}` }), { headers: { "Content-Type": "text/html" } });
      return Response.redirect(`/u/${name}`, 303);
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /u/:name/pin
  const pinMatch = path.match(/^\/u\/([^/]+)\/pin$/);
  if (pinMatch && req.method === "POST") {
    const name = decodeURIComponent(pinMatch[1]);
    pinAgent(name);
    logAction("pin_agent", name);
    if (isHtmx(req)) return new Response(partial("", { type: "success", message: `Pinned ${name}` }), { headers: { "Content-Type": "text/html" } });
    return Response.redirect(`/u/${name}`, 303);
  }

  // POST /u/:name/unpin
  const unpinMatch = path.match(/^\/u\/([^/]+)\/unpin$/);
  if (unpinMatch && req.method === "POST") {
    const name = decodeURIComponent(unpinMatch[1]);
    unpinAgent(name);
    logAction("unpin_agent", name);
    if (isHtmx(req)) return new Response(partial("", { type: "success", message: `Unpinned ${name}` }), { headers: { "Content-Type": "text/html" } });
    return Response.redirect(`/u/${name}`, 303);
  }

  // POST /profile/update — update own description
  if (path === "/profile/update" && req.method === "POST") {
    try {
      const form = await req.formData();
      const description = form.get("description")?.toString().trim() || undefined;
      await api.updateProfile({ description });
      logAction("update_profile", undefined, description);
      return Response.redirect("/settings", 303);
    } catch (e: any) {
      return new Response(layout("Error", `<p>${e.message}</p>`), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /profile/avatar
  if (path === "/profile/avatar" && req.method === "POST") {
    try {
      const form = await req.formData();
      const file = form.get("avatar");
      if (!file || !(file instanceof Blob)) {
        return Response.redirect("/settings", 303);
      }
      await api.uploadAvatar(file);
      logAction("upload_avatar");
      return Response.redirect("/settings", 303);
    } catch (e: any) {
      return new Response(layout("Error", `<p>${e.message}</p>`), { headers: { "Content-Type": "text/html" } });
    }
  }

  return null;
}
