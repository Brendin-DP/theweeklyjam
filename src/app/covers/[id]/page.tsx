import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ktctqojjjdxwizztkkmc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Y3Rxb2pqamR4d2l6enRra21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDQyMjYsImV4cCI6MjA3MjM4MDIyNn0.obILD95-ZimwoI-CQlaXDN2QRr0fInbki1AOWa47O0M"
);

export default async function CoverDetailPage({ params }: { params: { id: string } }) {
  const { data: cover, error } = await supabase
    .from("covers")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) {
    return <div className="text-red-500">Error loading cover details</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">{cover.title}</h1>
      <p className="text-gray-700 mb-1">Artist: {cover.artist}</p>
      <p className="text-gray-700 mb-1">Status: {cover.status}</p>
      <p className="text-gray-500 text-sm">Song #{cover.song_number}</p>
    </div>
  );
}
