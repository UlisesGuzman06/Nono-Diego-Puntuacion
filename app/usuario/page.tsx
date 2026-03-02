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
    .select("puntos")
    .eq("id", user.id)
    .single();

  if (!profile || profile.puntos < 10) {
    return;
  }

  await supabase.from("profiles").update({ puntos: 0 }).eq("id", user.id);

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

  const puntos = profile.puntos ?? 0;
  const META = 10;
  const porcentaje = Math.min((puntos / META) * 100, 100);
  const puedeCanjar = puntos >= META;

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
                Necesitás {META - puntos} punto{META - puntos !== 1 ? "s" : ""}{" "}
                más para canjear tu pizza gratis.
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
                : `Faltan ${META - puntos} puntos`}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
