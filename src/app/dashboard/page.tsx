"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { backfillAlbumArt } from "@/lib/backfillAlbumArt";

// Supabase config
const supabase = createClient(
  "https://ktctqojjjdxwizztkkmc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Y3Rxb2pqamR4d2l6enRra21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDQyMjYsImV4cCI6MjA3MjM4MDIyNn0.obILD95-ZimwoI-CQlaXDN2QRr0fInbki1AOWa47O0M"
);

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ display_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [topArtists, setTopArtists] = useState<Array<{ artist: string; count: number }>>([]);
  const [brendinGuitars, setBrendinGuitars] = useState<Array<{ guitar: string; count: number }>>([]);
  const [raymondGuitars, setRaymondGuitars] = useState<Array<{ guitar: string; count: number }>>([]);
  const [uniqueArtistsCount, setUniqueArtistsCount] = useState(0);
  const [uniqueOnceCount, setUniqueOnceCount] = useState(0);
  const [totalCoversCount, setTotalCoversCount] = useState(0);
  const [featuredCover, setFeaturedCover] = useState<any>(null);
  const [featuredArtistOccurrences, setFeaturedArtistOccurrences] = useState<number>(0);
  const [isFeaturedMenuOpen, setIsFeaturedMenuOpen] = useState(false);
  const [isDeletingFeatured, setIsDeletingFeatured] = useState(false);
  const [showFeaturedDeleteConfirm, setShowFeaturedDeleteConfirm] = useState(false);
  const [bothUsersSubmitted, setBothUsersSubmitted] = useState(false);
  const [featuredHasRecordings, setFeaturedHasRecordings] = useState(false);
  const [carouselCovers, setCarouselCovers] = useState<any[]>([]);
  const [carouselRecordings, setCarouselRecordings] = useState<Map<string | number, { brendin?: any; raymond?: any }>>(new Map());
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .single();
          setProfile(profile);
        }

        // Fetch all covers to backfill album art

        // 🎨 Backfill album art for missing covers (admin-only)
