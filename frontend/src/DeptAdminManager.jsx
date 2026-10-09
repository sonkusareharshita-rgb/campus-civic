import { useState, useEffect } from "react";
import "./App.css";

const API = "http://localhost:5000";

const ADMIN_TYPES = [
  { id: 2, label: "Electricity Admin",     emoji: "⚡" },
  { id: 3, label: "Water Admin",           emoji: "💧" },
  { id: 4, label: "Cleanliness Admin",     emoji: "🧹" },
  { id: 5, label: "Infrastructure Admin",  emoji: "🏗️" },
  { id: 6, label: "Wi-Fi / Internet Admin",emoji: "📶" },
  { id: 7, label: "Security Admin",        emoji: "🔐" },
  { id: 8, label: "Department Admin",      emoji: "🏛️" },
  { id: 9, label: "Approver",              emoji: "✅" },
];

function DeptAdminManager({ currentUser, onBack }) {
  const [admins, setAdmins]       = useState([]);
  const [departments, setDepts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState(null);

  const [form, setForm] = useState({
    name: "", email: "", password: "",
    admin_type_id: "2", department_id: ""
  });
  const [formError, setFormError]   = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    fetchAdmins();
    fetchDepts();
  }, []);

  async function fetchAdmins() {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/department-admins`);
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch { setAdmins([]); }
    finally { setLoading(false); }
  }

  async function fetchDepts() {
    try {
      const res  = await fetch(`${API}/api/auth/departments`);
      const data = await res.json();
      setDepts(data.departments || []);
    } catch { setDepts([]); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(""); setFormSuccess("");

    if (!form.name || !form.email || (!editId && !form.password) || !form.admin_type_id || !form.department_id) {
      setFormError("All required fields must be filled.");
      return;
    }

    setCreating(true);
    try {
      const url = editId 
        ? `${API}/api/auth/department-admin/${editId}`
        : `${API}/api/auth/create-department-admin`;
        
      const method = editId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          form.name,
          email:         form.email,
          password:      form.password,
          admin_type_id: parseInt(form.admin_type_id),
          department_id: parseInt(form.department_id),
          created_by:    currentUser.user_id,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message || (editId ? "Failed to update admin." : "Failed to create admin."));
      } else {
        setFormSuccess(`✅ Administrator ${editId ? "updated" : "created"} successfully!`);
        setForm({ name: "", email: "", password: "", admin_type_id: "2", department_id: "" });
        setEditId(null);
        if (!editId) setShowForm(false);
        fetchAdmins();
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this administrator?")) return;
    try {
      const res = await fetch(`${API}/api/auth/department-admin/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAdmins();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete");
      }
    } catch {
      alert("Network error deleting admin.");
    }
  }

  function handleEdit(admin) {
    setForm({
      name: admin.name, email: admin.email, password: "", 
      admin_type_id: admin.admin_type_id.toString(), department_id: admin.department_id?.toString() || ""
    });
    setEditId(admin.user_id);
    setShowForm(true);
    setFormError(""); setFormSuccess("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function typeInfo(id) {
    return ADMIN_TYPES.find(t => t.id === Number(id)) || { label: `Type ${id}`, emoji: "👤" };
  }

  return (
    <div className="feed-page">

      {/* ── HEADER ── */}
      <div className="feed-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={onBack}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "18px", padding: "0 4px" }}
          >
            ←
          </button>
          <span style={{ fontSize: "20px" }}>🏛️</span>
          <span className="feed-logo">Manage Admins</span>
        </div>
        <span className="feed-tagline" style={{ marginLeft: "60px" }}>
          Create &amp; view department-level administrators
        </span>
      </div>

      {/* ── CREATE BUTTON ── */}
      <div style={{ padding: "0 16px 16px" }}>
        <button
          onClick={() => { 
            if (showForm && !editId) {
              setShowForm(false);
            } else {
              setForm({ name: "", email: "", password: "", admin_type_id: "2", department_id: "" });
              setEditId(null);
              setShowForm(true);
              setFormError(""); setFormSuccess(""); 
            }
          }}
          style={{
            width: "100%", padding: "12px",
            background: showForm && !editId ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.15)",
            border: `1px solid ${showForm && !editId ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`,
            borderRadius: "12px",
            color: showForm && !editId ? "#f87171" : "#818cf8",
            fontWeight: "700", fontSize: "14px",
            cursor: "pointer", transition: "all 0.2s",
          }}
        >
          {showForm && !editId ? "✕ Cancel" : "+ Create New Administrator"}
        </button>
      </div>

      {/* ── FORM ── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            margin: "0 16px 20px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontWeight: "700", color: "#c4c9d6" }}>
              {editId ? "Edit Administrator Details" : "New Administrator Details"}
            </div>
            {editId && (
              <button 
                type="button" 
                onClick={() => { setShowForm(false); setEditId(null); }}
                style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "14px" }}
              >
                ✕ Cancel Edit
              </button>
            )}
          </div>

          {/* Name */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "#666", display: "block", marginBottom: "4px" }}>FULL NAME</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Maintenance Officer"
              style={inputStyle}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "#666", display: "block", marginBottom: "4px" }}>EMAIL</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="admin@college.edu"
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "#666", display: "block", marginBottom: "4px" }}>
              {editId ? "NEW PASSWORD (leave blank to keep current)" : "INITIAL PASSWORD"}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="min 8 characters"
              style={inputStyle}
            />
          </div>

          {/* Role */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "#666", display: "block", marginBottom: "4px" }}>ADMIN ROLE</label>
            <select
              value={form.admin_type_id}
              onChange={e => setForm(f => ({ ...f, admin_type_id: e.target.value }))}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {ADMIN_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "11px", color: "#666", display: "block", marginBottom: "4px" }}>DEPARTMENT</label>
            <select
              value={form.department_id}
              onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">-- Select Department --</option>
              {departments.map(d => (
                <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
              ))}
            </select>
          </div>

          {formError   && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "10px" }}>⚠ {formError}</div>}
          {formSuccess && <div style={{ color: "#34d399", fontSize: "13px", marginBottom: "10px" }}>{formSuccess}</div>}

          <button
            type="submit"
            disabled={creating}
            style={{
              width: "100%", padding: "12px",
              background: creating ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#818cf8)",
              border: "none", borderRadius: "10px",
              color: "#fff", fontWeight: "700", fontSize: "14px",
              cursor: creating ? "not-allowed" : "pointer",
            }}
          >
            {creating ? (editId ? "Updating…" : "Creating…") : (editId ? "Update Administrator" : "Create Administrator")}
          </button>
        </form>
      )}

      {/* ── ADMIN LIST ── */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ color: "#555", fontSize: "12px", fontWeight: "600", marginBottom: "10px" }}>
          ALL ADMINISTRATORS ({admins.length})
        </div>

        {loading ? (
          <div className="feed-loading"><div className="feed-spinner" /></div>
        ) : admins.length === 0 ? (
          <div className="feed-empty">
            <div className="feed-empty-icon">👤</div>
            <h3>No administrators yet</h3>
            <p>Create the first one above.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingBottom: "80px" }}>
            {admins.map(admin => {
              const ti = typeInfo(admin.admin_type_id);
              const isSelf = admin.user_id === currentUser?.user_id;
              return (
                <div
                  key={admin.user_id}
                  style={{
                    background: isSelf ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.04)",
                    border: isSelf ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    display: "flex", alignItems: "center", gap: "12px",
                  }}
                >
                  <div style={{
                    width: "40px", height: "40px",
                    borderRadius: "50%",
                    background: "rgba(99,102,241,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "18px", flexShrink: 0,
                  }}>
                    {ti.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: "700", color: "#e2e8f0", fontSize: "14px" }}>
                      {admin.name} {isSelf && <span style={{ color: "#818cf8", fontSize: "11px" }}>(you)</span>}
                    </div>
                    <div style={{ color: "#555", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {admin.email}
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                      <span style={{
                        background: "rgba(99,102,241,0.15)",
                        color: "#818cf8",
                        padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600",
                      }}>
                        {ti.label}
                      </span>
                      {admin.department_name && (
                        <span style={{
                          background: "rgba(16,185,129,0.1)",
                          color: "#34d399",
                          padding: "2px 8px", borderRadius: "10px", fontSize: "11px",
                        }}>
                          {admin.department_name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  {!isSelf && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
                      <button 
                        onClick={() => handleEdit(admin)}
                        style={{
                          background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "6px",
                          color: "#fff", padding: "6px 10px", fontSize: "11px", fontWeight: "600", cursor: "pointer"
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(admin.user_id)}
                        style={{
                          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px",
                          color: "#f87171", padding: "6px 10px", fontSize: "11px", fontWeight: "600", cursor: "pointer"
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  color: "#e2e8f0",
  fontSize: "14px",
  boxSizing: "border-box",
};

export default DeptAdminManager;
