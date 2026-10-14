"use client";
import { useCallback, useEffect, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
export default function AdminSettingsPage() {
    const [user, setUser] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    // New worker form
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        name: "",
        role: "WORKER",
        phone: "",
    });
    const [submitting, setSubmitting] = useState(false);
    // Edit worker modal/form state
    const [editingUser, setEditingUser] = useState(null);
    const [editFormData, setEditFormData] = useState({
        name: "",
        username: "",
        password: "",
        role: "WORKER",
        phone: "",
        active: true,
    });
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const meRes = await fetch("/api/auth/me", { credentials: "include" });
            const me = await meRes.json();
            if (!me.user || me.user.role !== "ADMIN") {
                window.location.href = "/portal/login";
                return;
            }
            setUser(me.user);
            const res = await fetch("/api/workers", { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setWorkers(data.users ?? []);
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    async function handleCreate(e) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/workers", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setFormData({ username: "", password: "", name: "", role: "WORKER", phone: "" });
                await load();
            }
            else {
                const data = await res.json();
                alert(data.error ?? "Failed to create user");
            }
        }
        catch (err) {
            alert("Something went wrong");
        }
        finally {
            setSubmitting(false);
        }
    }
    async function handleToggleActive(item) {
        try {
            const res = await fetch("/api/workers", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: item.id,
                    active: !item.active,
                }),
            });
            if (res.ok) {
                await load();
            }
            else {
                const data = await res.json();
                alert(data.error ?? "Failed to toggle active status");
            }
        }
        catch (err) {
            alert("Failed to toggle status");
        }
    }
    function startEdit(item) {
        setEditingUser(item);
        setEditFormData({
            name: item.name,
            username: item.username,
            password: "",
            role: item.role,
            phone: item.phone ?? "",
            active: item.active,
        });
    }
    async function handleUpdate(e) {
        e.preventDefault();
        if (!editingUser)
            return;
        try {
            const res = await fetch("/api/workers", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editingUser.id,
                    name: editFormData.name,
                    username: editFormData.username,
                    role: editFormData.role,
                    phone: editFormData.phone,
                    active: editFormData.active,
                    password: editFormData.password || undefined,
                }),
            });
            if (res.ok) {
                setEditingUser(null);
                await load();
            }
            else {
                const data = await res.json();
                alert(data.error ?? "Failed to update user");
            }
        }
        catch (err) {
            alert("Something went wrong");
        }
    }
    useEffect(() => {
        load();
    }, [load]);
    if (!user)
        return <p className="p-8 text-center">Loading...</p>;
    return (<div className="min-h-screen bg-zinc-50">
      <PortalNav role="ADMIN" userName={user.name}/>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Admin Settings &amp; Worker Access Control</h1>
          <button type="button" onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
            window.location.href = "/portal/login";
        }} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 shadow-sm">
            Logout
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Create User Form */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-800 mb-4">Add System User</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Full Name</label>
                <input required type="text" placeholder="e.g. Ramesh Kumar" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-amber-500 min-h-[42px]"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Username / Login ID</label>
                <input required type="text" placeholder="e.g. ramesh123" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-amber-500 min-h-[42px]"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Password</label>
                <input required type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-amber-500 min-h-[42px]"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Phone Number (Optional)</label>
                <input type="tel" placeholder="e.g. 9876543210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-amber-500 min-h-[42px]"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">System Role</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-amber-500 min-h-[42px]">
                  <option value="WORKER">Worker (Fulfillment &amp; Walk-ins)</option>
                  <option value="ADMIN">Administrator (Full Access)</option>
                </select>
              </div>

              <button type="submit" disabled={submitting} className="w-full rounded-lg bg-amber-600 py-2.5 font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors min-h-[44px]">
                {submitting ? "Adding..." : "Add User"}
              </button>
            </form>
          </div>

          {/* User List Table */}
          <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm">
            {/* Mobile User Cards View (< sm) */}
            <div className="block sm:hidden space-y-3">
              {workers.map((item) => (<div key={`mobile-worker-${item.id}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">{item.name}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">@{item.username}</p>
                      {item.phone && <p className="text-[11px] text-zinc-500">📞 {item.phone}</p>}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.role === "ADMIN"
                ? "bg-amber-100 text-amber-800"
                : "bg-blue-100 text-blue-800"}`}>
                        {item.role}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {item.active ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-zinc-200 pt-2">
                    <button type="button" onClick={() => handleToggleActive(item)} className={`text-xs font-bold py-1.5 px-3 rounded-lg border min-h-[38px] inline-flex items-center justify-center transition active:scale-95 ${item.active
                ? "border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                : "border-green-200 text-green-600 bg-green-50 hover:bg-green-100"}`}>
                      {item.active ? "Deactivate" : "Activate"}
                    </button>
                    <button type="button" onClick={() => startEdit(item)} className="text-xs font-bold py-1.5 px-3 rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 min-h-[38px] inline-flex items-center justify-center transition active:scale-95">
                      Edit User
                    </button>
                  </div>
                </div>))}
              {workers.length === 0 && (<p className="py-6 text-center text-xs text-zinc-400">No users found.</p>)}
            </div>

            {/* Desktop Table (>= sm) */}
            <div className="hidden sm:block overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full min-w-[550px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Access</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {workers.map((item) => (<tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-zinc-850">{item.name}</p>
                        {item.phone && <p className="text-xs text-zinc-400">{item.phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{item.username}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.role === "ADMIN"
                ? "bg-amber-100 text-amber-800"
                : "bg-blue-100 text-blue-800"}`}>
                          {item.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {item.active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button type="button" onClick={() => handleToggleActive(item)} className={`text-xs font-medium py-1 px-1.5 ${item.active ? "text-red-600 hover:underline" : "text-green-600 hover:underline"}`}>
                          {item.active ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" onClick={() => startEdit(item)} className="text-xs font-medium text-amber-600 hover:underline py-1 px-1.5">
                          Edit
                        </button>
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {editingUser && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-5 sm:p-6 relative">
              <button type="button" onClick={() => setEditingUser(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 text-lg font-bold p-1 min-w-[32px] min-h-[32px] flex items-center justify-center">
                ✕
              </button>
              <h3 className="text-lg font-semibold text-zinc-800 mb-4">Edit User Account</h3>
              <form onSubmit={handleUpdate} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Full Name</label>
                  <input required type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-sm focus:outline-none min-h-[42px]"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Username</label>
                  <input required type="text" value={editFormData.username} onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-sm focus:outline-none min-h-[42px]"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Password (Leave blank to keep current)</label>
                  <input type="password" placeholder="New password" value={editFormData.password} onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-sm focus:outline-none min-h-[42px]"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Phone</label>
                  <input type="tel" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-sm focus:outline-none min-h-[42px]"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">System Role</label>
                  <select value={editFormData.role} onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-sm focus:outline-none min-h-[42px]">
                    <option value="WORKER">Worker</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 py-1">
                  <input type="checkbox" id="edit-active" checked={editFormData.active} onChange={(e) => setEditFormData({ ...editFormData, active: e.target.checked })} className="h-4 w-4 rounded accent-amber-600"/>
                  <label htmlFor="edit-active" className="text-sm font-medium text-zinc-700">Account Active</label>
                </div>

                <div className="flex gap-2 justify-end mt-4">
                  <button type="button" onClick={() => setEditingUser(null)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 min-h-[40px]">
                    Cancel
                  </button>
                  <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 min-h-[40px]">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>)}
      </div>
    </div>);
}
