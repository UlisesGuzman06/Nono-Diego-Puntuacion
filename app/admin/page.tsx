import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PuntosActions from "./PuntosActions";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

// ── Server Actions ─────────────────────────────────────────────────────────────

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
    .select(
      "id, nombre, email, telefono, direccion, puntos, rol, periodo_inicio",
    )
    .order("nombre", { ascending: true });

  const ahora = new Date();

  const clientesLista = (usuarios?.filter((u) => u.rol === "usuario") ??
    []) as {
    id: string;
    nombre: string | null;
    email: string | null;
    telefono: string | null;
    direccion: string | null;
    puntos: number;
    rol: string;
    periodo_inicio: string | null;
  }[];

  // Calcular saldo real (resetear si el período de 40 días venció)
  const clientesConPeriodo = clientesLista.map((u) => {
    if (!u.periodo_inicio) return { ...u, puntos: 0, periodo_fin: null };
    const inicio = new Date(u.periodo_inicio);
    const fin = new Date(inicio.getTime() + 40 * 24 * 60 * 60 * 1000);
    const expirado = ahora >= fin;
    return {
      ...u,
      puntos: expirado ? 0 : u.puntos,
      periodo_fin: expirado ? null : fin,
    };
  });

  const totalUsuarios = clientesConPeriodo.length;
  const listosParaCanjar = clientesConPeriodo.filter(
    (u) => u.puntos >= 10,
  ).length;

  const adminNombre = adminProfile?.nombre || "Admin";
  const adminInicial = adminNombre[0].toUpperCase();

  return (
    <div className="dashboard">
      {/* ── Navbar ── */}
      <nav className="adm-navbar">
        <div className="adm-navbar-left">
          <div className="adm-brand">
            <span className="adm-logo">🍕</span>
            <div>
              <div className="adm-brand-title">Panel Admin – Nono Diego</div>
              <div className="adm-brand-sub">
                Gestión de fidelidad y recompensas
              </div>
            </div>
          </div>
          <span className="adm-solo-badge">SOLO ADMIN</span>
        </div>

        {/* Search bar */}
        <div className="adm-search-wrapper" id="adm-search-container">
          <svg
            className="adm-search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="adm-search-input"
            className="adm-search-input"
            type="text"
            placeholder="Buscar usuarios por nombre o email..."
            autoComplete="off"
          />
        </div>

        <div className="adm-navbar-right">
          <div className="adm-user-info">
            <div className="adm-avatar">{adminInicial}</div>
            <div className="adm-user-text">
              <div className="adm-user-name">{adminNombre}</div>
              <div className="adm-user-role">Super Admin</div>
            </div>
          </div>
          <form action={logout}>
            <button type="submit" className="btn btn-logout">
              Salir
            </button>
          </form>
        </div>
      </nav>

      <main className="adm-content">
        {/* ── Stats Cards ── */}
        <div className="adm-stats">
          <div className="adm-stat-card">
            <div className="adm-stat-icon adm-stat-icon--blue">👥</div>
            <div className="adm-stat-body">
              <div className="adm-stat-number">
                {totalUsuarios.toLocaleString()}
              </div>
              <div className="adm-stat-label">Total Usuarios</div>
              <div className="adm-stat-sub">Suscritos al programa</div>
            </div>
            <div className="adm-stat-trend adm-stat-trend--up">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                width="14"
                height="14"
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              +5%
            </div>
          </div>

          <div className="adm-stat-card">
            <div className="adm-stat-icon adm-stat-icon--green">🍕</div>
            <div className="adm-stat-body">
              <div className="adm-stat-number">{listosParaCanjar}</div>
              <div className="adm-stat-label">Listos para Canjear</div>
              <div className="adm-stat-sub">Usuarios con 10+ puntos</div>
            </div>
            <div className="adm-stat-trend adm-stat-trend--up">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                width="14"
                height="14"
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              +12%
            </div>
          </div>

          <div className="adm-stat-card">
            <div className="adm-stat-icon adm-stat-icon--orange">📅</div>
            <div className="adm-stat-body">
              <div className="adm-stat-number">40</div>
              <div className="adm-stat-label">Días por Período</div>
              <div className="adm-stat-sub">Desde la primera compra</div>
            </div>
          </div>
        </div>

        {/* ── Tabla de Clientes ── */}
        <div className="adm-table-container">
          <div className="adm-table-header">
            <div>
              <div className="adm-table-title">
                Gestión de Puntos de Usuarios
              </div>
              <div className="adm-table-sub" id="adm-showing-count">
                Mostrando {totalUsuarios} cliente
                {totalUsuarios !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="adm-table-actions">
              {/* Filter dropdown trigger */}
              <div className="adm-filter-wrapper">
                <button className="adm-filter-btn" id="adm-filter-trigger">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="14"
                    height="14"
                  >
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  Filtrar
                </button>
                <div className="adm-filter-dropdown" id="adm-filter-dropdown">
                  <div className="adm-filter-option" data-filter="todos">
                    Todos los clientes
                  </div>
                  <div className="adm-filter-option" data-filter="listos">
                    ✅ Listos para canjear
                  </div>
                  <div className="adm-filter-option" data-filter="activos">
                    📅 Con período activo
                  </div>
                  <div className="adm-filter-option" data-filter="sinpuntos">
                    🔘 Sin puntos
                  </div>
                </div>
              </div>

              {/* Modal trigger - dispara evento que PuntosActions escucha */}
              <button className="adm-new-btn" id="adm-open-modal">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  width="14"
                  height="14"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Nuevo Usuario
              </button>
            </div>
          </div>

          {/* Table head */}
          <div className="adm-table-head">
            <span>NOMBRE</span>
            <span>EMAIL</span>
            <span>PUNTOS</span>
            <span>PERÍODO ACTIVO</span>
            <span>ACCIONES</span>
          </div>

          {/* Client Component con búsqueda + filtrado */}
          <PuntosActions usuarios={clientesConPeriodo} />
        </div>

        {/* Footer */}
        <div className="adm-footer">
          <span>© 2024 Nono Diego Pizzería. Panel de Control v2.5.0</span>
          <div className="adm-footer-links">
            <span>Soporte</span>
            <span>Privacidad</span>
            <span>Términos</span>
          </div>
        </div>
      </main>

      <script
        dangerouslySetInnerHTML={{
          __html: `
        (function(){
          // Boton Nuevo Usuario -> dispara evento para PuntosActions
          var openBtn = document.getElementById('adm-open-modal');
          if(openBtn) openBtn.addEventListener('click', function(){
            document.dispatchEvent(new CustomEvent('adm-open-crear'));
          });

          // Filtro dropdown
          var filterTrigger = document.getElementById('adm-filter-trigger');
          var filterDropdown = document.getElementById('adm-filter-dropdown');
          if(filterTrigger && filterDropdown){
            filterTrigger.addEventListener('click', function(e){
              e.stopPropagation();
              filterDropdown.classList.toggle('adm-filter-dropdown--open');
            });
            document.addEventListener('click', function(){
              filterDropdown.classList.remove('adm-filter-dropdown--open');
            });
            filterDropdown.addEventListener('click', function(e){
              var opt = e.target.closest('[data-filter]');
              if(!opt) return;
              var val = opt.getAttribute('data-filter');
              document.querySelectorAll('.adm-filter-option').forEach(function(el){ el.classList.remove('adm-filter-option--active'); });
              opt.classList.add('adm-filter-option--active');
              filterDropdown.classList.remove('adm-filter-dropdown--open');
              document.dispatchEvent(new CustomEvent('adm-filter', { detail: { filter: val } }));
            });
          }

          // Search relay
          var searchInput = document.getElementById('adm-search-input');
          if(searchInput){
            searchInput.addEventListener('input', function(){
              document.dispatchEvent(new CustomEvent('adm-search', { detail: { q: searchInput.value } }));
            });
          }
        })();
      `,
        }}
      />

      <style>{`
        /* ── Admin Navbar ── */
        .adm-navbar {
          background: #1e1209;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          height: 68px;
          padding: 0 28px;
          display: flex;
          align-items: center;
          gap: 20px;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(12px);
        }
        .adm-navbar-left {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
        }
        .adm-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .adm-logo {
          font-size: 26px;
          filter: drop-shadow(0 2px 8px rgba(238,91,43,0.5));
        }
        .adm-brand-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
        }
        .adm-brand-sub {
          font-size: 11px;
          color: var(--text-muted);
        }
        .adm-solo-badge {
          background: rgba(240,165,0,0.18);
          color: var(--warning);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
          padding: 4px 10px;
          border-radius: 50px;
          border: 1px solid rgba(240,165,0,0.3);
          white-space: nowrap;
        }

        /* Search */
        .adm-search-wrapper {
          flex: 1;
          max-width: 460px;
          position: relative;
          margin: 0 auto;
        }
        .adm-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: var(--text-muted);
          pointer-events: none;
        }
        .adm-search-input {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 50px;
          padding: 10px 18px 10px 40px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .adm-search-input::placeholder { color: var(--text-muted); }
        .adm-search-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-light);
        }

        /* Right */
        .adm-navbar-right {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
          margin-left: auto;
        }
        .adm-user-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .adm-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--accent);
          color: white;
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .adm-user-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
        }
        .adm-user-role {
          font-size: 11px;
          color: var(--text-muted);
        }

        /* ── Content ── */
        .adm-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 36px 28px;
        }

        /* ── Stats ── */
        .adm-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        .adm-stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 22px 20px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .adm-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .adm-stat-icon {
          font-size: 22px;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .adm-stat-icon--blue   { background: rgba(59,130,246,0.15); }
        .adm-stat-icon--green  { background: var(--success-bg); }
        .adm-stat-icon--orange { background: var(--accent-light); }
        .adm-stat-body { flex: 1; min-width: 0; }
        .adm-stat-number {
          font-size: 32px;
          font-weight: 800;
          color: var(--accent);
          line-height: 1.1;
        }
        .adm-stat-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin-top: 2px;
        }
        .adm-stat-sub {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .adm-stat-trend {
          position: absolute;
          top: 16px;
          right: 16px;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 3px 8px;
          border-radius: 50px;
        }
        .adm-stat-trend--up { background: var(--success-bg); color: var(--success); }

        /* ── Table Container ── */
        .adm-table-container {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .adm-table-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .adm-table-title {
          font-size: 17px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .adm-table-sub {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .adm-table-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        /* Filter */
        .adm-filter-wrapper { position: relative; }
        .adm-filter-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: var(--radius);
          padding: 9px 16px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
        }
        .adm-filter-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
        .adm-filter-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #1e1e1e;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: var(--radius);
          min-width: 200px;
          z-index: 50;
          display: none;
          overflow: hidden;
          box-shadow: 0 12px 32px rgba(0,0,0,0.5);
        }
        .adm-filter-dropdown--open { display: block; }
        .adm-filter-option {
          padding: 11px 16px;
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background 0.15s;
        }
        .adm-filter-option:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
        .adm-filter-option--active { color: var(--accent); background: var(--accent-light); }

        /* New btn */
        .adm-new-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: var(--radius);
          padding: 9px 18px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .adm-new-btn:hover { background: var(--accent-hover); transform: translateY(-1px); box-shadow: var(--shadow-accent); }

        /* Table head row */
        .adm-table-head {
          display: grid;
          grid-template-columns: 2fr 2fr 1fr 1.5fr 1.5fr;
          padding: 12px 24px;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid var(--border);
          gap: 16px;
        }
        .adm-table-head span {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        /* ── Modal ── */
        .adm-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(6px);
          z-index: 300;
          display: none;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .adm-modal-overlay--visible { display: flex; animation: adm-fade 0.2s ease; }
        @keyframes adm-fade { from{opacity:0} to{opacity:1} }
        .adm-modal-box {
          background: var(--bg-card);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-lg);
          padding: 36px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.6);
          animation: adm-slide 0.25s ease;
        }
        @keyframes adm-slide { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .adm-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .adm-modal-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .adm-modal-sub {
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .adm-modal-close {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 28px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
          border-radius: 6px;
          transition: color 0.15s;
        }
        .adm-modal-close:hover { color: var(--text-primary); }
        .adm-form {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        /* ── Footer ── */
        .adm-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 0 8px;
          font-size: 12px;
          color: var(--text-muted);
          border-top: 1px solid var(--border);
          margin-top: 28px;
        }
        .adm-footer-links {
          display: flex;
          gap: 20px;
        }
        .adm-footer-links span {
          cursor: pointer;
          transition: color 0.15s;
        }
        .adm-footer-links span:hover { color: var(--accent); }

        /* Responsive */
        @media(max-width: 1024px) {
          .adm-stats { grid-template-columns: repeat(2, 1fr); }
          .adm-table-head { grid-template-columns: 2fr 2fr 1fr auto; }
          .adm-table-head span:nth-child(4) { display: none; }
        }
        @media(max-width: 768px) {
          .adm-navbar { padding: 0 16px; flex-wrap: wrap; height: auto; padding-top: 12px; padding-bottom: 12px; gap: 10px; }
          .adm-search-wrapper { order: 3; flex: unset; width: 100%; max-width: 100%; }
          .adm-stats { grid-template-columns: 1fr 1fr; }
          .adm-content { padding: 20px 12px; }
          .adm-table-head { display: none; }
          .adm-form { grid-template-columns: 1fr; }
          .adm-modal-box { padding: 24px 18px; }
          .adm-table-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
          }
          .adm-table-actions { width: 100%; }
          .adm-filter-btn, .adm-new-btn { flex: 1; justify-content: center; }
        }
        @media(max-width: 480px) {
          .adm-stats { grid-template-columns: 1fr; }
          .adm-navbar-right .adm-user-text { display: none; }
        }
      `}</style>
    </div>
  );
}
