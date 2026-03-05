"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { crearUsuarioAction } from "./actions";

type Usuario = {
  id: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  puntos: number;
  rol: string;
  periodo_inicio: string | null;
  periodo_fin: Date | null;
};

type EditForm = {
  nombre: string;
  telefono: string;
  direccion: string;
};

type FiltroActivo = "todos" | "listos" | "activos" | "sinpuntos";

const META = 10;

/** Calcula si el período de 40 días está activo y cuántos días restan */
function calcularPeriodo(periodo_inicio: string | null): {
  activo: boolean;
  fin: Date | null;
  diasRestantes: number | null;
} {
  if (!periodo_inicio) return { activo: false, fin: null, diasRestantes: null };
  const inicio = new Date(periodo_inicio);
  const fin = new Date(inicio.getTime() + 40 * 24 * 60 * 60 * 1000);
  const ahora = new Date();
  if (ahora >= fin) return { activo: false, fin: null, diasRestantes: null };
  const dias = Math.ceil(
    (fin.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24),
  );
  return { activo: true, fin, diasRestantes: dias };
}

function PeriodoChip({ periodo_inicio }: { periodo_inicio: string | null }) {
  const { activo, fin, diasRestantes } = calcularPeriodo(periodo_inicio);

  if (!activo || !fin) {
    return (
      <span className="pa-chip pa-chip--none" title="Sin período activo">
        Sin período
      </span>
    );
  }

  const fechaFin = fin.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });

  if (diasRestantes !== null && diasRestantes <= 5) {
    return (
      <span className="pa-chip pa-chip--warn" title={`Vence el ${fechaFin}`}>
        ⏳ {diasRestantes}d – {fechaFin}
      </span>
    );
  }

  return (
    <span
      className="pa-chip pa-chip--ok"
      title={`Período activo hasta ${fechaFin}`}
    >
      📅 Hasta {fechaFin}
    </span>
  );
}

