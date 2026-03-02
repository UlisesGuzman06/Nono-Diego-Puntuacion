import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import PuntosActions from "./PuntosActions";

export const dynamic = "force-dynamic";

// ── Server Actions ─────────────────────────────────────────────────────────────

async function crearUsuario(formData: FormData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (adminProfile?.rol !== "admin") redirect("/usuario");

  const nombre = formData.get("nombre") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const telefono = formData.get("telefono") as string;
  const direccion = formData.get("direccion") as string;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userToken = session?.access_token ?? "";

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/crear-usuario`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        "X-User-Token": userToken,
      },
      body: JSON.stringify({ nombre, email, password, telefono, direccion }),
    },
  );

  if (!res.ok) {
    const err = await res.json();
    console.error("Error creando usuario:", err);
  }

  revalidatePath("/admin");
}

async function logout() {
  "use server";
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("rol, nombre")
    .eq("id", user.id)
    .single();
  if (adminProfile?.rol !== "admin") redirect("/usuario");

  const { data: usuarios } = await supabase
    .from("profiles")
    .select("*")
    .order("nombre", { ascending: true });

  const clientesLista = usuarios?.filter((u) => u.rol === "usuario") ?? [];
  const totalUsuarios = clientesLista.length;
  const listosParaCanjar = clientesLista.filter((u) => u.puntos >= 10).length;

  return (
    <div className="dashboard">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="logo">🍕</span>
          <span className="brand-text">
            Nono <span>Diego</span>
          </span>
        </div>
        <div className="navbar-actions">
          <span className="admin-badge">
            ⭐ {adminProfile.nombre || "Admin"}
          </span>
          <form action={logout}>
            <button type="submit" className="btn btn-logout">
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      <main className="admin-content">
        <div className="page-heading">
          <h2>Panel de Administración</h2>
          <p>Gestioná clientes y puntos de Nono Diego.</p>
        </div>

        {/* Stats */}
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-number">{totalUsuarios}</div>
            <div className="stat-label">👥 Total Clientes</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: "var(--success)" }}>
              {listosParaCanjar}
            </div>
            <div className="stat-label">🍕 Listos para Canjear</div>
          </div>
        </div>

        {/* ── Formulario Crear Cliente ── */}
        <div className="table-container" style={{ marginBottom: 28 }}>
          <div className="table-header-row">
            <div className="table-title">➕ Nuevo Cliente</div>
          </div>
          <form
            action={crearUsuario}
            style={{
              padding: "24px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="nombre">Nombre *</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                placeholder="Ej: Juan García"
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="juan@email.com"
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="password">Contraseña *</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="telefono">Teléfono</label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                placeholder="Ej: +54 11 1234-5678"
              />
            </div>
            <div
              className="form-group"
              style={{ margin: 0, gridColumn: "1 / -1" }}
            >
              <label htmlFor="direccion">Dirección</label>
              <input
                id="direccion"
                name="direccion"
                type="text"
                placeholder="Ej: Av. Corrientes 1234, CABA"
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "auto", padding: "12px 32px" }}
              >
                Crear Cliente
              </button>
            </div>
          </form>
        </div>

        {/* ── Tabla de Clientes (Client Component con Optimistic UI) ── */}
        <div className="table-container">
          <div className="table-header-row">
            <div className="table-title">Clientes Registrados</div>
          </div>
          <PuntosActions usuarios={clientesLista} />
        </div>
      </main>
    </div>
  );
}
