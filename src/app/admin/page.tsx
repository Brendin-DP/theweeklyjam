"use client";
import Link from "next/link";

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Admin</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/admin/manage-submitters"
          className="bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow"
        >
          <h2 className="text-lg font-semibold mb-2">Manage Song Submitters</h2>
          <p className="text-sm text-gray-600">Manage users who can submit song covers</p>
        </Link>
      </div>
    </div>
  );
}
