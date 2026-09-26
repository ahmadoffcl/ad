import type { Aspect } from "@/lib/types";

/**
 * True-Preview — CSS phone mockups with IG / TikTok chrome.
 * The creative renders inside the real placement frame.
 */

export default function PhoneMock({
  chrome,
  handle,
  aspect,
  creative,
  caption,
}: {
  chrome: "ig" | "tiktok";
  handle: string;
  aspect: Aspect;
  creative: React.ReactNode;
  caption?: string;
}) {
  const aspectCls =
    aspect === "9:16" ? "aspect-[9/16]" : aspect === "1:1" ? "aspect-square" : "aspect-video";

  return (
    <div className="mx-auto w-full max-w-[290px] rounded-[2.4rem] border border-line bg-black p-2 shadow-lift">
      <div className="relative flex flex-col overflow-hidden rounded-[1.9rem] bg-ink">
        {/* status bar */}
        <div className="flex items-center justify-between px-5 pb-1 pt-3">
          <span className="text-[10px] font-semibold text-paper">9:41</span>
          <div className="h-5 w-20 rounded-full bg-black" />
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-paper/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-paper/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-paper/70" />
          </div>
        </div>

        {/* app header */}
        {chrome === "ig" ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-molten font-display text-[10px] font-bold text-ink">
              {handle.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-xs font-semibold text-paper">{handle}</span>
            <span className="ml-auto text-fog">•••</span>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-2 text-[11px] font-semibold text-paper">
            <span className="text-fog">Following</span>
            <span className="border-b-2 border-paper pb-0.5">For You</span>
            <span className="text-fog">🔍</span>
          </div>
        )}

        {/* creative */}
        <div className={`relative w-full ${aspectCls} bg-black`}>{creative}</div>

        {/* app footer */}
        {chrome === "ig" ? (
          <div className="px-3 pb-4 pt-2">
            <div className="flex items-center gap-3 text-paper">
              <HeartIcon />
              <CommentIcon />
              <ShareIcon />
              <span className="ml-auto">
                <BookmarkIcon />
              </span>
            </div>
            <p className="mt-1.5 text-[11px] font-semibold text-paper">12,408 likes</p>
            {caption && (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-fog">
                <span className="font-semibold text-paper">{handle}</span> {caption}
              </p>
            )}
          </div>
        ) : (
          <div className="relative px-3 pb-4 pt-2">
            <div className="absolute -top-24 right-2 flex flex-col items-center gap-4 text-paper">
              <RailIcon label="48.2K">
                <HeartIcon />
              </RailIcon>
              <RailIcon label="1,204">
                <CommentIcon />
              </RailIcon>
              <RailIcon label="Share">
                <ShareIcon />
              </RailIcon>
            </div>
            <p className="text-xs font-semibold text-paper">@{handle}</p>
            {caption && <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-paper/85">{caption}</p>}
            <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-fog">
              <span className="inline-block h-2.5 w-2.5 animate-[spin_4s_linear_infinite] rounded-full border border-fog" />
              original sound — {handle}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11.5a8.4 8.4 0 01-8.5 8.4c-1.5 0-3-.4-4.2-1L3 20l1.2-4.3a8.3 8.3 0 01-1.2-4.2A8.4 8.4 0 0111.5 3h1A8.4 8.4 0 0121 11.5z" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
    </svg>
  );
}
function BookmarkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}
function RailIcon({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span className="flex flex-col items-center gap-0.5">
      {children}
      <span className="text-[9px] font-semibold">{label}</span>
    </span>
  );
}
