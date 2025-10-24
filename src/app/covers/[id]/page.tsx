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
  const [editingRecording, setEditingRecording] = useState(null);
  const [hasUserSubmitted, setHasUserSubmitted] = useState(false);

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



        // Check if current user has already submitted a cover
        if (user) {
          const userHasSubmitted = submittedData?.some(recording => recording.user_id === user.id);
          setHasUserSubmitted(userHasSubmitted || false);
          console.log('User has submitted:', userHasSubmitted);
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
      console.log(audioFile.name); //it's correctly building the name
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      console.log("hello world"); //it's correctly building the name
      const { data, error } = await supabase.storage
        .from('recordings-media')
        .upload(fileName, audioFile, { upsert: true });
      
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

    let result;
    if (editingRecording) {
      // Update existing recording
      result = await supabase
        .from("recordings")
        .update({
          guitar_id: selectedGuitar,
          mp3_url: mp3Url
        })
        .eq("id", editingRecording.id);
    } else {
      // Insert new recording
      result = await supabase
        .from("recordings")
        .insert({
          cover_id: params.id,
          user_id: user.id,
          guitar_id: selectedGuitar,
          mp3_url: mp3Url
        });
    }

    const { data: insertData, error: insertError } = result;

    if (insertError) {
      console.error('Error submitting cover:', insertError);
      alert('Error submitting cover: ' + insertError.message);
    } else {
      console.log('Cover submitted successfully!');
      setShowModal(false);
      setSelectedGuitar("");
      setAudioFile(null);
      setEditingRecording(null);
      setHasUserSubmitted(true);
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
        <div className="relative">
          <button
            onClick={() => {
              setEditingRecording(null);
              setShowModal(true);
            }}
            disabled={hasUserSubmitted}
            className={`px-4 py-2 rounded-md ${
              hasUserSubmitted 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={hasUserSubmitted ? "You've already submitted your cover" : "Submit your cover"}
          >
            Submit Cover
          </button>
          {hasUserSubmitted && (
            <div className="absolute -top-8 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              You've already submitted your cover
            </div>
          )}
        </div>
      </div>

      {/* Submitted Covers */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Submitted Covers</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {submittedCovers.map((submission) => (
            <div key={submission.id} className="bg-white rounded-lg shadow-md p-4 border relative">
              {/* Edit button - only show for current user's submissions */}
              {submission.user_id === user?.id && (
                <button
                  onClick={() => {
                    setEditingRecording(submission);
                    setSelectedGuitar(submission.guitar_id);
                    setAudioFile(null);
                    setShowModal(true);
                  }}
                  className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700"
                  title="Edit recording"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              )}
              
              <h3 className="font-semibold">{submission.profiles?.display_name || 'Unknown User'}</h3>
              <p className="text-gray-600 text-sm mb-2">Guitar: {submission.guitars?.name || 'Unknown'}</p>
              {submission.mp3_url && submission.mp3_url !== 'no-audio-uploaded' && (
                <audio controls className="w-full">
                  <source src={`${supabase.storage.from('recordings-media').getPublicUrl(submission.mp3_url).data.publicUrl}`} />
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
            <h2 className="text-xl font-semibold mb-4">
              {editingRecording ? 'Edit Your Cover' : 'Submit Your Cover'}
            </h2>
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
                <label className="block text-sm font-medium mb-2">
                  {editingRecording ? 'Replace Audio (Optional)' : 'Upload Audio (Optional)'}
                </label>
                {editingRecording && editingRecording.mp3_url && editingRecording.mp3_url !== 'no-audio-uploaded' && (
                  <div className="mb-2 p-2 bg-gray-100 rounded text-sm">
                    <p className="text-gray-600">Current audio:</p>
                    <audio controls className="w-full mt-1">
                      <source src={`${supabase.storage.from('recordings-media').getPublicUrl(editingRecording.mp3_url).data.publicUrl}`} />
                    </audio>
                  </div>
                )}
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files[0])}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
                {editingRecording && (
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to keep current audio, or select a new file to replace it.
                  </p>
                )}
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
                  {editingRecording ? 'Update' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
