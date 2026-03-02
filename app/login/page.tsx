"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
      return;
    }

    // Obtener el perfil para saber el rol
    const { data: profile } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", authData.user.id)
      .single();

    // Hard navigation para evitar bucles en el redirect-boundary de Next.js
    if (profile?.rol === "admin") {
      window.location.href = "/admin";
    } else {
      window.location.href = "/usuario";
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="pizza-icon">🍕</span>
          <h1>Nono Diego</h1>
          <p>Sistema de Puntos</p>
        </div>

        <form onSubmit={handleLogin}>
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
