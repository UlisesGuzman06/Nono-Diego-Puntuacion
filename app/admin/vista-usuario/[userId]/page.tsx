import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VistaUsuarioPage({
  params,
}: {
  params: { userId: string };
}) {
  const supabase = createClient();

  // Verificar que quien accede es admin
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

  // Obtener el perfil del usuario a visualizar
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.userId)
    .single();

  if (!profile || profile.rol !== "usuario") notFound();

  const ahora = new Date();

  // Lógica de período de 40 días
  let puntos = profile.puntos ?? 0;
  let periodoInicio: Date | null = null;
  let periodoFin: Date | null = null;
  let periodoActivo = false;
  let diasRestantes: number | null = null;
  let proximaAVencer = false;

  if (profile.periodo_inicio) {
    periodoInicio = new Date(profile.periodo_inicio);
    periodoFin = new Date(periodoInicio.getTime() + 40 * 24 * 60 * 60 * 1000);

    if (ahora >= periodoFin) {
      puntos = 0;
      periodoActivo = false;
    } else {
      periodoActivo = true;
      diasRestantes = Math.ceil(
        (periodoFin.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24),
      );
      proximaAVencer = diasRestantes <= 5;
    }
  }

  const META = 10;
  const porcentaje = Math.min((puntos / META) * 100, 100);
  const puedeCanjar = puntos >= META && periodoActivo;

  const formatFecha = (d: Date) =>
    d.toLocaleDateString("es-AR", { day: "numeric", month: "long" });

  return (
    <div className="dashboard">
      {/* ── Banner de modo Admin ── */}
      <div className="vista-admin-banner">
        <div className="vista-admin-banner-left">
          <span className="vista-admin-eye">👁️</span>
          <div>
            <div className="vista-admin-title">Modo Vista Administrador</div>
            <div className="vista-admin-sub">
              Estás viendo el panel de{" "}
              <strong>{profile.nombre || profile.email}</strong>. Las acciones
              están deshabilitadas.
            </div>
          </div>
        </div>
        <Link href="/admin" className="vista-admin-back">
          ← Volver al Panel Admin
        </Link>
      </div>

      {/* Navbar (visual del usuario) */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="logo">🍕</span>
          <span className="brand-text">
            Nono <span>Diego</span>
          </span>
        </div>
        <div className="navbar-actions">
          <span className="user-badge">
            👤 {profile.nombre || profile.email?.split("@")[0]}
          </span>
          <button className="btn btn-logout" disabled style={{ opacity: 0.5 }}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="main-content">
        <div className="page-heading">
          <h2>¡Hola, {profile.nombre || "Cliente"}! 👋</h2>
          <p>Acumulá puntos con cada pizza y ganá una gratis.</p>
        </div>

        {/* Info cards del admin */}
        <div className="vista-info-cards">
          <div className="vista-info-card">
            <div className="vista-info-label">Email</div>
            <div className="vista-info-value">{profile.email || "—"}</div>
          </div>
          <div className="vista-info-card">
            <div className="vista-info-label">Teléfono</div>
            <div className="vista-info-value">{profile.telefono || "—"}</div>
          </div>
          <div className="vista-info-card">
            <div className="vista-info-label">Dirección</div>
            <div className="vista-info-value">{profile.direccion || "—"}</div>
          </div>
          <div className="vista-info-card">
            <div className="vista-info-label">ID de usuario</div>
            <div className="vista-info-value vista-info-value--mono">
              {profile.id.slice(0, 8)}…
            </div>
          </div>
        </div>

        {/* Banner período próximo a vencer */}
        {periodoActivo && proximaAVencer && periodoFin && (
          <div
            style={{
              background: "rgba(240,165,0,0.12)",
              border: "1px solid rgba(240,165,0,0.35)",
              borderRadius: "var(--radius)",
              padding: "14px 18px",
              marginBottom: 24,
              color: "var(--warning)",
              fontSize: 14,
              fontWeight: 500,
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            ⏳ Período vence en{" "}
            <strong>
              {diasRestantes} día{diasRestantes !== 1 ? "s" : ""}
            </strong>{" "}
            ({formatFecha(periodoFin)})
          </div>
        )}

        {/* Banner período expirado */}
        {!periodoActivo && profile.periodo_inicio && (
          <div
            style={{
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: "var(--radius)",
              padding: "14px 18px",
              marginBottom: 24,
              color: "rgba(147,197,253,0.9)",
              fontSize: 14,
              fontWeight: 500,
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            🔄 El período anterior venció. La próxima compra iniciará uno nuevo
            de 40 días.
          </div>
        )}

        {/* Points Display */}
        <div className="points-card">
          <div className="points-label">Sus Puntos</div>

          <div className="points-display">
            <span className="points-number">{puntos}</span>
            <span className="points-divider">/</span>
            <span className="points-total">{META}</span>
          </div>

          <div className="pizza-icons">
            {Array.from({ length: META }).map((_, i) => (
              <span
                key={i}
                className={`pizza-icon-item ${i < puntos ? "earned" : "empty"}`}
              >
                🍕
              </span>
            ))}
          </div>

          <div className="progress-container">
            <div className="progress-bar-wrapper">
              <div
                className="progress-bar-fill"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <div className="progress-info">
              <span>{puntos} puntos acumulados</span>
              <span>
                {META - puntos > 0
                  ? `${META - puntos} para pizza gratis`
                  : "¡Listo para canjear!"}
              </span>
            </div>
          </div>

          {periodoActivo && periodoInicio && periodoFin && (
            <div
              style={{
                marginTop: 16,
                padding: "10px 16px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: "var(--radius)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 12,
                color: "var(--text-muted)",
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span>
                📅 Período:{" "}
                <strong style={{ color: "var(--text-secondary)" }}>
                  {formatFecha(periodoInicio)}
                </strong>
              </span>
              <span>
                Vence:{" "}
                <strong
                  style={{
                    color:
                      diasRestantes && diasRestantes <= 5
                        ? "var(--warning)"
                        : "var(--text-secondary)",
                  }}
                >
                  {formatFecha(periodoFin)}
                </strong>
              </span>
              <span>
                Quedan:{" "}
                <strong style={{ color: "var(--accent)" }}>
                  {diasRestantes} día{diasRestantes !== 1 ? "s" : ""}
                </strong>
              </span>
            </div>
          )}

          {!periodoActivo && (
            <div
              style={{
                marginTop: 16,
                padding: "10px 16px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "var(--radius)",
                border: "1px solid rgba(255,255,255,0.06)",
                fontSize: 12,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              La próxima compra iniciará un nuevo período de 40 días
            </div>
          )}
        </div>

        {/* Redeem Section (deshabilitada para el admin) */}
        <div
          className={`redeem-section ${puedeCanjar ? "ready" : ""}`}
          style={{ position: "relative" }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              borderRadius: "var(--radius-lg)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(2px)",
            }}
          >
            <span
              style={{
                background: "rgba(30,18,9,0.9)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 50,
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-muted)",
              }}
            >
              🔒 Solo lectura — Vista Admin
            </span>
          </div>
          {puedeCanjar ? (
            <>
              <div className="redeem-title">🎉 ¡Felicitaciones!</div>
              <div className="redeem-subtitle">
                Juntó 10 puntos. ¡Puede recoger su pizza gratis!
              </div>
            </>
          ) : (
            <>
              <div className="redeem-title">Pizza Gratis</div>
              <div className="redeem-subtitle">
                {periodoActivo
                  ? `Necesita ${META - puntos} punto${META - puntos !== 1 ? "s" : ""} más.`
                  : "Sin período activo."}
              </div>
            </>
          )}
          <button className="btn-redeem" disabled>
            {puedeCanjar
              ? "🍕 Canjear Pizza Gratis"
              : `Faltan ${META - puntos} puntos`}
          </button>
        </div>
      </main>

      <style>{`
        /* ── Banner Admin ── */
        .vista-admin-banner {
          background: linear-gradient(90deg, rgba(238,91,43,0.15) 0%, rgba(240,165,0,0.1) 100%);
          border-bottom: 2px solid rgba(238,91,43,0.4);
          padding: 14px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          position: sticky;
          top: 0;
          z-index: 200;
          backdrop-filter: blur(12px);
        }
        .vista-admin-banner-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .vista-admin-eye {
          font-size: 28px;
          filter: drop-shadow(0 0 8px rgba(238,91,43,0.6));
        }
        .vista-admin-title {
          font-size: 14px;
          font-weight: 800;
          color: var(--accent);
          letter-spacing: 0.5px;
        }
        .vista-admin-sub {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .vista-admin-back {
          background: var(--accent);
          color: white;
          text-decoration: none;
          padding: 9px 20px;
          border-radius: var(--radius);
          font-size: 13px;
          font-weight: 700;
          transition: all 0.2s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .vista-admin-back:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
          box-shadow: var(--shadow-accent);
        }

        /* ── Info Cards ── */
        .vista-info-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .vista-info-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 14px 16px;
        }
        .vista-info-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .vista-info-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          word-break: break-all;
        }
        .vista-info-value--mono {
          font-family: monospace;
          font-size: 12px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
