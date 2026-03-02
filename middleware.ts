import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Si no está logueado y trata de acceder a rutas protegidas
  if (
    !user &&
    (pathname.startsWith("/usuario") || pathname.startsWith("/admin"))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Si está logueado, verificar el rol
  if (user) {
    // Obtener el perfil para revisar el rol
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
          },
        },
      },
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    const rol = profile?.rol;

    // Bloquear acceso a /admin si no es admin
    if (pathname.startsWith("/admin") && rol !== "admin") {
      return NextResponse.redirect(new URL("/usuario", request.url));
    }

    // Si es admin y va a /usuario, redirigir a /admin
    if (pathname.startsWith("/usuario") && rol === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Si está logueado y va a /login, redirigir según rol
    if (pathname === "/login") {
      if (rol === "admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      } else {
        return NextResponse.redirect(new URL("/usuario", request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
