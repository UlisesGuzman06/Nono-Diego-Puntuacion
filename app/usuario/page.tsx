import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function canjearPizza() {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("puntos, periodo_inicio")
    .eq("id", user.id)
    .single();

  if (!profile || profile.puntos < 10) {
    return;
  }

  // Verificar que el período sigue activo (no hayan pasado 40 días)
  if (profile.periodo_inicio) {
    const inicio = new Date(profile.periodo_inicio);
    const fin = new Date(inicio.getTime() + 40 * 24 * 60 * 60 * 1000);
    if (new Date() >= fin) {
      // El período de 40 días expiró: resetear y no permitir canjear
      await supabase
        .from("profiles")
        .update({ puntos: 0, periodo_inicio: null })
        .eq("id", user.id);
      revalidatePath("/usuario");
      return;
    }
  }

  await supabase
    .from("profiles")
    .update({ puntos: 0, periodo_inicio: null })
    .eq("id", user.id);

  revalidatePath("/usuario");
}

async function logout() {
  "use server";

  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function UsuarioPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const ahora = new Date();

  // ── Lógica de período de 40 días desde primera compra ──
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
      // El período expiró: mostrar 0 puntos (se resetean la próxima interacción)
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
    d.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
    });

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
          <span className="user-badge">
            👤 {profile.nombre || user.email?.split("@")[0]}
          </span>
          <form action={logout}>
            <button type="submit" className="btn btn-logout">
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      {/* Main */}
      <main className="main-content">
        <div className="page-heading">
          <h2>¡Hola, {profile.nombre || "Cliente"}! 👋</h2>
          <p>Acumulá puntos con cada pizza y ganá una gratis.</p>
        </div>

        {/* Banner: período próximo a vencer (≤ 5 días) */}
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
            ⏳ Tu período de puntos vence en{" "}
            <strong>
              {diasRestantes} día{diasRestantes !== 1 ? "s" : ""}
            </strong>{" "}
            ({formatFecha(periodoFin)}). ¡Seguí comprando para aprovecharlos!
          </div>
        )}

        {/* Banner: período expirado y puntos reseteados */}
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
            🔄 Tu período anterior de puntos venció. ¡Tu próxima compra iniciará
            un nuevo período de 40 días!
          </div>
        )}

        {/* Points Display */}
        <div className="points-card">
          <div className="points-label">Tus Puntos</div>

          <div className="points-display">
            <span className="points-number">{puntos}</span>
            <span className="points-divider">/</span>
            <span className="points-total">{META}</span>
          </div>

          {/* Pizza Icons */}
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

          {/* Progress Bar */}
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

          {/* Información del período activo */}
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

          {/* Sin período activo */}
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
              Tu próxima compra iniciará un nuevo período de 40 días
            </div>
          )}
        </div>

        {/* Redeem Section */}
        <div className={`redeem-section ${puedeCanjar ? "ready" : ""}`}>
          {puedeCanjar ? (
            <>
              <div className="redeem-title">🎉 ¡Felicitaciones!</div>
              <div className="redeem-subtitle">
                Juntaste 10 puntos. ¡Recogé tu pizza gratis en la tienda!
              </div>
            </>
          ) : (
            <>
              <div className="redeem-title">Pizza Gratis</div>
              <div className="redeem-subtitle">
                {periodoActivo
                  ? `Necesitás ${META - puntos} punto${META - puntos !== 1 ? "s" : ""} más para canjear tu pizza gratis.`
                  : "Realizá tu próxima compra para iniciar un nuevo período de puntos."}
              </div>
            </>
          )}

          <form action={canjearPizza}>
            <button
              type="submit"
              className="btn-redeem"
              disabled={!puedeCanjar}
            >
              {puedeCanjar
                ? "🍕 Canjear Pizza Gratis"
                : periodoActivo
                  ? `Faltan ${META - puntos} puntos`
                  : "Sin período activo"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