export default function PuntosActions({
  usuarios: initialUsuarios,
}: {
  usuarios: Usuario[];
}) {
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null); // ID en espera de confirmar borrado
  const [canjearId, setCanjearId] = useState<string | null>(null); // ID en espera de confirmar canje
  // Modal de contraseña para hacer admin
  const [adminModal, setAdminModal] = useState<{
    userId: string;
    nombre: string | null;
  } | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(
    null,
  );
  const [adminLoading, setAdminLoading] = useState(false);
  const router = useRouter();

  // Search & filter
  const [searchQ, setSearchQ] = useState("");
  const [filtro, setFiltro] = useState<FiltroActivo>("todos");

  // Edit modal
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    nombre: "",
    telefono: "",
    direccion: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // ── Create Modal ──
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    nombre: "",
    email: "",
    password: "",
    telefono: "",
    direccion: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const supabase = createClient();

  // ──  Listen to global custom events from the server-rendered page ──
  useEffect(() => {
    function onSearch(e: Event) {
      const { q } = (e as CustomEvent).detail;
      setSearchQ(q ?? "");
    }
    function onFilter(e: Event) {
      const { filter } = (e as CustomEvent).detail;
      setFiltro((filter as FiltroActivo) ?? "todos");
    }
    function onOpenCrear() {
      setCreateError(null);
      setCreateForm({
        nombre: "",
        email: "",
        password: "",
        telefono: "",
        direccion: "",
      });
      setCreateModalOpen(true);
    }
    document.addEventListener("adm-search", onSearch);
    document.addEventListener("adm-filter", onFilter);
    document.addEventListener("adm-open-crear", onOpenCrear);
    return () => {
      document.removeEventListener("adm-search", onSearch);
      document.removeEventListener("adm-filter", onFilter);
      document.removeEventListener("adm-open-crear", onOpenCrear);
    };
  }, []);

  // ── Computed filtered list ──
  const usuariosFiltrados = useMemo(() => {
    let lista = usuarios;

    // Text search
    const q = searchQ.trim().toLowerCase();
    if (q) {
      lista = lista.filter(
        (u) =>
          (u.nombre || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.telefono || "").toLowerCase().includes(q),
      );
    }

    // Filter
    switch (filtro) {
      case "listos":
        lista = lista.filter((u) => u.puntos >= META);
        break;
      case "activos":
        lista = lista.filter((u) => calcularPeriodo(u.periodo_inicio).activo);
        break;
      case "sinpuntos":
        lista = lista.filter((u) => u.puntos === 0);
        break;
      default:
        break;
    }

    return lista;
  }, [usuarios, searchQ, filtro]);

  // Update count label
  useEffect(() => {
    const el = document.getElementById("adm-showing-count");
    if (el) {
      const total = usuarios.length;
      const shown = usuariosFiltrados.length;
      el.textContent =
        shown === total
          ? `Mostrando ${total} cliente${total !== 1 ? "s" : ""}`
          : `Mostrando ${shown} de ${total} cliente${total !== 1 ? "s" : ""}`;
    }
  }, [usuariosFiltrados, usuarios.length]);

  // ── Edit ──
  function abrirEdicion(usuario: Usuario) {
    setEditingUser(usuario);
    setEditForm({
      nombre: usuario.nombre || "",
      telefono: usuario.telefono || "",
      direccion: usuario.direccion || "",
    });
    setEditError(null);
    setEditSuccess(false);
  }

  function cerrarEdicion() {
    setEditingUser(null);
    setEditError(null);
    setEditSuccess(false);
  }

  async function handleGuardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    setEditError(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        nombre: editForm.nombre.trim() || null,
        telefono: editForm.telefono.trim() || null,
        direccion: editForm.direccion.trim() || null,
      })
      .eq("id", editingUser.id);

    if (error) {
      setEditError("No se pudo guardar. Intentá nuevamente.");
    } else {
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                nombre: editForm.nombre.trim() || null,
                telefono: editForm.telefono.trim() || null,
                direccion: editForm.direccion.trim() || null,
              }
            : u,
        ),
      );
      setEditSuccess(true);
      setTimeout(() => cerrarEdicion(), 900);
    }
    setEditLoading(false);
  }

  async function handleModificar(userId: string, delta: number) {
    setLoadingId(userId);

    // Optimistic update
    setUsuarios((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const { activo } = calcularPeriodo(u.periodo_inicio);
        // Si sumamos y no hay período activo, iniciamos uno nuevo
        const nuevoPeriodoInicio =
          delta > 0 && !activo && !u.periodo_inicio
            ? new Date().toISOString()
            : u.periodo_inicio;
        return {
          ...u,
          puntos: Math.max(0, Math.min(META, u.puntos + delta)),
          periodo_inicio: nuevoPeriodoInicio,
        };
      }),
    );

    startTransition(async () => {
      const { error } = await supabase.rpc("modificar_puntos", {
        target_id: userId,
        delta,
      });
      if (error) {
        // Revertir en caso de error
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, puntos: Math.max(0, Math.min(META, u.puntos - delta)) }
              : u,
          ),
        );
      } else {
        // Refrescar datos reales desde la BD para tener periodo_inicio correcto
        const { data } = await supabase
          .from("profiles")
          .select("puntos, periodo_inicio")
          .eq("id", userId)
          .single();
        if (data) {
          setUsuarios((prev) =>
            prev.map((u) =>
              u.id === userId
                ? {
                    ...u,
                    puntos: data.puntos,
                    periodo_inicio: data.periodo_inicio,
                  }
                : u,
            ),
          );
        }
      }
      setLoadingId(null);
    });
  }

  async function handleResetear(userId: string) {
    if (
      !confirm(
        "¿Resetear los puntos de este cliente a 0?\nEl período activo también se cancelará.",
      )
    )
      return;
    setLoadingId(userId);
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, puntos: 0, periodo_inicio: null, periodo_fin: null }
          : u,
      ),
    );
    startTransition(async () => {
      await supabase.rpc("resetear_puntos_usuario", { target_id: userId });
      setLoadingId(null);
    });
  }

  // ── Ver como usuario ──
  function handleVerUsuario(userId: string) {
    router.push(`/admin/vista-usuario/${userId}`);
  }

  // ── Crear cuenta ──
  async function handleCrearSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      const res = await crearUsuarioAction({
        nombre: createForm.nombre,
        email: createForm.email,
        password: createForm.password,
        telefono: createForm.telefono,
        direccion: createForm.direccion,
      });

      if (res.error) {
        setCreateError(res.error);
      } else if (res.data) {
        // Agregar el usuario a la lista inmediatamente
        setUsuarios([
          {
            id: res.data.userId,
            nombre: createForm.nombre,
            email: createForm.email,
            telefono: createForm.telefono || null,
            direccion: createForm.direccion || null,
            puntos: 0,
            rol: "usuario",
            periodo_inicio: null,
            periodo_fin: null,
          },
          ...usuarios,
        ]);
        setCreateModalOpen(false);
      }
    } catch {
      setCreateError("Error de red. Verificá tu conexión.");
    }
    setCreateLoading(false);
  }

  // ── Canjear pizza ── (doble confirmación)
  async function handleCanjear(userId: string) {
    if (canjearId !== userId) {
      setCanjearId(userId);
      setTimeout(
        () => setCanjearId((prev) => (prev === userId ? null : prev)),
        4000,
      );
      return;
    }

    // Segundo click: ejecutar canje
    setCanjearId(null);
    setLoadingId(userId);

    startTransition(async () => {
      const { error } = await supabase.rpc("canjear_pizza", {
        target_id: userId,
      });
      if (error) {
        alert(`Error al canjear: ${error.message}`);
      } else {
        // Resetear puntos y período en el estado local
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, puntos: 0, periodo_inicio: null, periodo_fin: null }
              : u,
          ),
        );
      }
      setLoadingId(null);
    });
  }

  // ── Hacer admin ── (abre modal con contraseña)
  function handleHacerAdmin(userId: string, nombre: string | null) {
    setAdminPassword("");
    setAdminPasswordError(null);
    setAdminModal({ userId, nombre });
  }

  async function handleAdminConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!adminModal) return;

    const ADMIN_CODE = "03072629";
    if (adminPassword !== ADMIN_CODE) {
      setAdminPasswordError("Contraseña incorrecta. Intentá de nuevo.");
      return;
    }

    setAdminLoading(true);
    setAdminPasswordError(null);

    const { error } = await supabase.rpc("hacer_admin", {
      target_id: adminModal.userId,
    });

    if (error) {
      setAdminPasswordError(`Error: ${error.message}`);
    } else {
      setUsuarios((prev) => prev.filter((u) => u.id !== adminModal.userId));
      setAdminModal(null);
    }
    setAdminLoading(false);
  }

  // ── Borrar cuenta ── (doble confirmación)
  async function handleBorrar(userId: string, nombre: string | null) {
    // Primer click: marcar como "pendiente de confirmar"
    if (deletingId !== userId) {
      setDeletingId(userId);
      // Auto-cancelar después de 4 segundos si no confirma
      setTimeout(
        () => setDeletingId((prev) => (prev === userId ? null : prev)),
        4000,
      );
      return;
    }

    // Segundo click: confirmar borrado
    setDeletingId(null);
    setLoadingId(userId);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userToken = session?.access_token ?? "";

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://uwvcabgrndthgcueutbw.supabase.co";
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dmNhYmdybmR0aGdjdWV1dGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDE1NjcsImV4cCI6MjA4ODAxNzU2N30.vg_2zlHxLomla0hMQR2s5CBw1cGkaS4jhWJX3hqlEo4";

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/borrar-usuario`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
          "X-User-Token": userToken,
        },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setUsuarios((prev) => prev.filter((u) => u.id !== userId));
      } else {
        const err = await res
          .json()
          .catch(() => ({ error: "Error desconocido" }));
        alert(`Error al borrar: ${err.error || "Error desconocido"}`);
      }
    } catch {
      alert("Error de red al intentar borrar la cuenta. Verificá tu conexión.");
    }
    setLoadingId(null);
  }

  if (usuarios.length === 0) {
    return (
      <div className="pa-empty">
        No hay clientes registrados aún. Creá el primero con el botón
        &ldquo;Nuevo Usuario&rdquo;.
      </div>
    );
  }

  return (
    <>
      {/* ── Search bar LOCAL (in-table, visible on mobile) ── */}
      <div className="pa-search-mobile">
        <svg
          className="pa-search-icon-sm"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="pa-search-input-sm"
          placeholder="Buscar..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
        />
      </div>

      {/* ── Table rows ── */}
      {usuariosFiltrados.length === 0 ? (
        <div className="pa-empty">
          No se encontraron clientes que coincidan con &ldquo;{searchQ}&rdquo;.
        </div>
      ) : (
        <div className="pa-list">
          {usuariosFiltrados.map((u) => {
            const isLoading = loadingId === u.id;
            const listo = u.puntos >= META;
            const pct = Math.min((u.puntos / META) * 100, 100);
            const { activo: periodoActivo } = calcularPeriodo(u.periodo_inicio);

            const inicial = (u.nombre || u.email || "?")[0].toUpperCase();

            return (
              <div
                key={u.id}
                className={`pa-row ${isLoading ? "pa-row--loading" : ""}`}
              >
                {/* NOMBRE + email móvil */}
                <div className="pa-cell pa-cell--nombre">
                  <div className="pa-avatar">{inicial}</div>
                  <div className="pa-info-text">
                    <div className="pa-nombre">{u.nombre || "Sin nombre"}</div>
                    <div className="pa-email">{u.email}</div>
                    {u.telefono && (
                      <div className="pa-tel">📞 {u.telefono}</div>
                    )}
                  </div>
                </div>

                {/* EMAIL (Desktop) */}
                <div className="pa-cell pa-cell--email">
                  <span className="pa-email">{u.email}</span>
                </div>

                {/* PUNTOS + PERÍODO (agrupados en mobile) */}
                <div className="pa-mobile-row2">
                  <div className="pa-cell pa-cell--puntos">
                    <div className="pa-puntos-wrapper">
                      <span
                        className={`pa-points-badge ${listo ? "pa-points-badge--max" : ""}`}
                      >
                        {u.puntos}
                        <span className="pa-points-meta">/{META}</span>
                      </span>
                      <div className="pa-bar-track">
                        <div
                          className={`pa-bar-fill ${listo ? "pa-bar-fill--max" : ""}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="pa-cell pa-cell--venc">
                    <PeriodoChip periodo_inicio={u.periodo_inicio} />
                  </div>
                </div>

                {/* ACCIONES */}
                <div className="pa-cell pa-cell--actions">
                  <button
                    className="pa-btn pa-btn--add"
                    onClick={() => handleModificar(u.id, 1)}
                    disabled={isLoading || u.puntos >= META}
                    title="Sumar punto"
                  >
                    +1 Punto
                  </button>
                  <button
                    className="pa-btn pa-btn--sub"
                    onClick={() => handleModificar(u.id, -1)}
                    disabled={isLoading || u.puntos === 0}
                    title="Restar punto"
                  >
                    −1 Punto
                  </button>
                  <button
                    className={`pa-btn ${
                      canjearId === u.id
                        ? "pa-btn--canjear-confirm"
                        : "pa-btn--canjear"
                    }`}
                    onClick={() => handleCanjear(u.id)}
                    disabled={isLoading || u.puntos < META}
                    title={
                      u.puntos < META
                        ? `Necesita ${META - u.puntos} punto${META - u.puntos !== 1 ? "s" : ""} más`
                        : canjearId === u.id
                          ? "✅ Clic de nuevo para CONFIRMAR el canje"
                          : "Canjear pizza (10 puntos)"
                    }
                  >
                    {canjearId === u.id ? "✅ ¿Confirmar?" : "🍕 Canjear"}
                  </button>
                  <button
                    className="pa-btn pa-btn--reset"
                    onClick={() => handleResetear(u.id)}
                    disabled={isLoading || (u.puntos === 0 && !periodoActivo)}
                    title="Resetear puntos y período"
                  >
                    Resetear
                  </button>
                  <button
                    className="pa-btn pa-btn--icon pa-btn--edit"
                    onClick={() => abrirEdicion(u)}
                    disabled={isLoading}
                    title="Editar datos"
                  >
                    ✏️
                  </button>
                  <button
                    className="pa-btn pa-btn--icon pa-btn--view"
                    onClick={() => handleVerUsuario(u.id)}
                    disabled={isLoading}
                    title="Ver panel del usuario"
                  >
                    👁️
                  </button>
                  <button
                    className="pa-btn pa-btn--icon pa-btn--admin"
                    onClick={() => handleHacerAdmin(u.id, u.nombre)}
                    disabled={isLoading}
                    title="Hacer administrador"
                  >
                    👑
                  </button>
                  <button
                    className={`pa-btn pa-btn--icon ${
                      deletingId === u.id
                        ? "pa-btn--delete-confirm"
                        : "pa-btn--delete"
                    }`}
                    onClick={() => handleBorrar(u.id, u.nombre)}
                    disabled={isLoading}
                    title={
                      deletingId === u.id
                        ? "⚠️ Clic de nuevo para CONFIRMAR el borrado"
                        : "Borrar cuenta"
                    }
                  >
                    {deletingId === u.id ? "⚠️" : "🗑️"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination footer */}
      <div className="pa-pagination">
        <span className="pa-pag-info">
          Mostrando 1–{usuariosFiltrados.length} de {usuarios.length} usuarios
        </span>
        <div className="pa-pag-pages">
          <button className="pa-pag-btn pa-pag-btn--active">1</button>
        </div>
      </div>

      {/* ── Modal Nuevo Usuario ── */}
      {createModalOpen && (
        <>
          <div
            className="pa-overlay"
            onClick={() => setCreateModalOpen(false)}
          />
          <div
            className="pa-modal"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="pa-modal-header">
              <div>
                <h3 className="pa-modal-title">Nuevo Cliente</h3>
                <p className="pa-modal-sub">
                  Completá los datos para crear la cuenta
                </p>
              </div>
              <button
                type="button"
                className="pa-modal-close"
                onClick={() => setCreateModalOpen(false)}
              >
                ×
              </button>
            </div>

            {createError && (
              <div className="error-msg" style={{ marginBottom: 16 }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCrearSubmit}>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  placeholder="Ej: Juan García"
                  required
                  value={createForm.nombre}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, nombre: e.target.value }))
                  }
                  disabled={createLoading}
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  placeholder="juan@email.com"
                  required
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, email: e.target.value }))
                  }
                  disabled={createLoading}
                />
              </div>
              <div className="form-group">
                <label>Contraseña *</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, password: e.target.value }))
                  }
                  disabled={createLoading}
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  placeholder="Ej: +54 11 1234-5678"
                  value={createForm.telefono}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, telefono: e.target.value }))
                  }
                  disabled={createLoading}
                />
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input
                  type="text"
                  placeholder="Ej: Av. Corrientes 1234, CABA"
                  value={createForm.direccion}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, direccion: e.target.value }))
                  }
                  disabled={createLoading}
                />
              </div>
              <div className="pa-modal-actions" style={{ marginTop: 20 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={createLoading}
                >
                  {createLoading ? "Creando..." : "Crear Cliente"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── Edit modal ── */}
      {editingUser && (
        <>
          <div className="pa-overlay" onClick={cerrarEdicion} />
          <div className="pa-modal">
            <div className="pa-modal-header">
              <div>
                <h3 className="pa-modal-title">Editar cliente</h3>
                <p className="pa-modal-sub">{editingUser.email}</p>
              </div>
              <button className="pa-modal-close" onClick={cerrarEdicion}>
                ×
              </button>
            </div>

            {editError && <div className="error-msg">{editError}</div>}
            {editSuccess && (
              <div className="success-msg">✅ ¡Guardado correctamente!</div>
            )}

            <form onSubmit={handleGuardarEdicion}>
              <div className="form-group">
                <label htmlFor="edit-nombre">Nombre</label>
                <input
                  id="edit-nombre"
                  type="text"
                  placeholder="Nombre completo"
                  value={editForm.nombre}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, nombre: e.target.value }))
                  }
                  disabled={editLoading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-tel">Teléfono</label>
                <input
                  id="edit-tel"
                  type="tel"
                  placeholder="+54 11 1234-5678"
                  value={editForm.telefono}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, telefono: e.target.value }))
                  }
                  disabled={editLoading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-dir">Dirección</label>
                <input
                  id="edit-dir"
                  type="text"
                  placeholder="Av. Corrientes 1234"
                  value={editForm.direccion}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, direccion: e.target.value }))
                  }
                  disabled={editLoading}
                />
              </div>
              <div className="pa-modal-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editLoading}
                  style={{ flex: 1 }}
                >
                  {editLoading ? "Guardando..." : "💾 Guardar"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={cerrarEdicion}
                  disabled={editLoading}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── Modal Hacer Admin (contraseña) ── */}
      {adminModal && (
        <>
          <div
            className="pa-overlay"
            onClick={() => !adminLoading && setAdminModal(null)}
          />
          <div className="pa-modal">
            <div className="pa-modal-header">
              <div>
                <h3 className="pa-modal-title">👑 Hacer Administrador</h3>
                <p className="pa-modal-sub">
                  {adminModal.nombre || "Este usuario"} pasará a ser admin
                </p>
              </div>
              <button
                type="button"
                className="pa-modal-close"
                onClick={() => setAdminModal(null)}
                disabled={adminLoading}
              >
                ×
              </button>
            </div>

            {adminPasswordError && (
              <div className="error-msg" style={{ marginBottom: 16 }}>
                {adminPasswordError}
              </div>
            )}

            <form onSubmit={handleAdminConfirm}>
              <div className="form-group">
                <label htmlFor="admin-pwd">Contraseña de autorización</label>
                <input
                  id="admin-pwd"
                  type="password"
                  placeholder="Ingresá el código de administrador"
                  required
                  autoComplete="off"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setAdminPasswordError(null);
                  }}
                  disabled={adminLoading}
                />
              </div>
              <div className="pa-modal-actions" style={{ marginTop: 20 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={adminLoading || !adminPassword}
                >
                  {adminLoading ? "Procesando..." : "👑 Confirmar"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => setAdminModal(null)}
                  disabled={adminLoading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <style>{`
        .pa-empty {
          padding: 56px 24px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }

        /* Mobile search bar */
        .pa-search-mobile {
          display: none;
          position: relative;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border);
        }
        .pa-search-icon-sm {
          position: absolute;
          left: 38px;
          top: 50%;
          transform: translateY(-50%);
          width: 15px;
          height: 15px;
          color: var(--text-muted);
          pointer-events: none;
        }
        .pa-search-input-sm {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 50px;
          padding: 10px 16px 10px 38px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 14px;
          outline: none;
        }
        .pa-search-input-sm:focus { border-color: var(--accent); }

        /* Rows */
        .pa-list { display: flex; flex-direction: column; }

        .pa-row {
          display: grid;
          grid-template-columns: 2fr 2fr 1fr 1.5fr 1.5fr;
          align-items: center;
          gap: 16px;
          padding: 14px 24px;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .pa-row:last-child { border-bottom: none; }
        .pa-row:hover { background: var(--bg-card-hover); }
        .pa-row--loading { opacity: 0.55; pointer-events: none; }

        .pa-cell { min-width: 0; }
        .pa-cell--nombre { display: flex; align-items: center; gap: 10px; }

        /* En desktop el email dentro del bloque nombre está oculto (va en su propia columna) */
        .pa-info-text .pa-email { display: none; }

        /* En desktop pa-mobile-row2 actúa como contenedor transparente (sus hijos son celdas del grid) */
        .pa-mobile-row2 { display: contents; }

        /* Avatar */
        .pa-avatar {
          width: 38px; height: 38px; min-width: 38px;
          border-radius: 50%;
          background: var(--accent-light); color: var(--accent);
          font-size: 15px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--border-accent);
          flex-shrink: 0;
        }
        .pa-info-text { min-width: 0; }
        .pa-nombre {
          font-weight: 600; font-size: 14px; color: var(--text-primary);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pa-email {
          font-size: 12px; color: var(--text-muted);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          display: block;
        }
        .pa-tel { font-size: 11px; color: var(--text-muted); margin-top: 1px; }

        /* Points */
        .pa-puntos-wrapper { display: flex; flex-direction: column; gap: 5px; }
        .pa-points-badge {
          font-size: 15px; font-weight: 800; color: var(--accent);
        }
        .pa-points-badge--max { color: var(--success); }
        .pa-points-meta { font-size: 11px; color: var(--text-muted); font-weight: 500; }
        .pa-bar-track {
          height: 5px; background: var(--bg-secondary);
          border-radius: 50px; overflow: hidden; width: 80px;
        }
        .pa-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #ee5b2b, #f0a500);
          border-radius: 50px;
          transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
        }
        .pa-bar-fill--max { background: linear-gradient(90deg, #4caf7d, #3a9a68); }

        /* Chips */
        .pa-chip {
          display: inline-block; font-size: 11px; font-weight: 600;
          padding: 3px 9px; border-radius: 50px;
        }
        .pa-chip--ok      { background: var(--success-bg); color: var(--success); }
        .pa-chip--warn    { background: rgba(240,165,0,0.15); color: var(--warning); }
        .pa-chip--none    { background: var(--bg-secondary); color: var(--text-muted); }

        /* Action buttons */
        .pa-cell--actions { display: flex; gap: 5px; align-items: center; justify-content: flex-end; flex-wrap: wrap; }
        .pa-btn {
          height: 30px;
          padding: 0 10px;
          border: 1px solid transparent;
          border-radius: 50px;
          font-size: 12px; font-weight: 700;
          cursor: pointer; font-family: inherit;
          transition: all 0.15s;
          white-space: nowrap;
          display: flex; align-items: center;
        }
        .pa-btn--icon { width: 30px; padding: 0; justify-content: center; font-size: 13px; border-radius: 8px; }
        .pa-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none !important; }

        .pa-btn--add   { background: var(--success-bg); color: var(--success); border-color: rgba(76,175,125,0.3); }
        .pa-btn--add:hover:not(:disabled)   { background: var(--success); color: white; }
        .pa-btn--sub   { background: var(--danger-bg); color: var(--danger); border-color: rgba(224,92,92,0.3); }
        .pa-btn--sub:hover:not(:disabled)   { background: var(--danger); color: white; }
        .pa-btn--reset { background: var(--bg-secondary); color: var(--text-muted); border-color: var(--border); }
        .pa-btn--reset:hover:not(:disabled) { color: var(--text-primary); border-color: var(--text-muted); }
        .pa-btn--edit  { background: var(--accent-light); color: var(--accent); border-color: var(--border-accent); }
        .pa-btn--edit:hover:not(:disabled)  { background: var(--accent); color: white; }
        .pa-btn--view  { background: rgba(59,130,246,0.12); color: rgb(147,197,253); border-color: rgba(59,130,246,0.3); }
        .pa-btn--view:hover:not(:disabled)  { background: rgba(59,130,246,0.8); color: white; }
        /* Canjear */
        .pa-btn--canjear { background: rgba(251,191,36,0.12); color: #fbbf24; border-color: rgba(251,191,36,0.3); }
        .pa-btn--canjear:hover:not(:disabled) { background: rgba(251,191,36,0.85); color: #1a1200; }
        .pa-btn--canjear-confirm {
          background: #fbbf24; color: #1a1200; border-color: #fbbf24;
          animation: canjearPulse 0.6s ease infinite; font-size: 11px;
        }
        @keyframes canjearPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.5); }
          50%      { box-shadow: 0 0 0 5px rgba(251,191,36,0); }
        }

        /* Hacer admin */
        .pa-btn--admin { background: rgba(168,85,247,0.12); color: #c084fc; border-color: rgba(168,85,247,0.3); }
        .pa-btn--admin:hover:not(:disabled) { background: rgba(168,85,247,0.8); color: white; }
        .pa-btn--admin-confirm {
          background: #a855f7; color: white; border-color: #a855f7;
          animation: adminPulse 0.6s ease infinite;
        }
        @keyframes adminPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.5); }
          50%      { box-shadow: 0 0 0 5px rgba(168,85,247,0); }
        }

        .pa-btn--delete { background: var(--danger-bg); color: var(--danger); border-color: rgba(224,92,92,0.3); }
        .pa-btn--delete:hover:not(:disabled) { background: var(--danger); color: white; }
        .pa-btn--delete-confirm {
          background: var(--danger); color: white; border-color: var(--danger);
          animation: confirmPulse 0.6s ease infinite;
        }
        @keyframes confirmPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(224,92,92,0.5); }
          50%      { box-shadow: 0 0 0 5px rgba(224,92,92,0); }
        }

        /* Pagination */
        .pa-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-top: 1px solid var(--border);
        }
        .pa-pag-info { font-size: 12px; color: var(--text-muted); }
        .pa-pag-pages { display: flex; gap: 6px; }
        .pa-pag-btn {
          width: 32px; height: 32px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: none;
          color: var(--text-muted);
          font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          transition: all 0.15s;
        }
        .pa-pag-btn--active {
          background: var(--accent); border-color: var(--accent); color: white;
        }
        .pa-pag-btn:hover:not(.pa-pag-btn--active) { background: var(--bg-card-hover); color: var(--text-primary); }

        /* Modal */
        .pa-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(4px); z-index:200; animation:paFadeIn 0.2s ease; }
        .pa-modal {
          position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
          z-index:201; background:var(--bg-card);
          border:1px solid var(--border-accent); border-radius:var(--radius-lg);
          padding:36px; width:calc(100% - 32px); max-width:460px;
          box-shadow:0 24px 64px rgba(0,0,0,0.6); animation:paSlideUp 0.22s ease;
        }
        .pa-modal-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; }
        .pa-modal-title  { font-size:18px; font-weight:700; color:var(--text-primary); }
        .pa-modal-sub    { font-size:13px; color:var(--text-muted); margin-top:3px; }
        .pa-modal-close  { background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer; line-height:1; padding:0 4px; transition:color 0.15s; border-radius:6px; }
        .pa-modal-close:hover { color:var(--text-primary); }
        .pa-modal-actions { display:flex; gap:12px; margin-top:8px; }
        @keyframes paFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes paSlideUp { from{opacity:0;transform:translate(-50%,-46%)} to{opacity:1;transform:translate(-50%,-50%)} }

        /* Responsive */
        @media (max-width: 1024px) {
          .pa-row { grid-template-columns: 2fr 2fr 1fr auto; }
          .pa-cell--venc { display: none; }
        }

        /* ── Mobile: layout de tarjeta ── */
        @media (max-width: 768px) {
          .pa-search-mobile { display: block; }

          /* Cada fila pasa a ser una tarjeta vertical */
          .pa-row {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 16px;
            border-bottom: 1px solid var(--border);
            border-radius: 0;
          }

          /* Fila 1: avatar + nombre + email (siempre visible) */
          .pa-cell--nombre {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          /* Email visible en mobile dentro del bloque nombre, pero ocultamos la columna dedicada */
          .pa-info-text .pa-email { display: block; }
          .pa-cell--email { display: none; }

          /* Fila 2: puntos + período en la misma línea */
          .pa-mobile-row2 {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }
          .pa-cell--puntos { display: block; }
          .pa-bar-track { width: 60px; }
          .pa-cell--venc { display: block; }

          /* Fila 3: botones en grilla de 3 columnas, cómodos para el dedo */
          .pa-cell--actions {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 6px;
          }
          .pa-btn {
            height: 38px;
            font-size: 12px;
            justify-content: center;
            border-radius: 8px;
            padding: 0 6px;
          }
          .pa-btn--icon {
            width: auto;
            border-radius: 8px;
          }

          .pa-modal { padding: 24px 18px; }
        }

        @media (max-width: 480px) {
          .pa-cell--actions {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </>
  );
}
