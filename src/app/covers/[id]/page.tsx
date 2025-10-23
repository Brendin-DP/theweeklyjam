"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ktctqojjjdxwizztkkmc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Y3Rxb2pqamR4d2l6enRra21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDQyMjYsImV4cCI6MjA3MjM4MDIyNn0.obILD95-ZimwoI-CQlaXDN2QRr0fInbki1AOWa47O0M"
);

export default function CoverDetailPage({ params }: { params: { id: string } }) {
  const [cover, setCover] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [guitars, setGuitars] = useState([]);
  const [selectedGuitar, setSelectedGuitar] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [submittedCovers, setSubmittedCovers] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchData() {
      // Fetch cover details
      const { data: coverData, error: coverError } = await supabase
        .from("covers")
        .select("*")
        .eq("id", params.id)
        .single();

      if (coverError) {
        console.error("Error loading cover:", coverError);
      } else {
        setCover(coverData);
      }

      // Fetch user
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Fetch user's guitars
      if (user) {
        const { data: guitarsData } = await supabase
          .from("guitars")
          .select("*")
          .eq("user_id", user.id);
        setGuitars(guitarsData || []);

        // Fetch submitted covers for this song
        console.log('Fetching recordings for cover_id:', params.id);
        const { data: submittedData, error: recordingsError } = await supabase
          .from("recordings")
          .select("*")
          .eq("cover_id", params.id);
        
        console.log('Fetched recordings:', submittedData);
        console.log('Recordings error:', recordingsError);
        
        if (recordingsError) {
          console.error('Error fetching recordings:', recordingsError);
          setSubmittedCovers([]);
        } else if (submittedData && submittedData.length > 0) {
          console.log('Processing recordings with details...');
          const recordingsWithDetails = await Promise.all(
            submittedData.map(async (recording) => {
              console.log('Processing recording:', recording);
              
              const { data: guitarData, error: guitarError } = await supabase
                .from("guitars")
                .select("name")
                .eq("id", recording.guitar_id)
                .single();
              
              const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("display_name")
                .eq("id", recording.user_id)
                .single();
              
              console.log('Guitar data:', guitarData, 'Error:', guitarError);
              console.log('Profile data:', profileData, 'Error:', profileError);
              
              return {
                ...recording,
                guitars: guitarData,
                profiles: profileData
              };
            })
          );
          console.log('Final recordings with details:', recordingsWithDetails);
          setSubmittedCovers(recordingsWithDetails);
        } else {
          console.log('No recordings found');
          setSubmittedCovers([]);
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [params.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted!', { selectedGuitar, user, audioFile });
    
    if (!selectedGuitar) {
      console.log('No guitar selected');
      return;
    }

    if (!user) {
      console.log('No user found');
      return;
    }

    let mp3Url = null;
    if (audioFile && audioFile.size > 0) {
      console.log('Uploading audio file...');
      const fileExt = audioFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('cover-audio')
        .upload(fileName, audioFile);
      
      if (error) {
        console.error('Error uploading audio:', error);
        alert('Error uploading audio file. Please try again.');
        return;
      }
      
      mp3Url = data.path;
      console.log('Audio uploaded:', mp3Url);
    } else {
      // If no audio file, use a placeholder URL to satisfy NOT NULL constraint
      mp3Url = 'no-audio-uploaded';
    }

    console.log('Submitting to database...', {
      cover_id: params.id,
      user_id: user.id,
      guitar_id: selectedGuitar,
      mp3_url: mp3Url
    });

    const { data: insertData, error: insertError } = await supabase
      .from("recordings")
      .insert({
        cover_id: params.id,
        user_id: user.id,
        guitar_id: selectedGuitar,
        mp3_url: mp3Url
      });

    if (insertError) {
      console.error('Error submitting cover:', insertError);
      alert('Error submitting cover: ' + insertError.message);
    } else {
      console.log('Cover submitted successfully!');
      setShowModal(false);
      setSelectedGuitar("");
      setAudioFile(null);
      // Refresh submitted covers
      console.log('Refreshing recordings for cover_id:', params.id);
      const { data: submittedData, error: refreshError } = await supabase
        .from("recordings")
        .select("*")
        .eq("cover_id", params.id);
      console.log('Refreshed recordings:', submittedData);
      console.log('Refresh error:', refreshError);
      
      if (refreshError) {
        console.error('Error refreshing recordings:', refreshError);
      } else if (submittedData && submittedData.length > 0) {
        const recordingsWithDetails = await Promise.all(
          submittedData.map(async (recording) => {
            const { data: guitarData } = await supabase
              .from("guitars")
              .select("name")
              .eq("id", recording.guitar_id)
              .single();
            
            const { data: profileData } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", recording.user_id)
              .single();
            
            return {
              ...recording,
              guitars: guitarData,
              profiles: profileData
            };
          })
        );
        setSubmittedCovers(recordingsWithDetails);
      } else {
        setSubmittedCovers(submittedData || []);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!cover) {
    return <div className="text-red-500">Error loading cover details</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">{cover.title}</h1>
          <p className="text-gray-700 mb-1">Artist: {cover.artist}</p>
          <p className="text-gray-700 mb-1">Status: {cover.status}</p>
          <p className="text-gray-500 text-sm">Song #{cover.song_number}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Submit Cover
        </button>
      </div>

      {/* Submitted Covers */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Submitted Covers</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {submittedCovers.map((submission) => (
            <div key={submission.id} className="bg-white rounded-lg shadow-md p-4 border">
              <h3 className="font-semibold">{submission.profiles?.display_name || 'Unknown User'}</h3>
              <p className="text-gray-600 text-sm mb-2">Guitar: {submission.guitars?.name || 'Unknown'}</p>
              {submission.mp3_url && submission.mp3_url !== 'no-audio-uploaded' && (
                <audio controls className="w-full">
                  <source src={`${supabase.storage.from('cover-audio').getPublicUrl(submission.mp3_url).data.publicUrl}`} />
                </audio>
              )}
              {submission.mp3_url === 'no-audio-uploaded' && (
                <p className="text-gray-500 text-sm">No audio uploaded</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Submit Your Cover</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Select Guitar</label>
                <select
                  value={selectedGuitar}
                  onChange={(e) => setSelectedGuitar(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Choose a guitar...</option>
                  {guitars.map((guitar) => (
                    <option key={guitar.id} value={guitar.id}>
                      {guitar.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Upload Audio (Optional)</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files[0])}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
