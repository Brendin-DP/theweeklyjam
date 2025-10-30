"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ktctqojjjdxwizztkkmc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Y3Rxb2pqamR4d2l6enRra21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDQyMjYsImV4cCI6MjA3MjM4MDIyNn0.obILD95-ZimwoI-CQlaXDN2QRr0fInbki1AOWa47O0M"
);

export default function CoversPage() {
  type Cover = {
    id: string | number;
    song_number: string | number;
    title: string;
    artist: string;
    status: string;
  };

  const [covers, setCovers] = useState<Cover[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    title: "",
    artist: "",
    album: "",
    album_art: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCovers() {
      const { data, error } = await supabase
        .from("covers")
        .select("id, song_number, title, artist, status")
        .order("song_number", { ascending: true });
      if (error) {
        console.error("Error fetching covers:", error);
      } else {
        setCovers(data);
      }
    }
    fetchCovers();
  }, []);

  async function handleAddCoverSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (!formValues.title.trim() || !formValues.artist.trim()) {
      setFormError("Please fill in required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      const insertPayload: Record<string, any> = {
        title: formValues.title.trim(),
        artist: formValues.artist.trim(),
        album: formValues.album.trim() || null,
        album_art: formValues.album_art.trim() || null,
        announced_at: new Date().toISOString(),
        announcer_id: userId,
      };
      const { error } = await supabase.from("covers").insert([insertPayload]);
      if (error) {
        setFormError(error.message ?? "Failed to add cover.");
        setIsSubmitting(false);
        return;
      }
      // Refresh list
      const { data, error: fetchError } = await supabase
        .from("covers")
        .select("id, song_number, title, artist, status")
        .order("song_number", { ascending: true });
      if (!fetchError && data) {
        setCovers(data);
      }
      // Close modal and reset form
      setIsModalOpen(false);
      setFormValues({ title: "", artist: "", album: "", album_art: "" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredCovers = covers.filter((cover: Cover) => {
    if (!searchQuery) return true;
    const query = String(searchQuery).toLowerCase();
    const title = String(cover.title ?? "").toLowerCase();
    const artist = String(cover.artist ?? "").toLowerCase();
    const songNumber = String(cover.song_number ?? "");
    return (
      title.includes(query) ||
      artist.includes(query) ||
      songNumber.includes(query)
    );
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Covers List</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-64 max-w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Cover
          </button>
        </div>
      </div>
      <table className="w-full table-auto border border-gray-300">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2 text-left">#</th>
            <th className="px-4 py-2 text-left">Title</th>
            <th className="px-4 py-2 text-left">Artist</th>
            <th className="px-4 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredCovers.map((cover: any) => (
            <tr key={cover.id} className="border-t border-gray-300 hover:bg-gray-100">
              <td className="px-4 py-2">{cover.song_number}</td>
              <td className="px-4 py-2">
                <Link href={`/covers/${cover.id}`} className="text-blue-600 hover:underline">
                  {cover.title}
                </Link>
              </td>
              <td className="px-4 py-2">{cover.artist}</td>
              <td className="px-4 py-2">{cover.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isSubmitting && setIsModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Cover</h2>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCoverSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Song name<span className="text-red-600">*</span></label>
                <input
                  type="text"
                  value={formValues.title}
                  onChange={(e) => setFormValues((s) => ({ ...s, title: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter song name"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Artist name<span className="text-red-600">*</span></label>
                <input
                  type="text"
                  value={formValues.artist}
                  onChange={(e) => setFormValues((s) => ({ ...s, artist: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter artist name"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Album (optional)</label>
                <input
                  type="text"
                  value={formValues.album}
                  onChange={(e) => setFormValues((s) => ({ ...s, album: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter album name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Album art URL (optional)</label>
                <input
                  type="url"
                  value={formValues.album_art}
                  onChange={(e) => setFormValues((s) => ({ ...s, album_art: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => !isSubmitting && setIsModalOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}