if (user?.email === "your@email.com") {
  backfillAlbumArt();

  const [backfillDone, setBackfillDone] = useState(false);

useEffect(() => {
  if (user && !backfillDone) {
    backfillAlbumArt();
    setBackfillDone(true);
  }
}, [user]);
}

        // Fetch all covers to analyze artist stats
        const { data: covers, error: coversError } = await supabase
          .from("covers")
          .select("artist");

        if (coversError) {
          console.error("Error fetching covers:", coversError);
        } else {
          const artistCounts: Record<string, number> = {};
          covers?.forEach((cover: { artist: string | null }) => {
            if (cover.artist) {
              artistCounts[cover.artist] =
                (artistCounts[cover.artist] || 0) + 1;
            }
          });

          const sortedArtists = Object.entries(artistCounts)
            .map(([artist, count]) => ({ artist, count: Number(count) }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

          setTopArtists(sortedArtists);

          const uniqueArtists = new Set(
            covers?.map((cover) => cover.artist).filter(Boolean)
          );
          setUniqueArtistsCount(uniqueArtists.size);

          // Unique-once artists (appear exactly once)
          const onceOnly = Object.values(artistCounts).filter((c) => c === 1)
            .length;
          setUniqueOnceCount(onceOnly);
          setTotalCoversCount(covers?.length || 0);
        }

        // Fetch recordings with guitar name
        const { data: recordings, error: recordingsError } = await supabase
          .from("recordings")
          .select("user_id, guitar_id, guitars(name)");

        if (recordingsError) {
          console.error("Error fetching recordings:", recordingsError);
        } else {
          const guitarUsageByUser: Record<string, Record<string, number>> = {};

          recordings?.forEach((rec: any) => {
            const userId = rec?.user_id as string | null;
            const guitarName: string | undefined = Array.isArray(rec?.guitars)
              ? rec.guitars[0]?.name
              : rec?.guitars?.name;

            if (!userId || !guitarName) return;

            if (!guitarUsageByUser[userId]) {
              guitarUsageByUser[userId] = {};
            }

            guitarUsageByUser[userId][guitarName] =
              (guitarUsageByUser[userId][guitarName] || 0) + 1;
          });

          const getSortedGuitars = (userId: string) => {
            const usage = guitarUsageByUser[userId] || {};
            return Object.entries(usage)
              .map(([guitar, count]) => ({ guitar, count: Number(count) }))
              .sort((a, b) => b.count - a.count);
          };

          // Replace this with Raymond’s actual user_id
          const brendinId = "10167d94-8c45-45a9-9ff0-b07bbc59ee7f";
          const raymondId = "d10577b4-91a2-4aaf-b0bd-20b126978545";

          setBrendinGuitars(getSortedGuitars(brendinId));
          setRaymondGuitars(getSortedGuitars(raymondId));
        }

        // Featured cover: song_status = active
        const { data: activeCovers, error: activeErr } = await supabase
          .from("covers")
          .select("id, title, artist, song_status, song_number, album_art_url")
          .eq("song_status", "active")
          .order("song_number", { ascending: true })
          .limit(1);
        if (!activeErr && activeCovers && activeCovers.length > 0) {
          setFeaturedCover(activeCovers[0]);
          const { count } = await supabase
            .from("covers")
            .select("id", { count: "exact", head: true })
            .eq("artist", activeCovers[0].artist);
          setFeaturedArtistOccurrences(count || 0);
          // Check if both target users submitted a recording for this cover
          try {
            const { data: recs } = await supabase
              .from('recordings')
              .select('user_id')
              .eq('cover_id', activeCovers[0].id);
            const submittedUserIds = new Set((recs || []).map((r: any) => r.user_id));
            const brendinId = '10167d94-8c45-45a9-9ff0-b07bbc59ee7f';
            const raymondId = 'd10577b4-91a2-4aaf-b0bd-20b126978545';
            setBothUsersSubmitted(submittedUserIds.has(brendinId) && submittedUserIds.has(raymondId));
            setFeaturedHasRecordings((recs || []).length > 0);
          } catch {
            setBothUsersSubmitted(false);
            setFeaturedHasRecordings(false);
          }
        } else {
          // Fallback: last completed song when no active exists
          const { data: completed, error: completedErr } = await supabase
            .from('covers')
            .select('id, title, artist, song_status, song_number, album_art_url')
            .eq('song_status', 'completed')
            .order('song_number', { ascending: false })
            .limit(1);
          if (!completedErr && completed && completed.length > 0) {
            setFeaturedCover(completed[0]);
            const { count } = await supabase
              .from('covers')
              .select('id', { count: 'exact', head: true })
              .eq('artist', completed[0].artist);
            setFeaturedArtistOccurrences(count || 0);
            try {
              const { data: recs } = await supabase
                .from('recordings')
                .select('user_id')
                .eq('cover_id', completed[0].id);
              const submittedUserIds = new Set((recs || []).map((r: any) => r.user_id));
              const brendinId = '10167d94-8c45-45a9-9ff0-b07bbc59ee7f';
              const raymondId = 'd10577b4-91a2-4aaf-b0bd-20b126978545';
              setBothUsersSubmitted(submittedUserIds.has(brendinId) && submittedUserIds.has(raymondId));
              setFeaturedHasRecordings((recs || []).length > 0);
            } catch {
              setBothUsersSubmitted(false);
              setFeaturedHasRecordings(false);
            }
          } else {
            setFeaturedCover(null);
            setFeaturedArtistOccurrences(0);
            setBothUsersSubmitted(false);
            setFeaturedHasRecordings(false);
          }
        }

        // Fetch all covers for carousel (latest first)
        const { data: allCovers } = await supabase
          .from("covers")
          .select("id, song_number, title, artist, album_art_url")
          .order("song_number", { ascending: false });
        
        if (allCovers) {
          setCarouselCovers(allCovers);
          
          // Fetch all recordings for these covers
          const coverIds = allCovers.map(c => c.id);
          if (coverIds.length > 0) {
            const { data: allRecordings } = await supabase
              .from("recordings")
              .select("id, cover_id, user_id, mp3_url")
              .in("cover_id", coverIds)
              .not("mp3_url", "eq", "no-audio-uploaded");
            
            if (allRecordings) {
              const brendinId = "10167d94-8c45-45a9-9ff0-b07bbc59ee7f";
              const raymondId = "d10577b4-91a2-4aaf-b0bd-20b126978545";
              const recordingsMap = new Map<string | number, { brendin?: any; raymond?: any }>();
              
              allRecordings.forEach((rec: any) => {
                if (!recordingsMap.has(rec.cover_id)) {
                  recordingsMap.set(rec.cover_id, {});
                }
                const coverRecordings = recordingsMap.get(rec.cover_id)!;
                if (rec.user_id === brendinId) {
                  coverRecordings.brendin = rec;
                } else if (rec.user_id === raymondId) {
                  coverRecordings.raymond = rec;
                }
              });
              
              setCarouselRecordings(recordingsMap);
            }
          }
        }
      } catch (error) {
        console.error("Error in dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">
        Welcome to your Dashboard, {profile?.display_name || user?.email}
      </h1>
      {/* Featured Song (Active) */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Featured Song</h2>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-md border bg-gray-100">
              {(() => {
                const raw = featuredCover?.album_art_url as string | null | undefined;
                if (!raw) return null;
                const url = typeof raw === 'string' && (raw.startsWith('http://') || raw.startsWith('https://'))
                  ? raw
                  : supabase.storage.from('album-art').getPublicUrl(String(raw)).data.publicUrl;
                if (!url) return null;
                return <img src={url} alt="album art" className="h-full w-full object-cover" />;
              })()}
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">#{featuredCover?.song_number ?? '—'}</span>
                <h2 className="text-xl font-semibold">{featuredCover?.title ?? 'No Planned song'}</h2>
              </div>
              <p className="text-gray-700">Artist: {featuredCover?.artist ?? '—'}</p>
              {featuredCover && (
                <p className="text-xs text-gray-500 mt-1">Artist occurrences: {featuredArtistOccurrences}</p>
              )}
              
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            {!bothUsersSubmitted && (
              <Link
                href={featuredCover ? `/covers/${featuredCover.id}` : "#"}
                className={`rounded-md px-3 py-2 text-sm font-medium shadow-sm ${featuredCover ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed pointer-events-none'}`}
                title={featuredCover ? 'Submit Cover' : 'No active song'}
              >
                Submit Cover
              </Link>
            )}
            {featuredCover?.song_status === 'completed' && (
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                Song completed
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsFeaturedMenuOpen((v) => !v)}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm shadow-sm hover:bg-gray-50"
              disabled={!featuredCover}
              title={!featuredCover ? 'No Planned song' : 'Actions'}
            >
              •••
            </button>
            {isFeaturedMenuOpen && featuredCover && (
              <div className="absolute right-0 z-10 mt-1 w-32 origin-top-right rounded-md border border-gray-200 bg-white shadow-lg">
                <a
                  href={`/covers/${featuredCover.id}`}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  Edit
                </a>
                <div className="border-t border-gray-200" />
                <button
                  type="button"
                  onClick={() => { if (!featuredHasRecordings) { setIsFeaturedMenuOpen(false); setShowFeaturedDeleteConfirm(true); } }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-red-50 ${featuredHasRecordings ? 'text-gray-400 cursor-not-allowed hover:bg-white' : 'text-red-600'}`}
                  title={featuredHasRecordings ? 'Covers uploaded, cannot delete' : 'Delete'}
                  disabled={featuredHasRecordings}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation for featured */}
      {showFeaturedDeleteConfirm && featuredCover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isDeletingFeatured && setShowFeaturedDeleteConfirm(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-red-600">Delete Featured Song:</h2>
              <p className="mt-2 text-sm text-gray-700">You are about to delete this song, do you want to proceed?</p>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => !isDeletingFeatured && setShowFeaturedDeleteConfirm(false)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                disabled={isDeletingFeatured}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!featuredCover) return;
                  setIsDeletingFeatured(true);
                  try {
                    const { error } = await supabase.from('covers').delete().eq('id', featuredCover.id);
                    if (!error) {
                      // Refresh featured
                      const { data: planned } = await supabase
                        .from('covers')
                        .select('id, title, artist, song_status, song_number, album_art_url')
                      .eq('song_status', 'active')
                        .order('song_number', { ascending: true })
                        .limit(1);
                      if (planned && planned.length > 0) {
                        setFeaturedCover(planned[0]);
                        const { count } = await supabase
                          .from('covers')
                          .select('id', { count: 'exact', head: true })
                          .eq('artist', planned[0].artist);
                        setFeaturedArtistOccurrences(count || 0);
                        try {
                          const { data: recs } = await supabase
                            .from('recordings')
                            .select('user_id')
                            .eq('cover_id', planned[0].id);
                          const submittedUserIds = new Set((recs || []).map((r: any) => r.user_id));
                          const brendinId = '10167d94-8c45-45a9-9ff0-b07bbc59ee7f';
                          const raymondId = 'd10577b4-91a2-4aaf-b0bd-20b126978545';
                          setBothUsersSubmitted(submittedUserIds.has(brendinId) && submittedUserIds.has(raymondId));
                          setFeaturedHasRecordings((recs || []).length > 0);
                        } catch {
                          setBothUsersSubmitted(false);
                          setFeaturedHasRecordings(false);
                        }
                      } else {
                        // fallback to last completed
                        const { data: completed } = await supabase
                          .from('covers')
                          .select('id, title, artist, song_status, song_number, album_art_url')
                          .eq('song_status', 'completed')
                          .order('song_number', { ascending: false })
                          .limit(1);
                        if (completed && completed.length > 0) {
                          setFeaturedCover(completed[0]);
                          const { count } = await supabase
                            .from('covers')
                            .select('id', { count: 'exact', head: true })
                            .eq('artist', completed[0].artist);
                          setFeaturedArtistOccurrences(count || 0);
                          try {
                            const { data: recs } = await supabase
                              .from('recordings')
                              .select('user_id')
                              .eq('cover_id', completed[0].id);
                            const submittedUserIds = new Set((recs || []).map((r: any) => r.user_id));
                            const brendinId = '10167d94-8c45-45a9-9ff0-b07bbc59ee7f';
                            const raymondId = 'd10577b4-91a2-4aaf-b0bd-20b126978545';
                            setBothUsersSubmitted(submittedUserIds.has(brendinId) && submittedUserIds.has(raymondId));
                            setFeaturedHasRecordings((recs || []).length > 0);
                          } catch {
                            setBothUsersSubmitted(false);
                            setFeaturedHasRecordings(false);
                          }
                        } else {
                          setFeaturedCover(null);
                          setFeaturedArtistOccurrences(0);
                          setBothUsersSubmitted(false);
                          setFeaturedHasRecordings(false);
                        }
                      }
                      setShowFeaturedDeleteConfirm(false);
                    }
                  } finally {
                    setIsDeletingFeatured(false);
                  }
                }}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={isDeletingFeatured}
              >
                {isDeletingFeatured ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Song Carousel */}
      {carouselCovers.length > 0 && (
        <div className="mb-6 rounded-lg border bg-white p-6 shadow-md">
          <h2 className="text-lg font-semibold mb-6">Song Carousel</h2>
          {carouselCovers[carouselIndex] && (() => {
            const currentCover = carouselCovers[carouselIndex];
            const recordings = carouselRecordings.get(currentCover.id) || {};
            const brendinId = "10167d94-8c45-45a9-9ff0-b07bbc59ee7f";
            const raymondId = "d10577b4-91a2-4aaf-b0bd-20b126978545";
            
            const albumArtUrl = (() => {
              const raw = currentCover.album_art_url as string | null | undefined;
              if (!raw) return null;
              if (typeof raw === 'string' && (raw.startsWith('http://') || raw.startsWith('https://'))) {
                return raw;
              }
              return supabase.storage.from('album-art').getPublicUrl(String(raw)).data.publicUrl;
            })();

            const getRecordingUrl = (recording: any) => {
              if (!recording || !recording.mp3_url) return null;
              return supabase.storage.from('recordings-media').getPublicUrl(recording.mp3_url).data.publicUrl;
            };

            const brendinUrl = recordings.brendin ? getRecordingUrl(recordings.brendin) : null;
            const raymondUrl = recordings.raymond ? getRecordingUrl(recordings.raymond) : null;

            return (
              <div className="flex flex-col md:flex-row gap-6 items-center">
                {/* Navigation Arrow - Left (Previous) */}
                <button
                  onClick={() => setCarouselIndex((prev) => (prev === 0 ? carouselCovers.length - 1 : prev - 1))}
                  className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors self-center"
                  aria-label="Previous song"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Album Art */}
                <div className="flex-shrink-0">
                  <div className="w-64 h-64 rounded-lg overflow-hidden border bg-gray-100 shadow-lg">
                    {albumArtUrl ? (
                      <img src={albumArtUrl} alt={`${currentCover.title} album art`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Album Art
                      </div>
                    )}
                  </div>
                </div>

                {/* Song Details and Recordings */}
                <div className="flex-1 flex flex-col gap-4">
                  <div>
                    <div className="text-2xl font-bold">#{currentCover.song_number} - {currentCover.title}</div>
                    <div className="text-lg text-gray-600">{currentCover.artist}</div>
                  </div>

                  {/* Recordings Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Brendin's Recording */}
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <h3 className="text-sm font-semibold mb-2 text-gray-700">Brendin's Recording</h3>
                      {brendinUrl ? (
                        <audio controls className="w-full" src={brendinUrl}>
                          Your browser does not support the audio element.
                        </audio>
                      ) : (
                        <div className="text-sm text-gray-500 italic py-4 text-center">No recording added</div>
                      )}
                    </div>

                    {/* Raymond's Recording */}
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <h3 className="text-sm font-semibold mb-2 text-gray-700">Raymond's Recording</h3>
                      {raymondUrl ? (
                        <audio controls className="w-full" src={raymondUrl}>
                          Your browser does not support the audio element.
                        </audio>
                      ) : (
                        <div className="text-sm text-gray-500 italic py-4 text-center">No recording added</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Navigation Arrow - Right (Next) */}
                <button
                  onClick={() => setCarouselIndex((prev) => (prev === carouselCovers.length - 1 ? 0 : prev + 1))}
                  className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors self-center"
                  aria-label="Next song"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Mobile Navigation */}
                <div className="flex md:hidden gap-4 w-full justify-center mt-4">
                  <button
                    onClick={() => setCarouselIndex((prev) => (prev === 0 ? carouselCovers.length - 1 : prev - 1))}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                    aria-label="Previous song"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="flex items-center text-sm text-gray-600">
                    {carouselIndex + 1} of {carouselCovers.length}
                  </span>
                  <button
                    onClick={() => setCarouselIndex((prev) => (prev === carouselCovers.length - 1 ? 0 : prev + 1))}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                    aria-label="Next song"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Top 10 Artists */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <h2 className="text-lg font-semibold mb-4">Top 10 Artists</h2>
          {topArtists.length > 0 ? (
            <div className="space-y-2">
              {topArtists.map((item, index) => (
                <div key={item.artist} className="flex justify-between">
                  <span className="text-sm font-medium">
                    #{index + 1} {item.artist}
                  </span>
                  <span className="text-sm text-gray-500">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data available</p>
          )}
        </div>

        {/* Brendin's Guitars */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <h2 className="text-lg font-semibold mb-4">Brendin's Top Guitars</h2>
          {brendinGuitars.length > 0 ? (
            <div className="space-y-2">
              {brendinGuitars.map((item, index) => (
                <div key={item.guitar} className="flex justify-between">
                  <span className="text-sm font-medium">
                    #{index + 1} {item.guitar}
                  </span>
                  <span className="text-sm text-gray-500">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recordings found</p>
          )}
        </div>

        {/* Raymond's Guitars */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <h2 className="text-lg font-semibold mb-4">Raymond's Top Guitars</h2>
          {raymondGuitars.length > 0 ? (
            <div className="space-y-2">
              {raymondGuitars.map((item, index) => (
                <div key={item.guitar} className="flex justify-between">
                  <span className="text-sm font-medium">
                    #{index + 1} {item.guitar}
                  </span>
                  <span className="text-sm text-gray-500">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recordings found</p>
          )}
        </div>

        {/* Unique Artists Count with Unique-Once Ratio Pie */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <h2 className="text-lg font-semibold mb-4">Unique Artists</h2>
          <div className="text-center">
            {(() => {
              const ratio = totalCoversCount > 0 ? uniqueArtistsCount / totalCoversCount : 0;
              const pct = Math.round(ratio * 100);
              const deg = Math.round(ratio * 360);
              return (
                <div className="mx-auto mb-4 flex items-center justify-center">
                  <div
                    className="relative h-24 w-24 rounded-full"
                    style={{
                      background: `conic-gradient(#22c55e ${deg}deg, #e5e7eb 0)`,
                    }}
                    title={`${pct}% unique-once artists`}
                  >
                    <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-700">{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="text-3xl font-bold text-blue-600">
              {uniqueArtistsCount}
            </div>
            <p className="text-sm text-gray-500 mt-2">All-time unique artists</p>
            <p className="text-xs text-gray-400 mt-1">{uniqueArtistsCount} unique artists out of {totalCoversCount} songs</p>
          </div>
        </div>
      </div>
    </div>
  );
}