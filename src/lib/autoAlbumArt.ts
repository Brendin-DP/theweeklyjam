import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * --- SETUP ---
 * Make sure you have an 'album-art' bucket in Supabase Storage
 * with RLS enabled and these policies:
 *
 * INSERT:  auth.role() = 'authenticated'
 * SELECT:  true (public)
 *
 * Add these ENV variables in your .env.local:
 * NEXT_PUBLIC_SUPABASE_URL
 * NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

// Use the same Supabase credentials as the rest of the client-side app
const supabase = createClient(
  "https://ktctqojjjdxwizztkkmc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Y3Rxb2pqamR4d2l6enRra21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDQyMjYsImV4cCI6MjA3MjM4MDIyNn0.obILD95-ZimwoI-CQlaXDN2QRr0fInbki1AOWa47O0M"
);

/**
 * Fetch official album art from iTunes API
 */
export async function fetchAlbumArt(artist: string, song: string): Promise<string | null> {
  const query = encodeURIComponent(`${artist} ${song}`);
  const url = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`iTunes API error: ${res.status}`);
    const data = await res.json();

    if (data.resultCount === 0) return null;

    const track = data.results[0];
    const artworkUrl = track.artworkUrl100?.replace("100x100bb.jpg", "600x600bb.jpg");
    return artworkUrl || null;
  } catch (error) {
    console.error("Error fetching album art:", error);
    return null;
  }
}

/**
 * Upload image to Supabase Storage and return the public URL
 */
export async function uploadAlbumArtToSupabase(imageUrl: string, coverId: string, client?: SupabaseClient): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
    const blob = await res.blob();

    const fileName = `${coverId}_${Date.now()}.jpg`;

    const sc = client ?? supabase;
    const { data, error } = await sc.storage
      .from("album-art")
      .upload(fileName, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return null;
    }

    const publicUrl = sc
      .storage
      .from("album-art")
      .getPublicUrl(data.path)
      .data.publicUrl;

    return publicUrl;
  } catch (error) {
    console.error("Error uploading album art:", error);
    return null;
  }
}

/**
 * High-level automation:
 * Fetch → Upload → Update database
 */
export async function autoFetchAndStoreAlbumArt(artist: string, song: string, coverId: string, client?: SupabaseClient) {
  try {
    console.log(`🎵 Auto-fetching album art for: ${artist} - ${song}`);

    // Step 1: Fetch from iTunes
    const fetchedArtUrl = await fetchAlbumArt(artist, song);
    if (!fetchedArtUrl) {
      console.warn("⚠️ No album art found for:", artist, song);
      return;
    }

    // Step 2: Upload to Supabase Storage
    const uploadedArtUrl = await uploadAlbumArtToSupabase(fetchedArtUrl, coverId, client);
    if (!uploadedArtUrl) {
      console.warn("⚠️ Failed to upload album art to Supabase");
      return;
    }

    // Step 3: Update the covers table
    const sc = client ?? supabase;
    console.log("🧱 Attempting DB update:", { coverId, uploadedArtUrl });
    
    const { data, error } = await sc
      .from("covers")
      .update({ album_art_url: uploadedArtUrl })
      .eq("id", coverId)
      .select();
      console.log("📦 DB update response:", { data, error });
      console.log("xxx" + uploadedArtUrl)

    if (error) {
      console.error("❌ Failed to update album_art_url in DB:", error);
      return;
    }

    console.log(`✅ Album art added for "${song}" by ${artist}`);
  } catch (error) {
    console.error("Error in autoFetchAndStoreAlbumArt:", error);
  }

  
}