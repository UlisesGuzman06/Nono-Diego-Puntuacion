# Nono Diego — Rediseño Visual

El nuevo enfoque visual de **Nono Diego** busca una estética más moderna, minimalista y atemporal.  
Se abandona la paleta oscura con acentos cálidos para adoptar una identidad en **blanco y negro**, con una presencia más sobria, limpia y profesional.

La idea es que el sistema se sienta como un producto real, simple y bien diseñado.  
Menos decoración, más claridad.

---

# Lineamientos Generales de Diseño

- Paleta monocromática: blanco, negro y escalas de gris.
- Un único color de acento muy sutil (gris oscuro o negro profundo).
- Mucho espacio en blanco.
- Sin degradados.
- Sin sombras pesadas.
- Bordes suaves (border-radius discreto).
- Íconos simples y lineales.
- Tipografía moderna, liviana y elegante.
- Jerarquía visual clara.
- Animaciones mínimas y suaves.

El objetivo es transmitir orden, claridad y calma.

---

# 1. Panel de Usuario (`/usuario`)

## Navegación Superior

- Barra superior completamente blanca.
- Logo textual simple: **Nono Diego** (sin emoji).
- Nombre del cliente alineado a la derecha.
- Botón de cerrar sesión discreto, estilo outline.

Sin elementos innecesarios. Sin íconos decorativos.

---

## Bienvenida

- Mensaje corto y simple.
- Tipografía ligera.
- Espaciado generoso arriba y abajo.

Ejemplo:
> Bienvenido, Juan.

Nada recargado. Nada infantil.

---

## Tarjeta de Puntos

Se presenta en una única card central, limpia y con buena jerarquía.

Contenido:

- Puntos actuales sobre el total (Ej: `3 / 10`)
- Indicador visual minimalista (círculos o líneas simples en lugar de emojis).
- Barra de progreso fina, negra sobre fondo gris claro.
- Espacios amplios entre elementos.

El progreso se entiende rápido, sin decoración innecesaria.

---

## Información del Período

Se muestra debajo de la tarjeta principal en texto simple:

- Fecha de inicio del período.
- Fecha de vencimiento.
- Días restantes.

Los avisos de estado cambian de forma sutil:

- Texto en gris oscuro cuando todo está normal.
- Fondo gris muy claro cuando está próximo a vencer.
- Borde negro fino cuando el período venció.

Sin banners llamativos.
Sin colores fuertes.

---

## Sección de Canje

- Botón centrado.
- Estilo sólido negro cuando está habilitado.
- Estilo outline gris cuando está deshabilitado.
- Transición suave al hover.

El estado se comunica por contraste, no por efectos.

---

# 2. Panel de Administrador (`/admin`)

## Estructura

- Layout limpio.
- Grid de tarjetas con mucho espacio entre ellas.
- Fondo blanco.
- Sin sombras marcadas.

Cada tarjeta de usuario incluye:

- Nombre del cliente.
- Estado de puntos.
- Estado del período.
- Acciones rápidas (Agregar punto / Quitar punto / Renovar período).

Los botones son pequeños, discretos y alineados horizontalmente.

Nada sobrecargado.

---

## Crear Usuario

- Modal centrado.
- Fondo blanco.
- Bordes suaves.
- Inputs amplios y simples.
- Botón principal negro sólido.
- Botón secundario outline.

La experiencia debe sentirse fluida y directa.

---

# 3. Vista de Usuario para Administradores (`/admin/vista-usuario/[userId]`)

El administrador puede ver el panel exactamente como lo ve el cliente, pero con un indicador claro de contexto.

## Indicador de Modo Administrador

- Franja superior fina.
- Fondo gris muy claro.
- Texto simple:
  > Vista Administrador

Sin colores llamativos.

---

## Información del Cliente

Mostrada en tarjetas limpias:

- Email
- Teléfono
- Dirección

Diseño en formato columna.
Espaciado amplio.
Tipografía clara.

---

## Botón de Canje (Bloqueado)

- Se mantiene visible.
- Overlay muy sutil en gris claro.
- Ícono de candado minimalista.
- Sin efectos exagerados.

El bloqueo se entiende sin romper la estética general.

---

# Sensación Final del Producto

El sistema debe sentirse:

- Profesional.
- Moderno.
- Atemporal.
- Claro.
- Ordenado.

Menos “app promocional”.
Más “producto bien construido”.

La prioridad es la claridad visual y la experiencia fluida.
Nada decorativo que no aporte funcionalidad.