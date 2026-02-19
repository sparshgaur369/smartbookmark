"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChatBox } from "@/components/chat-box";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  user_id: string;
  created_at: string;
};

export default function BookmarksPage({
  initialUser,
  initialBookmarks,
}: {
  initialUser: User;
  initialBookmarks: Bookmark[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel("bookmarks-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${initialUser.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Bookmark>) => {
          if (payload.eventType === "INSERT") {
            setBookmarks((prev) => {
              if (prev.some((b) => b.id === (payload.new as Bookmark).id)) return prev;
              return [payload.new as Bookmark, ...prev];
            });
          } else if (payload.eventType === "DELETE") {
            setBookmarks((prev) =>
              prev.filter((b) => b.id !== (payload.old as Bookmark).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialUser.id, supabase]);

  const addBookmark = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!url.trim() || !title.trim()) return;
      setLoading(true);

      const { data, error } = await supabase
        .from("bookmarks")
        .insert({ url: url.trim(), title: title.trim(), user_id: initialUser.id })
        .select()
        .single();

      if (!error && data) {
        setBookmarks((prev) => {
          if (prev.some((b) => b.id === data.id)) return prev;
          return [data, ...prev];
        });
      }

      setUrl("");
      setTitle("");
      setLoading(false);
    },
    [url, title, initialUser.id, supabase]
  );

  const deleteBookmark = useCallback(
    async (id: string) => {
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      await supabase.from("bookmarks").delete().eq("id", id);
    },
    [supabase]
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="relative h-dvh flex flex-col bg-[#050505] text-zinc-200 font-sans selection:bg-white/20 overflow-hidden">
      {/* Ambient 3D Background Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      <div className="pointer-events-none absolute -top-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-white/[0.03] blur-[120px]"></div>
      <div className="pointer-events-none absolute -bottom-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-indigo-500/[0.03] blur-[120px]"></div>

      <header className="relative z-10 flex-none border-b border-white/[0.04] bg-black/40 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.08] to-transparent shadow-[0_0_20px_rgba(255,255,255,0.03)] backdrop-blur-md">
              <svg className="h-5 w-5 text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h1 className="text-xl font-medium tracking-tight text-zinc-100">
              Smart Bookmarks
            </h1>
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden text-sm font-medium text-zinc-500 sm:block">
              {initialUser.email}
            </span>
            <button
              onClick={handleLogout}
              className="group relative overflow-hidden rounded-full border border-white/[0.05] bg-white/[0.02] px-5 py-2 text-sm font-medium text-zinc-400 transition-all duration-300 hover:bg-white/[0.08] hover:text-zinc-100 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-95"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col gap-8 overflow-hidden px-6 py-6 lg:flex-row lg:gap-8">
        {/* Bookmarks Section - Scrollable */}
        <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 lg:pr-2">
          <div className="mx-auto w-full max-w-3xl space-y-8">
            <form onSubmit={addBookmark} className="group relative rounded-[2rem] border border-white/[0.04] bg-white/[0.01] p-2 shadow-2xl backdrop-blur-xl transition-all hover:border-white/[0.08]">
              <div className="absolute -inset-0.5 rounded-[2rem] bg-gradient-to-b from-white/[0.08] to-transparent opacity-0 blur transition duration-500 group-hover:opacity-100"></div>
              <div className="relative flex flex-col sm:flex-row rounded-3xl bg-black/40 backdrop-blur-md">

                <input
                  type="text"
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full flex-1 bg-transparent px-6 py-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                  required
                />

                <div className="hidden w-px bg-white/[0.05] sm:block"></div>
                <div className="h-px w-full bg-white/[0.05] sm:hidden"></div>

                <input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full flex-1 bg-transparent px-6 py-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                  required
                />

                <div className="p-2 sm:pl-0">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-full w-full items-center justify-center rounded-2xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-900 shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all hover:scale-[0.98] hover:bg-white active:scale-95 disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
                  >
                    {loading ? "Adding..." : "Add Bookmark"}
                  </button>
                </div>
              </div>
            </form>

            {bookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/[0.02] bg-white/[0.01] py-24 text-center backdrop-blur-sm">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.05] bg-white/[0.02]">
                  <svg className="h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-zinc-400">
                  No bookmarks yet. Add one above!
                </p>
              </div>
            ) : (
              <ul className="space-y-3 pb-8">
                {bookmarks.map((bookmark) => (
                  <li
                    key={bookmark.id}
                    className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-white/[0.03] bg-white/[0.01] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.08] hover:bg-white/[0.03] hover:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] sm:p-5"
                  >
                    <div className="min-w-0 flex-1 pr-4">
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-1 block truncate text-[15px] font-medium text-zinc-200 transition-colors hover:text-white"
                      >
                        {bookmark.title}
                      </a>
                      <p className="truncate text-xs text-zinc-500 transition-colors group-hover:text-zinc-400">
                        {bookmark.url}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteBookmark(bookmark.id)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.04] bg-white/[0.02] text-zinc-500 opacity-0 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                      aria-label="Delete bookmark"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Chat Section */}
        <div className="w-full shrink-0 h-[500px] lg:h-auto lg:w-[400px] xl:w-[450px]">
          <ChatBox />
        </div>
      </main>
    </div>
  );
}
