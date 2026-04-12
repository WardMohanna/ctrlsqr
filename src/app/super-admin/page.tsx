"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Tenant = {
  _id: string;
  name: string;
  purchasedUsers: number;
  isActive: boolean;
  createdAt: string;
};

type FormState = {
  name: string;
  purchasedUsers: number;
};

export default function SuperAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({ name: "", purchasedUsers: 1 });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Guard: only super_admin may view this page
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "super_admin") {
      router.replace("/welcomePage");
    }
  }, [session, status, router]);

  // Load tenants
  useEffect(() => {
    if (session?.user.role !== "super_admin") return;

    fetch("/api/admin/tenants")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTenants(data);
        else setError("Failed to load tenants.");
      })
      .catch(() => setError("Network error while loading tenants."))
      .finally(() => setLoading(false));
  }, [session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Tenant name is required.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to create tenant.");
      } else {
        setTenants((prev) => [data, ...prev]);
        setForm({ name: "", purchasedUsers: 1 });
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(tenant: Tenant) {
    const res = await fetch(`/api/admin/tenants/${tenant._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !tenant.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTenants((prev) =>
        prev.map((t) => (t._id === updated._id ? updated : t))
      );
    }
  }

  async function handleUpdateSeats(tenant: Tenant, purchasedUsers: number) {
    if (!Number.isInteger(purchasedUsers) || purchasedUsers < 1) return;
    const res = await fetch(`/api/admin/tenants/${tenant._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchasedUsers }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTenants((prev) =>
        prev.map((t) => (t._id === updated._id ? updated : t))
      );
    }
  }

  if (status === "loading") {
    return <div style={styles.center}>Loading…</div>;
  }

  if (session?.user.role !== "super_admin") {
    return null;
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Super Admin Panel</h1>
        <span style={styles.badge}>
          Logged in as <strong>{session.user.name}</strong>
        </span>
      </header>

      {/* ── Create Tenant ─── */}
      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Create Tenant</h2>
        <form onSubmit={handleCreate} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="Tenant name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={creating}
          />
          <input
            style={{ ...styles.input, maxWidth: "160px" }}
            type="number"
            min={1}
            placeholder="Number of users"
            value={form.purchasedUsers}
            onChange={(e) =>
              setForm((f) => ({ ...f, purchasedUsers: Math.max(1, parseInt(e.target.value) || 1) }))
            }
            disabled={creating}
          />
          <button style={styles.btn} type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
        {formError && <p style={styles.error}>{formError}</p>}
      </section>

      {/* ── Tenant List ─── */}
      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>All Tenants</h2>

        {loading && <p>Loading tenants…</p>}
        {error && <p style={styles.error}>{error}</p>}

        {!loading && tenants.length === 0 && (
          <p style={styles.muted}>No tenants yet.</p>
        )}

        {!loading && tenants.length > 0 && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Users</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t._id} style={styles.tr}>
                  <td style={styles.td}>{t.name}</td>
                  <td style={styles.td}>
                    <input
                      type="number"
                      min={1}
                      value={t.purchasedUsers}
                      onChange={(e) =>
                        handleUpdateSeats(t, Math.max(1, parseInt(e.target.value) || 1))
                      }
                      style={{ ...styles.selectSmall, width: "80px" }}
                    />
                    <span style={{ marginLeft: "6px", color: "#888", fontSize: "0.8rem" }}>seats</span>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={t.isActive ? styles.active : styles.inactive}
                    >
                      {t.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={t.isActive ? styles.btnWarning : styles.btn}
                      onClick={() => toggleActive(t)}
                    >
                      {t.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

// ── Inline styles (no extra dependencies) ──────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "2rem",
    background: "#0f0f0f",
    color: "#f0f0f0",
    fontFamily: "system-ui, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "2rem",
  },
  title: { margin: 0, fontSize: "1.75rem" },
  badge: {
    background: "#1a1a2e",
    border: "1px solid #444",
    borderRadius: "8px",
    padding: "0.4rem 0.8rem",
    fontSize: "0.85rem",
    color: "#aaa",
  },
  card: {
    background: "#1a1a1a",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
    border: "1px solid #2a2a2a",
  },
  sectionTitle: { marginTop: 0, marginBottom: "1rem", fontSize: "1.1rem" },
  form: { display: "flex", gap: "0.75rem", flexWrap: "wrap" },
  input: {
    flex: 1,
    minWidth: "200px",
    padding: "0.5rem 0.75rem",
    borderRadius: "8px",
    border: "1px solid #444",
    background: "#111",
    color: "#f0f0f0",
    fontSize: "0.95rem",
  },
  select: {
    padding: "0.5rem 0.75rem",
    borderRadius: "8px",
    border: "1px solid #444",
    background: "#111",
    color: "#f0f0f0",
    fontSize: "0.95rem",
  },
  selectSmall: {
    padding: "0.25rem 0.5rem",
    borderRadius: "6px",
    border: "1px solid #444",
    background: "#111",
    color: "#f0f0f0",
    fontSize: "0.85rem",
  },
  btn: {
    padding: "0.5rem 1.25rem",
    borderRadius: "8px",
    border: "none",
    background: "#4ade80",
    color: "#000",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.95rem",
  },
  btnWarning: {
    padding: "0.5rem 1.25rem",
    borderRadius: "8px",
    border: "none",
    background: "#f59e0b",
    color: "#000",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.95rem",
  },
  error: { color: "#f87171", marginTop: "0.5rem", fontSize: "0.9rem" },
  muted: { color: "#666", fontSize: "0.9rem" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "0.6rem 0.75rem",
    borderBottom: "1px solid #333",
    color: "#888",
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  tr: { borderBottom: "1px solid #222" },
  td: { padding: "0.75rem", fontSize: "0.9rem", verticalAlign: "middle" },
  center: { display: "flex", justifyContent: "center", paddingTop: "4rem" },
  active: {
    background: "#14532d",
    color: "#4ade80",
    padding: "0.2rem 0.6rem",
    borderRadius: "999px",
    fontSize: "0.8rem",
  },
  inactive: {
    background: "#450a0a",
    color: "#f87171",
    padding: "0.2rem 0.6rem",
    borderRadius: "999px",
    fontSize: "0.8rem",
  },
};
