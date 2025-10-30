import { autoFetchAndStoreAlbumArt } from "./autoAlbumArt";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function backfillAlbumArt() {
  console.log("🎨 Checking for covers missing album art...");

  const { data: covers, error } = await supabase
    .from("covers")
    .select("id, title, artist, album_art_url");

  if (error) {
    console.error("Error fetching covers:", error);
    return;
  }

  if (!covers || covers.length === 0) {
    console.log("No covers found in database.");
    return;
  }

  const missingCovers = covers.filter(
    (cover) => !cover.album_art_url && cover.artist && cover.title
  );

  if (missingCovers.length === 0) {
    console.log("✅ All covers already have album art.");
    return;
  }

  console.log(`Found ${missingCovers.length} covers missing album art.`);

  for (const cover of missingCovers) {
    try {
      console.log(`Fetching album art for: ${cover.artist} - ${cover.title}`);
      await autoFetchAndStoreAlbumArt(cover.artist, cover.title, cover.id);
    } catch (err) {
      console.error(`❌ Failed to fetch album art for ${cover.title}:`, err);
    }
  }

  console.log("🎉 Backfill complete!");
}