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

export default function PuntosActions({
  usuarios: initialUsuarios,
}: {
  usuarios: Usuario[];
}) {
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // ── Estado del modal de edición ───────────────────────────────────────────
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

  // ── Abrir modal ───────────────────────────────────────────────────────────
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

  // ── Guardar edición ───────────────────────────────────────────────────────
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
      // Actualización optimista en la tabla
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
      setTimeout(() => cerrarEdicion(), 1000);
    }

    setEditLoading(false);
  }

  // ── Puntos ────────────────────────────────────────────────────────────────
  async function handleModificar(userId: string, delta: number) {
    setLoadingId(userId);

    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, puntos: Math.max(0, u.puntos + delta) } : u,
      ),
    );

    startTransition(async () => {
      const { error } = await supabase.rpc("modificar_puntos", {
        target_id: userId,
        delta,
      });

      if (error) {
        console.error("Error modificando puntos:", error);
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, puntos: Math.max(0, u.puntos - delta) }
              : u,
          ),
        );
      }

      setLoadingId(null);
    });
  }

  async function handleResetear(userId: string) {
    setLoadingId(userId);

    setUsuarios((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, puntos: 0 } : u)),
    );

    startTransition(async () => {
      const { error } = await supabase.rpc("resetear_puntos_usuario", {
        target_id: userId,
      });

      if (error) {
        console.error("Error reseteando puntos:", error);
      }

      setLoadingId(null);
    });
  }

  const META = 10;

  return (
    <>
      {/* ── Tabla ─────────────────────────────────────────────────────────── */}
      {usuarios.length === 0 ? (
        <div
          style={{
            padding: "48px",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          No hay clientes registrados aún. Creá el primero arriba.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Dirección</th>
                <th>Puntos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => {
                const isLoading = loadingId === usuario.id;
                return (
                  <tr
                    key={usuario.id}
                    style={{
                      opacity: isLoading ? 0.7 : 1,
                      transition: "opacity 0.15s",
                    }}
                  >
                    <td>
                      <div className="user-name">{usuario.nombre || "—"}</div>
                      <div className="user-email">{usuario.email || "—"}</div>
                    </td>
                    <td>
                      <div
                        style={{ fontSize: 13, color: "var(--text-secondary)" }}
                      >
                        {usuario.telefono || (
                          <span style={{ color: "var(--text-muted)" }}>
                            Sin teléfono
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          maxWidth: 180,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {usuario.direccion || (
                          <span style={{ color: "var(--text-muted)" }}>
                            Sin dirección
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`points-badge ${usuario.puntos >= META ? "max" : ""}`}
                        style={{
                          transition: "all 0.2s",
                          transform: isLoading ? "scale(1.1)" : "scale(1)",
                        }}
                      >
                        🍕 {usuario.puntos}
                      </span>
                    </td>
                    <td>
                      {usuario.puntos >= META ? (
                        <span
                          style={{
                            color: "var(--success)",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          ✅ Listo
                        </span>
                      ) : (
                        <span
                          style={{ color: "var(--text-muted)", fontSize: 13 }}
                        >
                          Faltan {META - usuario.puntos}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleModificar(usuario.id, 1)}
                          className="btn btn-success"
                          disabled={isLoading}
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleModificar(usuario.id, -1)}
                          className="btn btn-danger"
                          disabled={isLoading || usuario.puntos === 0}
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleResetear(usuario.id)}
                          className="btn btn-ghost"
                          disabled={isLoading || usuario.puntos === 0}
                        >
                          Reset
                        </button>
                        {/* Botón Editar */}
                        <button
                          onClick={() => abrirEdicion(usuario)}
                          className="btn btn-ghost"
                          disabled={isLoading}
                          style={{
                            borderColor: "rgba(238, 91, 43, 0.3)",
                            color: "var(--accent)",
                          }}
                        >
                          ✏️ Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal de Edición ──────────────────────────────────────────────── */}
      {editingUser && (
        <>
          {/* Overlay */}
          <div
            onClick={cerrarEdicion}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
              zIndex: 200,
              animation: "fadeIn 0.2s ease",
            }}
          />

          {/* Modal */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 201,
              background: "var(--bg-card)",
              border: "1px solid var(--border-accent)",
              borderRadius: "var(--radius-lg)",
              padding: "40px",
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
              animation: "slideUp 0.25s ease",
            }}
          >
            {/* Header modal */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 28,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  ✏️ Editar Cliente
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginTop: 4,
                  }}
                >
                  {editingUser.email}
                </p>
              </div>
              <button
                onClick={cerrarEdicion}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: 22,
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "4px 8px",
                  borderRadius: 8,
                  transition: "color 0.15s",
                }}
                onMouseOver={(e) =>
                  ((e.target as HTMLElement).style.color =
                    "var(--text-primary)")
                }
                onMouseOut={(e) =>
                  ((e.target as HTMLElement).style.color = "var(--text-muted)")
                }
              >
                ×
              </button>
            </div>

            {/* Mensajes */}
            {editError && (
              <div className="error-msg" style={{ marginBottom: 20 }}>
                {editError}
              </div>
            )}
            {editSuccess && (
              <div className="success-msg" style={{ marginBottom: 20 }}>
                ✅ ¡Guardado correctamente!
              </div>
            )}

            {/* Formulario */}
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
                <label htmlFor="edit-telefono">Teléfono</label>
                <input
                  id="edit-telefono"
                  type="tel"
                  placeholder="Ej: +54 11 1234-5678"
                  value={editForm.telefono}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, telefono: e.target.value }))
                  }
                  disabled={editLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-direccion">Dirección</label>
                <input
                  id="edit-direccion"
                  type="text"
                  placeholder="Ej: Av. Corrientes 1234, CABA"
                  value={editForm.direccion}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, direccion: e.target.value }))
                  }
                  disabled={editLoading}
                />
              </div>

              {/* Botones */}
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editLoading}
                  style={{ flex: 1 }}
                >
                  {editLoading ? "Guardando..." : "💾 Guardar cambios"}
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

          {/* Animaciones del modal */}
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translate(-50%, -46%); }
              to   { opacity: 1; transform: translate(-50%, -50%); }
            }
          `}</style>
        </>
      )}
    </>
  );
}
