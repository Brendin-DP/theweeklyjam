"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ktctqojjjdxwizztkkmc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Y3Rxb2pqamR4d2l6enRra21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDQyMjYsImV4cCI6MjA3MjM4MDIyNn0.obILD95-ZimwoI-CQlaXDN2QRr0fInbki1AOWa47O0M"
);

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [guitars, setGuitars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddGuitar, setShowAddGuitar] = useState(false);
  const [editingGuitar, setEditingGuitar] = useState(null);
  const [newGuitarName, setNewGuitarName] = useState("");
  const [newGuitarImageUrl, setNewGuitarImageUrl] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          // Fetch user profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          setProfile(profileData);

          // Fetch user's guitars
          const { data: guitarsData } = await supabase
            .from('guitars')
            .select('*')
            .eq('user_id', user.id)
            .order('name');
          setGuitars(guitarsData || []);
        }
      } catch (error) {
        console.error('Error fetching settings data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddGuitar = async (e) => {
    e.preventDefault();
    if (!newGuitarName.trim()) return;

    try {
      const { error } = await supabase
        .from('guitars')
        .insert({
          user_id: user.id,
          name: newGuitarName.trim(),
          image_url: newGuitarImageUrl.trim() || null
        });

      if (error) {
        console.error('Error adding guitar:', error);
        alert('Error adding guitar: ' + error.message);
      } else {
        // Refresh guitars list
        const { data: guitarsData } = await supabase
          .from('guitars')
          .select('*')
          .eq('user_id', user.id)
          .order('name');
        setGuitars(guitarsData || []);
        
        // Reset form
        setNewGuitarName("");
        setNewGuitarImageUrl("");
        setShowAddGuitar(false);
      }
    } catch (error) {
      console.error('Error adding guitar:', error);
    }
  };

  const handleEditGuitar = async (guitar) => {
    const newName = prompt('Enter new guitar name:', guitar.name);
    if (newName && newName.trim() !== guitar.name) {
      try {
        const { error } = await supabase
          .from('guitars')
          .update({ name: newName.trim() })
          .eq('id', guitar.id);

        if (error) {
          console.error('Error updating guitar:', error);
          alert('Error updating guitar: ' + error.message);
        } else {
          // Refresh guitars list
          const { data: guitarsData } = await supabase
            .from('guitars')
            .select('*')
            .eq('user_id', user.id)
            .order('name');
          setGuitars(guitarsData || []);
        }
      } catch (error) {
        console.error('Error updating guitar:', error);
      }
    }
  };

  const handleDeleteGuitar = async (guitar) => {
    if (confirm(`Are you sure you want to delete "${guitar.name}"?`)) {
      try {
        const { error } = await supabase
          .from('guitars')
          .delete()
          .eq('id', guitar.id);

        if (error) {
          console.error('Error deleting guitar:', error);
          alert('Error deleting guitar: ' + error.message);
        } else {
          // Refresh guitars list
          const { data: guitarsData } = await supabase
            .from('guitars')
            .select('*')
            .eq('user_id', user.id)
            .order('name');
          setGuitars(guitarsData || []);
        }
      } catch (error) {
        console.error('Error deleting guitar:', error);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error logging out:', error);
        alert('Error logging out: ' + error.message);
      } else {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
        >
          Logout
        </button>
      </div>
      
      {/* Profile Section */}
      <div className="bg-white rounded-lg shadow-md p-6 border mb-6">
        <h2 className="text-lg font-semibold mb-4">Profile Details</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <p className="text-gray-900">{profile?.display_name || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="text-gray-900">{user?.email || 'Not available'}</p>
          </div>
        </div>
      </div>

      {/* Guitars Section */}
      <div className="bg-white rounded-lg shadow-md p-6 border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">My Guitars</h2>
          <button
            onClick={() => setShowAddGuitar(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add Guitar
          </button>
        </div>

        {guitars.length > 0 ? (
          <div className="space-y-3">
            {guitars.map((guitar) => (
              <div key={guitar.id} className="flex justify-between items-center p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  {guitar.image_url && (
                    <img 
                      src={guitar.image_url} 
                      alt={guitar.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-medium">{guitar.name}</h3>
                    {guitar.image_url && (
                      <p className="text-sm text-gray-500">Image available</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditGuitar(guitar)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteGuitar(guitar)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No guitars added yet.</p>
        )}

        {/* Add Guitar Modal */}
        {showAddGuitar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add New Guitar</h3>
              <form onSubmit={handleAddGuitar}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Guitar Name *</label>
                  <input
                    type="text"
                    value={newGuitarName}
                    onChange={(e) => setNewGuitarName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="e.g., My Acoustic Guitar"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Image URL (Optional)</label>
                  <input
                    type="url"
                    value={newGuitarImageUrl}
                    onChange={(e) => setNewGuitarImageUrl(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="https://example.com/guitar-image.jpg"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddGuitar(false);
                      setNewGuitarName("");
                      setNewGuitarImageUrl("");
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Add Guitar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
