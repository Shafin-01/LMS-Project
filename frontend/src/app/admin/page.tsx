"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch, getUser } from "@/lib/auth";
import RoleGuard from "@/components/RoleGuard";

interface DashboardStats {
  totalCourses: number;
  totalLessons: number;
  totalEnrollments: number;
  totalBlogPosts: number;
  usersPerRole: Record<string, number>;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role?: {
    id: number;
    name: string;
  };
}

interface RoleOption {
  id: number;
  name: string;
}

// Fixed display order for the role-count cards, so they stay in a stable,
// predictable position instead of shuffling based on database insertion
// order every time the page reloads.
const ROLE_DISPLAY_ORDER = ["Admin", "Instructor", "Content Manager", "Student"];

function AdminPanelContent() {
  const currentUser = getUser();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const loadData = async () => {
    setError("");
    try {
      const [statsRes, usersRes, rolesRes] = await Promise.all([
        authFetch("/dashboard/stats"),
        authFetch("/dashboard/users"),
        authFetch("/dashboard/roles"),
      ]);

      // stats() returns a plain object, not wrapped in { data: ... },
      // so statsRes is used directly here rather than statsRes.data.
      setStats(statsRes);
      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (userId: number, newRoleId: string) => {
    if (!newRoleId) return;
    setUpdatingUserId(userId);
    setError("");
    try {
      await authFetch("/dashboard/users/role", {
        method: "PUT",
        body: JSON.stringify({ userId, roleId: Number(newRoleId) }),
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to change role.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`Delete the account "${username}"? This cannot be undone.`)) {
      return;
    }
    setDeletingUserId(userId);
    setError("");
    try {
      await authFetch(`/dashboard/users/${userId}`, { method: "DELETE" });
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete user.");
    } finally {
      setDeletingUserId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-slate-100 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10 pt-8">
        <div>
          <Link href="/dashboard" className="text-sm text-indigo-400 hover:underline">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">Admin Panel</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {stats && (
          <>
            {/* Section 1: platform content — how much has been built so far. */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Platform Content</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Courses</p>
                  <p className="text-2xl font-bold text-white">{stats.totalCourses}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Lessons</p>
                  <p className="text-2xl font-bold text-white">{stats.totalLessons}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Blog Posts</p>
                  <p className="text-2xl font-bold text-white">{stats.totalBlogPosts}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Enrollments</p>
                  <p className="text-2xl font-bold text-white">{stats.totalEnrollments}</p>
                </div>
              </div>
            </div>

            {/* Section 2: how many accounts exist per role. Strapi's own
                built-in "Public" and "Authenticated" roles are excluded on
                the backend, so only the platform's four real roles show up. */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Users by Role</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {ROLE_DISPLAY_ORDER.map((roleName) => (
                  <div key={roleName} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-sm">{roleName}</p>
                    <p className="text-xl font-bold text-white">{stats.usersPerRole[roleName] ?? 0}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Section 3: manage individual accounts — change role or remove
            the account entirely. An Admin's own row has no role dropdown
            or delete action, so the platform can never end up without an
            Admin able to manage it. */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Users & Roles ({users.length})</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="p-3">Username</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Current Role</th>
                  <th className="p-3">Change Role</th>
                  <th className="p-3">Delete</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="border-b border-slate-800/50 last:border-0">
                      <td className="p-3 text-white">{u.username}</td>
                      <td className="p-3 text-slate-300">{u.email}</td>
                      <td className="p-3 text-slate-300">{u.role?.name || "—"}</td>
                      <td className="p-3">
                        {isSelf ? (
                          <span className="text-slate-500 text-sm">{u.role?.name || "—"}</span>
                        ) : (
                          <select
                            defaultValue=""
                            disabled={updatingUserId === u.id}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                          >
                            <option value="" disabled>
                              {updatingUserId === u.id ? "Updating…" : "Change role"}
                            </option>
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="p-3">
                        {!isSelf && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            disabled={deletingUserId === u.id}
                            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-300 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deletingUserId === u.id ? "Deleting…" : "Delete"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={["Admin"]}>
      {() => <AdminPanelContent />}
    </RoleGuard>
  );
}