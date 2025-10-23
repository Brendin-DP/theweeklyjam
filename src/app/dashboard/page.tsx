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
  const [myGuitars, setMyGuitars] = useState([]);
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
          .select('user_id, guitar_id');
        
        if (recordingsError) {
          console.error('Error fetching recordings:', recordingsError);
        } else {
          console.log('All recordings:', recordings);
          
          // Fetch all guitars
          const { data: guitars, error: guitarsError } = await supabase
            .from('guitars')
            .select('id, name, user_id');
          
          if (guitarsError) {
            console.error('Error fetching guitars:', guitarsError);
          } else {
            console.log('All guitars:', guitars);
            
            // Fetch all profiles to get user names
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, display_name');
            
            if (profilesError) {
              console.error('Error fetching profiles:', profilesError);
            } else {
              console.log('All profiles:', profiles);
              
              // Create lookup maps
              const guitarMap = {};
              guitars?.forEach(guitar => {
                guitarMap[guitar.id] = guitar;
              });
              
              const profileMap = {};
              profiles?.forEach(profile => {
                profileMap[profile.id] = profile;
              });
              
              // Group recordings by user and analyze their guitar usage
              const userGuitarCounts = {};
              
              recordings?.forEach(recording => {
                if (recording.user_id && recording.guitar_id) {
                  const userId = recording.user_id;
                  const guitarId = recording.guitar_id;
                  const guitar = guitarMap[guitarId];
                  const profile = profileMap[userId];
                  
                  if (guitar && profile) {
                    const userName = profile.display_name || 'Unknown User';
                    const guitarName = guitar.name;
                    
                    if (!userGuitarCounts[userId]) {
                      userGuitarCounts[userId] = {
                        userName,
                        guitars: {}
                      };
                    }
                    
                    userGuitarCounts[userId].guitars[guitarName] = 
                      (userGuitarCounts[userId].guitars[guitarName] || 0) + 1;
                  }
                }
              });
              
              console.log('User guitar counts:', userGuitarCounts);
              
              // Find current user's recordings
              if (user) {
                const myEntry = userGuitarCounts[user.id];
                if (myEntry) {
                  const sortedMyGuitars = Object.entries(myEntry.guitars)
                    .map(([guitar, count]) => ({ guitar, count }))
                    .sort((a, b) => b.count - a.count);
                  setMyGuitars(sortedMyGuitars);
                  console.log('My guitars:', sortedMyGuitars);
                } else {
                  console.log('No recordings found for current user');
                }
              }
              
              // Find Brendin's recordings
              const brendinEntry = Object.entries(userGuitarCounts).find(([userId, data]) => 
                data.userName === 'Brendin'
              );
              
              if (brendinEntry) {
                const [, brendinData] = brendinEntry;
                const sortedBrendinGuitars = Object.entries(brendinData.guitars)
                  .map(([guitar, count]) => ({ guitar, count }))
                  .sort((a, b) => b.count - a.count);
                setBrendinGuitars(sortedBrendinGuitars);
                console.log('Brendin guitars:', sortedBrendinGuitars);
              }
              
              // Find Raymond's recordings
              const raymondEntry = Object.entries(userGuitarCounts).find(([userId, data]) => 
                data.userName === 'Raymond'
              );
              
              if (raymondEntry) {
                const [, raymondData] = raymondEntry;
                const sortedRaymondGuitars = Object.entries(raymondData.guitars)
                  .map(([guitar, count]) => ({ guitar, count }))
                  .sort((a, b) => b.count - a.count);
                setRaymondGuitars(sortedRaymondGuitars);
                console.log('Raymond guitars:', sortedRaymondGuitars);
              }
            }
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

        {/* My Top Guitar */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <h2 className="text-lg font-semibold mb-4">My Top Guitar</h2>
          {myGuitars.length > 0 ? (
            <div className="space-y-2">
              {myGuitars.map((item, index) => (
                <div key={item.guitar} className="flex justify-between items-center">
                  <span className="text-sm font-medium">#{index + 1} {item.guitar}</span>
                  <span className="text-sm text-gray-500">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recordings found</p>
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