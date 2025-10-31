"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  "https://ktctqojjjdxwizztkkmc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Y3Rxb2pqamR4d2l6enRra21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDQyMjYsImV4cCI6MjA3MjM4MDIyNn0.obILD95-ZimwoI-CQlaXDN2QRr0fInbki1AOWa47O0M"
);

type Cover = {
  id: string | number;
  song_number: number;
  title: string;
  artist: string;
  announcer_id: string | null;
};

type Profile = {
  id: string;
  display_name: string;
};

export default function ManageSubmittersPage() {
  const [covers, setCovers] = useState<Cover[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Record<string | number, string | null>>({});
  const [bulkSelectUserId, setBulkSelectUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [coversResult, profilesResult] = await Promise.all([
          supabase
            .from("covers")
            .select("id, song_number, title, artist, announcer_id")
            .order("song_number", { ascending: true }),
          supabase
            .from("profiles")
            .select("id, display_name")
            .order("display_name"),
        ]);

        if (coversResult.data) {
          setCovers(coversResult.data);
          const initialSelections: Record<string | number, string | null> = {};
          coversResult.data.forEach((cover) => {
            initialSelections[cover.id] = cover.announcer_id;
          });
          setSelections(initialSelections);
        }

        if (profilesResult.data) {
          setProfiles(profilesResult.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleBulkSelect = (userId: string | null) => {
    setBulkSelectUserId(userId);
    const newSelections: Record<string | number, string | null> = {};
    covers.forEach((cover) => {
      newSelections[cover.id] = userId;
    });
    setSelections(newSelections);
  };

  const handleSingleSelect = (coverId: string | number, userId: string | null) => {
    setSelections((prev) => ({ ...prev, [coverId]: userId }));
    setBulkSelectUserId(null); // Clear bulk selection when individual change is made
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const updates = covers.map((cover) => ({
        id: cover.id,
        announcer_id: selections[cover.id] || null,
      }));

      // Update each cover individually
      const updatePromises = updates.map((update) =>
        supabase
          .from("covers")
          .update({ announcer_id: update.announcer_id })
          .eq("id", update.id)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter((r: any) => r.error);

      if (errors.length > 0) {
        setSaveMessage(`Error: Some updates failed. ${errors[0]?.error?.message || "Unknown error"}`);
      } else {
        setSaveMessage("Successfully saved all submitter assignments!");
        // Refresh data
        const { data: refreshedCovers } = await supabase
          .from("covers")
          .select("id, song_number, title, artist, announcer_id")
          .order("song_number", { ascending: true });
        if (refreshedCovers) {
          setCovers(refreshedCovers);
          const newSelections: Record<string | number, string | null> = {};
          refreshedCovers.forEach((cover) => {
            newSelections[cover.id] = cover.announcer_id;
          });
          setSelections(newSelections);
        }
      }
    } catch (error) {
      setSaveMessage(`Error saving: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-blue-600 hover:underline mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-2xl font-semibold">Manage Song Submitters</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save All Changes"}
        </button>
      </div>

      {saveMessage && (
        <div className={`mb-4 p-3 rounded-md ${saveMessage.includes("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {saveMessage}
        </div>
      )}

      {/* Bulk Select Section */}
      <div className="bg-white rounded-lg shadow-md p-6 border mb-6">
        <h2 className="text-lg font-semibold mb-4">Bulk Select Submitter</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="bulkSelect"
              checked={bulkSelectUserId === null}
              onChange={() => handleBulkSelect(null)}
              className="cursor-pointer"
            />
            <span>None</span>
          </label>
          {profiles.map((profile) => (
            <label key={profile.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="bulkSelect"
                checked={bulkSelectUserId === profile.id}
                onChange={() => handleBulkSelect(profile.id)}
                className="cursor-pointer"
              />
              <span>{profile.display_name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Songs List */}
      <div className="bg-white rounded-lg shadow-md p-6 border">
        <h2 className="text-lg font-semibold mb-4">All Songs</h2>
        <div className="space-y-4">
          {covers.map((cover) => (
            <div key={cover.id} className="flex items-center gap-6 p-4 border-b last:border-b-0">
              <div className="flex-1">
                <div className="font-semibold">#{cover.song_number} - {cover.title}</div>
                <div className="text-sm text-gray-600">{cover.artist}</div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`submitter-${cover.id}`}
                    checked={selections[cover.id] === null}
                    onChange={() => handleSingleSelect(cover.id, null)}
                    className="cursor-pointer"
                  />
                  <span className="text-sm">None</span>
                </label>
                {profiles.map((profile) => (
                  <label key={profile.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`submitter-${cover.id}`}
                      checked={selections[cover.id] === profile.id}
                      onChange={() => handleSingleSelect(cover.id, profile.id)}
                      className="cursor-pointer"
                    />
                    <span className="text-sm">{profile.display_name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

