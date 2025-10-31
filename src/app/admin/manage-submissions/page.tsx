"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ktctqojjjdxwizztkkmc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Y3Rxb2pqamR4d2l6enRra21jIiwicm9zZSI6ImFub24iLCJpYXQiOjE3NTY4MDQyMjYsImV4cCI6MjA3MjM4MDIyNn0.obILD95-ZimwoI-CQlaXDN2QRr0fInbki1AOWa47O0M"
);

type Cover = {
  id: string | number;
  song_number: number;
  title: string;
  artist: string;
};

type Guitar = {
  id: string;
  name: string;
};

type Recording = {
  id: string;
  cover_id: string | number;
  guitar_id: string;
  mp3_url: string;
};

export default function ManageSubmissionsPage() {
  const [covers, setCovers] = useState<Cover[]>([]);
  const [guitars, setGuitars] = useState<Guitar[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Record<string | number, { guitarId: string; audioFile: File | null }>>({});
  const [existingRecordings, setExistingRecordings] = useState<Map<string | number, Recording>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [bulkGuitarId, setBulkGuitarId] = useState<string>("");

  useEffect(() => {
    async function fetchData() {
      try {
        // Try to get session first
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        let currentUser = null;
        
        if (session?.user) {
          currentUser = session.user;
        } else if (!sessionError) {
          // Fallback to getUser if no session
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError) {
            console.error("Auth error:", authError);
          } else {
            currentUser = user;
          }
        }

        setUser(currentUser);
        
        if (!currentUser) {
          setLoading(false);
          return;
        }

        const [coversResult, guitarsResult, recordingsResult] = await Promise.all([
          supabase
            .from("covers")
            .select("id, song_number, title, artist")
            .order("song_number", { ascending: true }),
          supabase
            .from("guitars")
            .select("id, name")
            .eq("user_id", currentUser.id)
            .order("name"),
          supabase
            .from("recordings")
            .select("id, cover_id, guitar_id, mp3_url")
            .eq("user_id", currentUser.id),
        ]);

        console.log("Fetched data:", { 
          coversCount: coversResult.data?.length || 0, 
          guitarsCount: guitarsResult.data?.length || 0,
          recordingsCount: recordingsResult.data?.length || 0,
          coversError: coversResult.error 
        });

        if (coversResult.error) {
          console.error("Error fetching covers:", coversResult.error);
        }

        if (coversResult.data) {
          setCovers(coversResult.data);
          const initialSelections: Record<string | number, { guitarId: string; audioFile: File | null }> = {};
          coversResult.data.forEach((cover) => {
            initialSelections[cover.id] = { guitarId: "", audioFile: null };
          });
          setSelections(initialSelections);
        } else {
          console.warn("No covers data received");
        }

        if (guitarsResult.data) {
          setGuitars(guitarsResult.data);
        }

        if (recordingsResult.data) {
          const recordingMap = new Map<string | number, Recording>();
          recordingsResult.data.forEach((rec: any) => {
            recordingMap.set(rec.cover_id, rec);
            // Pre-populate selections with existing data
            setSelections((prev) => ({
              ...prev,
              [rec.cover_id]: {
                guitarId: rec.guitar_id || "",
                audioFile: null,
              },
            }));
          });
          setExistingRecordings(recordingMap);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleBulkGuitarSelect = (guitarId: string) => {
    setBulkGuitarId(guitarId);
    setSelections((prev) => {
      const updated = { ...prev };
      covers.forEach((cover) => {
        updated[cover.id] = {
          ...updated[cover.id],
          guitarId,
        };
      });
      return updated;
    });
  };

  const handleSingleGuitarSelect = (coverId: string | number, guitarId: string) => {
    setSelections((prev) => ({
      ...prev,
      [coverId]: {
        ...prev[coverId],
        guitarId,
      },
    }));
    setBulkGuitarId(""); // Clear bulk selection
  };

  const handleFileSelect = (coverId: string | number, file: File | null) => {
    setSelections((prev) => ({
      ...prev,
      [coverId]: {
        ...prev[coverId],
        audioFile: file,
      },
    }));
  };

  const handleSave = async () => {
    if (!user) {
      setSaveMessage("Error: User not found");
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const updates: Array<{ coverId: string | number; guitarId: string; audioFile: File | null; existingRecId?: string }> = [];

      covers.forEach((cover) => {
        const selection = selections[cover.id];
        if (!selection || !selection.guitarId) return; // Skip if no guitar selected

        const existingRec = existingRecordings.get(cover.id);
        updates.push({
          coverId: cover.id,
          guitarId: selection.guitarId,
          audioFile: selection.audioFile,
          existingRecId: existingRec?.id,
        });
      });

      // Process each update
      for (const update of updates) {
        try {
          let mp3Url: string;

          if (update.audioFile) {
            // Upload new audio file
            const fileExt = update.audioFile.name.split('.').pop();
            const fileName = `${user.id}_${Date.now()}_${update.coverId}.${fileExt}`;
            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from('recordings-media')
              .upload(fileName, update.audioFile, { upsert: true });

            if (uploadErr) {
              console.error(`Error uploading for cover ${update.coverId}:`, uploadErr);
              continue;
            }
            mp3Url = uploadData.path;
          } else {
            // Use existing mp3_url or placeholder
            const existingRec = existingRecordings.get(update.coverId);
            mp3Url = existingRec?.mp3_url || 'no-audio-uploaded';
          }

          if (update.existingRecId) {
            // Update existing recording
            await supabase
              .from('recordings')
              .update({
                guitar_id: update.guitarId,
                mp3_url: mp3Url,
              })
              .eq('id', update.existingRecId);
          } else {
            // Create new recording
            await supabase
              .from('recordings')
              .insert({
                cover_id: update.coverId,
                user_id: user.id,
                guitar_id: update.guitarId,
                mp3_url: mp3Url,
              });
          }
        } catch (error) {
          console.error(`Error processing cover ${update.coverId}:`, error);
        }
      }

      setSaveMessage("Successfully saved all submissions!");
      
      // Refresh recordings
      const { data: refreshedRecs } = await supabase
        .from("recordings")
        .select("id, cover_id, guitar_id, mp3_url")
        .eq("user_id", user.id);
      
      if (refreshedRecs) {
        const recordingMap = new Map<string | number, Recording>();
        refreshedRecs.forEach((rec: any) => {
          recordingMap.set(rec.cover_id, rec);
        });
        setExistingRecordings(recordingMap);
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

  if (!user) {
    return (
      <div className="text-center py-8">
        <p>Unable to load user session. Please try refreshing the page.</p>
        <Link href="/admin" className="text-blue-600 hover:underline mt-2 inline-block">
          ← Back to Admin
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-blue-600 hover:underline mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-2xl font-semibold">Manage Song Submissions</h1>
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

      {/* Bulk Guitar Select */}
      <div className="bg-white rounded-lg shadow-md p-6 border mb-6">
        <h2 className="text-lg font-semibold mb-4">Bulk Select Guitar</h2>
        <select
          value={bulkGuitarId}
          onChange={(e) => handleBulkGuitarSelect(e.target.value)}
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">-- Select guitar for all covers --</option>
          {guitars.map((guitar) => (
            <option key={guitar.id} value={guitar.id}>
              {guitar.name}
            </option>
          ))}
        </select>
      </div>

      {/* Covers List */}
      <div className="bg-white rounded-lg shadow-md p-6 border">
        <h2 className="text-lg font-semibold mb-4">All Covers</h2>
        {covers.length === 0 ? (
          <p className="text-gray-500 text-sm">No covers found. Covers will appear here once they are created.</p>
        ) : (
          <div className="space-y-4">
            {covers.map((cover) => {
            const selection = selections[cover.id] || { guitarId: "", audioFile: null };
            const hasExisting = existingRecordings.has(cover.id);
            return (
              <div key={cover.id} className="flex items-start gap-6 p-4 border-b last:border-b-0">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">#{cover.song_number} - {cover.title}</div>
                  <div className="text-sm text-gray-600">{cover.artist}</div>
                  {hasExisting && (
                    <span className="inline-block mt-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      Existing submission
                    </span>
                  )}
                </div>
                <div className="flex gap-4 items-center">
                  <select
                    value={selection.guitarId}
                    onChange={(e) => handleSingleGuitarSelect(cover.id, e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select guitar...</option>
                    {guitars.map((guitar) => (
                      <option key={guitar.id} value={guitar.id}>
                        {guitar.name}
                      </option>
                    ))}
                  </select>
                  <label className="flex flex-col items-center cursor-pointer">
                    <span className="text-xs text-gray-600 mb-1">
                      {selection.audioFile ? selection.audioFile.name : "No file selected"}
                    </span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleFileSelect(cover.id, e.target.files?.[0] || null)}
                      className="text-sm cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}

