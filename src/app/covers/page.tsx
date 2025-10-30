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
    song_status: string;
    album_art_url?: string | null;
  };

  const [covers, setCovers] = useState<Cover[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingCoverId, setEditingCoverId] = useState<string | number | null>(null);
  const [formValues, setFormValues] = useState({
    title: "",
    artist: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCoverId, setDeletingCoverId] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [nonDeletableCoverIds, setNonDeletableCoverIds] = useState<Set<string | number>>(new Set());
  const [albumArtFile, setAlbumArtFile] = useState<File | null>(null);

  useEffect(() => {
    loadCoversAndLocks();
  }, []);

  async function loadCoversAndLocks() {
    const [{ data, error }, recordingsResult] = await Promise.all([
      supabase
        .from("covers")
        .select("id, song_number, title, artist, song_status, album_art_url")
        .order("song_number", { ascending: true }),
      supabase
        .from("recordings")
        .select("cover_id")
        .not("mp3_url", "is", null),
    ]);
    if (error) {
      console.error("Error fetching covers:", error);
    } else if (data) {
      setCovers(data);
    }
    const recordingsData = recordingsResult.data as Array<{ cover_id: string | number } | null> | null;
    if (recordingsData && Array.isArray(recordingsData)) {
      const ids = new Set<string | number>();
      for (const row of recordingsData) {
        if (row && row.cover_id != null) ids.add(row.cover_id);
      }
      setNonDeletableCoverIds(ids);
    } else {
      setNonDeletableCoverIds(new Set());
    }
  }

  async function handleAddCoverSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (!formValues.title.trim() || !formValues.artist.trim()) {
      setFormError("Please fill in required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id ?? null;
        // Determine next song number
        let nextSongNumber = 1;
        {
          const { data: lastSongRows, error: lastErr } = await supabase
            .from("covers")
            .select("song_number")
            .order("song_number", { ascending: false })
            .limit(1);
          if (!lastErr && lastSongRows && lastSongRows.length > 0) {
            const currentMax = Number(lastSongRows[0]?.song_number ?? 0);
            nextSongNumber = Number.isFinite(currentMax) ? currentMax + 1 : 1;
          }
        }
        // Upload optional album art file if provided
        let resolvedAlbumArtUrl: string | null = null;
        if (albumArtFile) {
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData?.user?.id ?? 'anon';
          const ext = albumArtFile.name.split('.').pop() || 'jpg';
          const fileName = `${userId}_${Date.now()}.${ext}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('album-art')
            .upload(fileName, albumArtFile, { upsert: true, contentType: albumArtFile.type || 'image/jpeg' });
          if (uploadErr) {
            setFormError(uploadErr.message ?? 'Failed to upload album art.');
            setIsSubmitting(false);
            return;
          }
          resolvedAlbumArtUrl = supabase.storage.from('album-art').getPublicUrl(uploadData.path).data.publicUrl;
        }

        const insertPayload: Record<string, any> = {
          title: formValues.title.trim(),
          artist: formValues.artist.trim(),
          album_art_url: resolvedAlbumArtUrl,
          song_number: nextSongNumber,
          announced_at: new Date().toISOString(),
          announcer_id: userId,
        };
        const { error, data: created } = await supabase
          .from("covers")
          .insert([insertPayload])
          .select("id");
        if (error) {
          setFormError(error.message ?? "Failed to add cover.");
          setIsSubmitting(false);
          return;
        }
        // Set default song_status after creation to satisfy enum constraints
        if (created && created[0]?.id) {
          await supabase
            .from("covers")
            .update({ song_status: "active" })
            .eq("id", created[0].id);
        }
        // Success; list will refresh below
      } else if (modalMode === "edit" && editingCoverId != null) {
        // If a new file is provided, upload and update album_art_url; else leave existing
        let resolvedAlbumArtUrl: string | null = null;
        let shouldUpdateAlbumArt = false;
        if (albumArtFile) {
          shouldUpdateAlbumArt = true;
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData?.user?.id ?? 'anon';
          const ext = albumArtFile.name.split('.').pop() || 'jpg';
          const fileName = `${userId}_${Date.now()}.${ext}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('album-art')
            .upload(fileName, albumArtFile, { upsert: true, contentType: albumArtFile.type || 'image/jpeg' });
          if (uploadErr) {
            setFormError(uploadErr.message ?? 'Failed to upload album art.');
            setIsSubmitting(false);
            return;
          }
          resolvedAlbumArtUrl = supabase.storage.from('album-art').getPublicUrl(uploadData.path).data.publicUrl;
        }

        const updatePayload: Record<string, any> = {
          title: formValues.title.trim(),
          artist: formValues.artist.trim(),
        };
        if (shouldUpdateAlbumArt) {
          updatePayload.album_art_url = resolvedAlbumArtUrl;
        }
        const { error } = await supabase
          .from("covers")
          .update(updatePayload)
          .eq("id", editingCoverId);
        if (error) {
          setFormError(error.message ?? "Failed to update cover.");
          setIsSubmitting(false);
          return;
        }
        // Success; list will refresh below
      }
      // Refresh list
      await loadCoversAndLocks();
      // Close modal and reset form
      setIsModalOpen(false);
      setFormValues({ title: "", artist: "" });
      setAlbumArtFile(null);
      setEditingCoverId(null);
      setModalMode("create");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function openEditForCover(cover: { id: string | number; title?: string; artist?: string }) {
    setFormError(null);
    setIsSubmitting(false);
    setModalMode("edit");
    setEditingCoverId(cover.id);
    // Prefill immediately from the row data if available
    setFormValues({
      title: cover.title ?? "",
      artist: cover.artist ?? "",
    });
    // Load full details for the cover to ensure we have all fields
    const { data, error } = await supabase
      .from("covers")
      .select("id, title, artist")
      .eq("id", cover.id)
      .single();
    if (!error && data) {
      setFormValues({
        title: data.title ?? "",
        artist: data.artist ?? "",
      });
    }
    setIsModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (deletingCoverId == null) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const { error } = await supabase.from("covers").delete().eq("id", deletingCoverId);
      if (error) {
        setDeleteError(error.message ?? "Failed to delete.");
        setIsDeleting(false);
        return;
      }
      await loadCoversAndLocks();
      setIsDeleteModalOpen(false);
      setDeletingCoverId(null);
    } finally {
      setIsDeleting(false);
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

  const hasActiveSong = covers.some((c: any) => String(c.song_status || '').toLowerCase() === 'active');

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
            onClick={() => !hasActiveSong && setIsModalOpen(true)}
            className={`rounded-md px-3 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${hasActiveSong ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'}`}
            disabled={hasActiveSong}
            title={hasActiveSong ? 'An active song already exists' : 'Add a new cover'}
          >
            Add Cover
          </button>
        </div>
      </div>
      <table className="w-full table-auto border border-gray-300">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2 text-left">#</th>
            <th className="px-4 py-2 text-left">Art</th>
            <th className="px-4 py-2 text-left">Title</th>
            <th className="px-4 py-2 text-left">Artist</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredCovers.map((cover: any) => (
            <tr key={cover.id} className="border-t border-gray-300 hover:bg-gray-100">
              <td className="px-4 py-2">{cover.song_number}</td>
              <td className="px-4 py-2">
                {(() => {
                  const raw = cover.album_art_url as string | null | undefined;
                  if (!raw) return null;
                  const url = typeof raw === 'string' && (raw.startsWith('http://') || raw.startsWith('https://'))
                    ? raw
                    : supabase.storage.from('album-art').getPublicUrl(String(raw)).data.publicUrl;
                  if (!url) return null;
                  return (
                    <img src={url} alt="album art" className="h-8 w-8 rounded object-cover" />
                  );
                })()}
              </td>
              <td className="px-4 py-2">
                <Link href={`/covers/${cover.id}`} className="text-blue-600 hover:underline">
                  {cover.title}
                </Link>
              </td>
              <td className="px-4 py-2">{cover.artist}</td>
              <td className="px-4 py-2">{cover.song_status}</td>
              <td className="px-4 py-2">
                <div className="relative inline-block text-left">
                  <button
                    type="button"
                    onClick={() => setOpenMenuId((prev) => (prev === cover.id ? null : cover.id))}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm shadow-sm hover:bg-gray-50"
                  >
                    •••
                  </button>
                  {openMenuId === cover.id && (
                    <div className="absolute right-0 z-20 mt-1 w-28 origin-top-right rounded-md border border-gray-200 bg-white shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          openEditForCover(cover);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <div className="border-t border-gray-200" />
                      {(() => {
                        const hasUploadedCover = nonDeletableCoverIds.has(cover.id);
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (hasUploadedCover) return;
                              setOpenMenuId(null);
                              setDeletingCoverId(cover.id);
                              setIsDeleteModalOpen(true);
                            }}
                            title={hasUploadedCover ? "Covers uploaded, can't delete" : undefined}
                            className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${hasUploadedCover ? "cursor-not-allowed text-gray-400" : ""}`}
                            disabled={hasUploadedCover}
                          >
                            Delete
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isSubmitting && setIsModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{modalMode === "edit" ? "Edit Cover" : "Add Cover"}</h2>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCoverSubmit} className="space-y-4">
              {/*
              <div>
                <label className="mb-1 block text-sm font-medium">Album art (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAlbumArtFile(e.target.files?.[0] || null)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              */}
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
                  {isSubmitting ? (modalMode === "edit" ? "Saving..." : "Adding...") : modalMode === "edit" ? "Save" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isDeleting && setIsDeleteModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-red-600">Delete Song:</h2>
              <p className="mt-2 text-sm text-gray-700">You are about to delete this song, do you want to proceed?</p>
            </div>
            {deleteError && <p className="mb-3 text-sm text-red-600">{deleteError}</p>}
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}