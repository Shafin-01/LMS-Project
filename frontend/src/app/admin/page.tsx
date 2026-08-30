"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch, getUser } from "@/lib/auth";
import RoleGuard from "@/components/RoleGuard";
import { useToast } from "@/components/Toast";

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
  const { showToast } = useToast();

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

  const handleRoleChange = async (userId: number, newRoleId: string, newRoleName: string) => {
    if (!newRoleId) return;
    setUpdatingUserId(userId);
    try {
      await authFetch("/dashboard/users/role", {
        method: "PUT",
        body: JSON.stringify({ userId, roleId: Number(newRoleId) }),
      });
      showToast(`Role updated to ${newRoleName}.`);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to change role.", "error");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`Delete the account "${username}"? This cannot be undone.`)) {
      return;
    }
    setDeletingUserId(userId);
    try {
      await authFetch(`/dashboard/users/${userId}`, { method: "DELETE" });
      showToast("Account deleted.");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete user.", "error");
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
    <main className="min-h-screen text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Center-aligned header matching Courses theme */}
        <div className="text-center space-y-3 max-w-2xl mx-auto flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            Admin Panel
          </h1>
          <p className="text-slate-400">
            Overview of platform statistics, content, and user roles management.
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900 rounded-xl p-4 text-center max-w-2xl mx-auto">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {stats && (
          <div className="space-y-10">
            {/* Section 1: platform content */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Platform Content</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-slate-700 transition-colors">
                  <p className="text-slate-400 text-sm font-medium mb-1">Courses</p>
                  <p className="text-3xl font-bold text-white">{stats.totalCourses}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-slate-700 transition-colors">
                  <p className="text-slate-400 text-sm font-medium mb-1">Lessons</p>
                  <p className="text-3xl font-bold text-white">{stats.totalLessons}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-slate-700 transition-colors">
                  <p className="text-slate-400 text-sm font-medium mb-1">Blog Posts</p>
                  <p className="text-3xl font-bold text-white">{stats.totalBlogPosts}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-slate-700 transition-colors">
                  <p className="text-slate-400 text-sm font-medium mb-1">Enrollments</p>
                  <p className="text-3xl font-bold text-white">{stats.totalEnrollments}</p>
                </div>
              </div>
            </div>

            {/* Section 2: users by role */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Users by Role</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {ROLE_DISPLAY_ORDER.map((roleName) => (
                  <div key={roleName} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-slate-700 transition-colors">
                    <p className="text-slate-400 text-sm font-medium mb-1">{roleName}</p>
                    <p className="text-3xl font-bold text-white">{stats.usersPerRole[roleName] ?? 0}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 3: manage individual accounts */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Users & Roles ({users.length})</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="p-4 font-medium">Username</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Current Role</th>
                  <th className="p-4 font-medium">Change Role</th>
                  <th className="p-4 font-medium">Delete</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 text-white font-medium">{u.username}</td>
                      <td className="p-4 text-slate-300">{u.email}</td>
                      <td className="p-4 text-slate-300">{u.role?.name || "—"}</td>
                      <td className="p-4">
                        {isSelf ? (
                          <span className="text-slate-500 text-sm px-3">{u.role?.name || "—"}</span>
                        ) : (
                          <select
                            defaultValue=""
                            disabled={updatingUserId === u.id}
                            onChange={(e) => {
                              const selectedRole = roles.find(
                                (r) => String(r.id) === e.target.value
                              );
                              handleRoleChange(u.id, e.target.value, selectedRole?.name || "the new role");
                            }}
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
                      <td className="p-4">
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