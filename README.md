# 🍕 Nono Diego — Sistema de Puntos

Sistema de fidelización de clientes para  **Nono Diego**. Los clientes acumulan puntos con cada pizza comprada y, al llegar a 10, canjean una pizza gratis.

---

## Stack tecnológico

- **Next.js 14** (App Router, Server Components, Server Actions)
- **TypeScript**
- **Supabase** — autenticación y base de datos PostgreSQL
- **CSS vanilla** — sin frameworks de estilos externos

---

## Funcionalidades

### Clientes

- Ver sus puntos actuales sobre la meta de 10
- Visualización con íconos de pizza y barra de progreso
- Canjear pizza gratis cuando alcanzan los 10 puntos (resetea a 0)

### Administradores

- Crear nuevos clientes (nombre, email, contraseña, teléfono, dirección)
- Ver listado completo de clientes con sus puntos
- Sumar o restar puntos individualmente
- Resetear puntos de un cliente
- Editar datos de un cliente (nombre, teléfono, dirección)

---

## Estructura de rutas

```
/login       → Inicio de sesión
/usuario     → Panel del cliente
/admin       → Panel de administración
```

La ruta raíz `/` redirige automáticamente según el rol del usuario autenticado.

---

## Base de datos

### Tabla `profiles`

| Columna     | Tipo    | Descripción                   |
| ----------- | ------- | ----------------------------- |
| `id`        | uuid    | Referencia al usuario de auth |
| `nombre`    | text    | Nombre del cliente            |
| `email`     | text    | Email del cliente             |
| `telefono`  | text    | Teléfono de contacto          |
| `direccion` | text    | Dirección                     |
| `puntos`    | integer | Puntos acumulados (0–10)      |
| `rol`       | text    | `"admin"` o `"usuario"`       |

### Funciones RPC

- `modificar_puntos(target_id, delta)` — suma o resta puntos
- `resetear_puntos_usuario(target_id)` — lleva los puntos a 0

### Edge Function

- `crear-usuario` — crea un nuevo usuario en Supabase Auth y su perfil en `profiles`

---

## Variables de entorno

Crear un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

