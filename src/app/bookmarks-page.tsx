"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Smart Bookmarks
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {initialUser.email}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <form onSubmit={addBookmark} className="mb-8 space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              required
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Bookmark"}
          </button>
        </form>

        {bookmarks.length === 0 ? (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            No bookmarks yet. Add one above!
          </p>
        ) : (
          <ul className="space-y-2">
            {bookmarks.map((bookmark) => (
              <li
                key={bookmark.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {bookmark.title}
                  </a>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {bookmark.url}
                  </p>
                </div>
                <button
                  onClick={() => deleteBookmark(bookmark.id)}
                  className="ml-3 shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                  aria-label="Delete bookmark"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
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
      </main>
    </div>
  );
}
