"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ktctqojjjdxwizztkkmc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Y3Rxb2pqamR4d2l6enRra21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDQyMjYsImV4cCI6MjA3MjM4MDIyNn0.obILD95-ZimwoI-CQlaXDN2QRr0fInbki1AOWa47O0M"
);

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topArtists, setTopArtists] = useState([]);
  const [brendinGuitars, setBrendinGuitars] = useState([]);
  const [raymondGuitars, setRaymondGuitars] = useState([]);
  const [uniqueArtistsCount, setUniqueArtistsCount] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();
          setProfile(profile);
        }

        // Fetch all covers to analyze artists
        const { data: covers, error: coversError } = await supabase
          .from('covers')
          .select('artist');
        
        if (coversError) {
          console.error('Error fetching covers:', coversError);
        } else {
          // Calculate top 10 artists
          const artistCounts = {};
          covers?.forEach(cover => {
            if (cover.artist) {
              artistCounts[cover.artist] = (artistCounts[cover.artist] || 0) + 1;
            }
          });
          
          const sortedArtists = Object.entries(artistCounts)
            .map(([artist, count]) => ({ artist, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
          
          setTopArtists(sortedArtists);
          
          // Calculate unique artists count
          const uniqueArtists = new Set(covers?.map(cover => cover.artist).filter(Boolean));
          setUniqueArtistsCount(uniqueArtists.size);
        }

        // Fetch recordings to analyze guitar usage
        const { data: recordings, error: recordingsError } = await supabase
          .from('recordings')
          .select(`
            user_id,
            guitar_id,
            guitars(name),
            profiles(display_name)
          `);
        
        if (recordingsError) {
          console.error('Error fetching recordings:', recordingsError);
        } else {
          // Find Brendin's user ID
          const { data: brendinProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('display_name', 'Brendin')
            .single();
          
          // Find Raymond's user ID
          const { data: raymondProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('display_name', 'Raymond')
            .single();

          if (brendinProfile) {
            const brendinRecordings = recordings?.filter(r => r.user_id === brendinProfile.id) || [];
            const brendinGuitarCounts = {};
            brendinRecordings.forEach(recording => {
              if (recording.guitars?.name) {
                brendinGuitarCounts[recording.guitars.name] = (brendinGuitarCounts[recording.guitars.name] || 0) + 1;
              }
            });
            
            const sortedBrendinGuitars = Object.entries(brendinGuitarCounts)
              .map(([guitar, count]) => ({ guitar, count }))
              .sort((a, b) => b.count - a.count);
            
            setBrendinGuitars(sortedBrendinGuitars);
          }

          if (raymondProfile) {
            const raymondRecordings = recordings?.filter(r => r.user_id === raymondProfile.id) || [];
            const raymondGuitarCounts = {};
            raymondRecordings.forEach(recording => {
              if (recording.guitars?.name) {
                raymondGuitarCounts[recording.guitars.name] = (raymondGuitarCounts[recording.guitars.name] || 0) + 1;
              }
            });
            
            const sortedRaymondGuitars = Object.entries(raymondGuitarCounts)
              .map(([guitar, count]) => ({ guitar, count }))
              .sort((a, b) => b.count - a.count);
            
            setRaymondGuitars(sortedRaymondGuitars);
          }
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
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
                <div key={item.artist} className="flex justify-between items-center">
                  <span className="text-sm font-medium">#{index + 1} {item.artist}</span>
                  <span className="text-sm text-gray-500">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data available</p>
          )}
        </div>

        {/* Brendin's Top Guitar */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <h2 className="text-lg font-semibold mb-4">Brendin's Top Guitar</h2>
          {brendinGuitars.length > 0 ? (
            <div className="space-y-2">
              {brendinGuitars.map((item, index) => (
                <div key={item.guitar} className="flex justify-between items-center">
                  <span className="text-sm font-medium">#{index + 1} {item.guitar}</span>
                  <span className="text-sm text-gray-500">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data available</p>
          )}
        </div>

        {/* Raymond's Top Guitar */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <h2 className="text-lg font-semibold mb-4">Raymond's Top Guitar</h2>
          {raymondGuitars.length > 0 ? (
            <div className="space-y-2">
              {raymondGuitars.map((item, index) => (
                <div key={item.guitar} className="flex justify-between items-center">
                  <span className="text-sm font-medium">#{index + 1} {item.guitar}</span>
                  <span className="text-sm text-gray-500">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data available</p>
          )}
        </div>

        {/* Unique Artists */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <h2 className="text-lg font-semibold mb-4">Unique Artists</h2>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{uniqueArtistsCount}</div>
            <p className="text-sm text-gray-500 mt-2">Total unique artists</p>
          </div>
        </div>
      </div>
    </div>
  );
}