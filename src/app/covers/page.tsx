"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ktctqojjjdxwizztkkmc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Y3Rxb2pqamR4d2l6enRra21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDQyMjYsImV4cCI6MjA3MjM4MDIyNn0.obILD95-ZimwoI-CQlaXDN2QRr0fInbki1AOWa47O0M"
);

export default function CoversPage() {
  const [covers, setCovers] = useState([]);

  useEffect(() => {
    async function fetchCovers() {
      const { data, error } = await supabase
        .from("covers")
        .select("id, song_number, title, artist, status")
        .order("song_number", { ascending: true });
      if (error) {
        console.error("Error fetching covers:", error);
      } else {
        setCovers(data);
      }
    }
    fetchCovers();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Covers List</h1>
      <table className="w-full table-auto border border-gray-300">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2 text-left">#</th>
            <th className="px-4 py-2 text-left">Title</th>
            <th className="px-4 py-2 text-left">Artist</th>
            <th className="px-4 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {covers.map((cover: any) => (
            <tr key={cover.id} className="border-t border-gray-300 hover:bg-gray-100">
              <td className="px-4 py-2">{cover.song_number}</td>
              <td className="px-4 py-2">
                <Link href={`/covers/${cover.id}`} className="text-blue-600 hover:underline">
                  {cover.title}
                </Link>
              </td>
              <td className="px-4 py-2">{cover.artist}</td>
              <td className="px-4 py-2">{cover.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}