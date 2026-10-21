/** Images are fetched separately from session/chat JSON and cached privately by identity. */
export function avatarResponse(image: string | null | undefined) {
  if (!image) return new Response(null, { status: 404 });
  const headers = { "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" };
  const inline = /^data:(image\/(?:png|jpeg|webp|gif|avif));base64,([a-zA-Z0-9+/=\s]+)$/.exec(image);
  if (inline) return new Response(Buffer.from(inline[2], "base64"), { headers: { ...headers, "Content-Type": inline[1] } });
  if (image.startsWith("/api/storage/file?")) return new Response(null, { status: 302, headers: { ...headers, Location: image } });
  try { const url = new URL(image); if (url.protocol === "https:") return new Response(null, { status: 302, headers: { ...headers, Location: url.href } }); } catch { /* Invalid legacy image uses the UI fallback. */ }
  return new Response(null, { status: 404 });
}

export const chatUserSelect = { id: true, name: true, updatedAt: true } as const;
export function chatUserDto<T extends { id: string; updatedAt: Date; name: string | null }>(user: T, conversationId: string) {
  const { updatedAt, ...fields } = user;
  return { ...fields, image: `/api/chat/avatar?conversationId=${encodeURIComponent(conversationId)}&userId=${encodeURIComponent(user.id)}&v=${updatedAt.getTime()}` };
}
