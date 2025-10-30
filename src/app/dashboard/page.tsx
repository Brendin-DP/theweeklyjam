"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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