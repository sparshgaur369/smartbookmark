import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BookmarksPage from "./bookmarks-page";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <BookmarksPage initialUser={user} initialBookmarks={bookmarks ?? []} />;
}
