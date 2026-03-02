"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Usuario = {
  id: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  puntos: number;
  rol: string;
};

type EditForm = {
  nombre: string;
  telefono: string;
  direccion: string;
};

const META = 10;

export default function PuntosActions({
  usuarios: initialUsuarios,
}: {
  usuarios: Usuario[];
}) {
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    nombre: "",
    telefono: "",
    direccion: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const supabase = createClient();

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
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, puntos: Math.max(0, Math.min(META, u.puntos + delta)) }
          : u,
      ),
    );
    startTransition(async () => {
      const { error } = await supabase.rpc("modificar_puntos", {
        target_id: userId,
        delta,
      });
      if (error) {
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, puntos: Math.max(0, Math.min(META, u.puntos - delta)) }
              : u,
          ),
        );
      }
      setLoadingId(null);
    });
  }

  async function handleResetear(userId: string) {
    if (!confirm("¿Resetear los puntos de este cliente a 0?")) return;
    setLoadingId(userId);
    setUsuarios((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, puntos: 0 } : u)),
    );
    startTransition(async () => {
      await supabase.rpc("resetear_puntos_usuario", { target_id: userId });
      setLoadingId(null);
    });
  }

  if (usuarios.length === 0) {
    return (
      <div className="pa-empty">
        No hay clientes registrados aún. Creá el primero arriba.
      </div>
    );
  }

  return (
    <>
      {/* ── Cards (se usan en mobile y desktop) ── */}
      <div className="pa-list">
        {usuarios.map((u) => {
          const isLoading = loadingId === u.id;
          const listo = u.puntos >= META;
          const pct = Math.min((u.puntos / META) * 100, 100);

          return (
            <div
              key={u.id}
              className={`pa-card ${isLoading ? "pa-card--loading" : ""}`}
            >
              {/* Columna izquierda: info */}
              <div className="pa-info">
                {/* Avatar inicial */}
                <div className="pa-avatar">
                  {(u.nombre || u.email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <div className="pa-nombre">{u.nombre || "Sin nombre"}</div>
                  <div className="pa-email">{u.email}</div>
                  {u.telefono && <div className="pa-tel">📞 {u.telefono}</div>}
                </div>
              </div>

              {/* Barra de puntos */}
              <div className="pa-puntos">
                <div className="pa-puntos-header">
                  <span className="pa-puntos-label">Puntos</span>
                  <span
                    className={`pa-puntos-valor ${listo ? "pa-puntos-valor--max" : ""}`}
                  >
                    {u.puntos} / {META}
                  </span>
                </div>
                <div className="pa-bar-track">
                  <div
                    className={`pa-bar-fill ${listo ? "pa-bar-fill--max" : ""}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {listo && (
                  <div className="pa-listo-badge">✅ Listo para canjear</div>
                )}
              </div>

              {/* Acciones */}
              <div className="pa-actions">
                <button
                  className="pa-btn pa-btn--add"
                  onClick={() => handleModificar(u.id, 1)}
                  disabled={isLoading || u.puntos >= META}
                  title="Sumar punto"
                >
                  +1
                </button>
                <button
                  className="pa-btn pa-btn--sub"
                  onClick={() => handleModificar(u.id, -1)}
                  disabled={isLoading || u.puntos === 0}
                  title="Restar punto"
                >
                  −1
                </button>
                <button
                  className="pa-btn pa-btn--reset"
                  onClick={() => handleResetear(u.id)}
                  disabled={isLoading || u.puntos === 0}
                  title="Resetear puntos"
                >
                  ↺
                </button>
                <button
                  className="pa-btn pa-btn--edit"
                  onClick={() => abrirEdicion(u)}
                  disabled={isLoading}
                  title="Editar datos"
                >
                  ✏️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal de edición ── */}
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

      {/* ── Estilos del componente ── */}
      <style>{`
        /* Empty */
        .pa-empty {
          padding: 48px;
          text-align: center;
          color: var(--text-muted);
          font-size: 15px;
        }

        /* Lista de tarjetas */
        .pa-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* Tarjeta individual */
        .pa-card {
          display: grid;
          grid-template-columns: minmax(160px, 2fr) minmax(140px, 2fr) auto;
          align-items: center;
          gap: 20px;
          padding: 18px 24px;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .pa-card:last-child { border-bottom: none; }
        .pa-card:hover { background: var(--bg-card-hover); }
        .pa-card--loading { opacity: 0.6; pointer-events: none; }

        /* Info del cliente */
        .pa-info {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .pa-avatar {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 50%;
          background: var(--accent-light);
          color: var(--accent);
          font-size: 16px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-accent);
        }
        .pa-nombre {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pa-email {
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pa-tel {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* Barra de puntos */
        .pa-puntos {
          min-width: 0;
        }
        .pa-puntos-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .pa-puntos-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .pa-puntos-valor {
          font-size: 13px;
          font-weight: 700;
          color: var(--accent);
        }
        .pa-puntos-valor--max {
          color: var(--success);
        }
        .pa-bar-track {
          height: 6px;
          background: var(--bg-secondary);
          border-radius: 50px;
          overflow: hidden;
        }
        .pa-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #ee5b2b, #f0a500);
          border-radius: 50px;
          transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
        }
        .pa-bar-fill--max {
          background: linear-gradient(90deg, #4caf7d, #3a9a68);
        }
        .pa-listo-badge {
          font-size: 11px;
          color: var(--success);
          font-weight: 600;
          margin-top: 5px;
        }

        /* Botones de acción */
        .pa-actions {
          display: flex;
          gap: 6px;
          align-items: center;
          justify-content: flex-end;
        }
        .pa-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pa-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          transform: none !important;
        }
        .pa-btn--add {
          background: var(--success-bg);
          color: var(--success);
          border: 1px solid rgba(76,175,125,0.3);
        }
        .pa-btn--add:hover:not(:disabled) {
          background: var(--success);
          color: white;
          transform: scale(1.08);
        }
        .pa-btn--sub {
          background: var(--danger-bg);
          color: var(--danger);
          border: 1px solid rgba(224,92,92,0.3);
        }
        .pa-btn--sub:hover:not(:disabled) {
          background: var(--danger);
          color: white;
          transform: scale(1.08);
        }
        .pa-btn--reset {
          background: var(--bg-secondary);
          color: var(--text-muted);
          border: 1px solid var(--border);
          font-size: 16px;
        }
        .pa-btn--reset:hover:not(:disabled) {
          color: var(--text-primary);
          border-color: var(--text-muted);
          transform: rotate(-30deg) scale(1.05);
        }
        .pa-btn--edit {
          background: var(--accent-light);
          color: var(--accent);
          border: 1px solid var(--border-accent);
          font-size: 13px;
        }
        .pa-btn--edit:hover:not(:disabled) {
          background: var(--accent);
          color: white;
          transform: scale(1.08);
        }

        /* Modal */
        .pa-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(4px);
          z-index: 200;
          animation: paFadeIn 0.2s ease;
        }
        .pa-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 201;
          background: var(--bg-card);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-lg);
          padding: 36px;
          width: calc(100% - 32px);
          max-width: 460px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.6);
          animation: paSlideUp 0.22s ease;
        }
        .pa-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .pa-modal-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .pa-modal-sub {
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 3px;
        }
        .pa-modal-close {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 24px;
          cursor: pointer;
          line-height: 1;
          padding: 0 4px;
          transition: color 0.15s;
          border-radius: 6px;
        }
        .pa-modal-close:hover { color: var(--text-primary); }
        .pa-modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        /* Animaciones */
        @keyframes paFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes paSlideUp {
          from { opacity: 0; transform: translate(-50%, -46%); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .pa-card {
            grid-template-columns: 1fr;
            gap: 14px;
            padding: 16px;
          }
          .pa-actions {
            justify-content: flex-start;
          }
          .pa-modal {
            padding: 24px 18px;
          }
        }
      `}</style>
    </>
  );
}
