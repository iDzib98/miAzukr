# miAzukr — PWA (instrucciones)

Inicialización de una PWA usando React + Vite + Firebase.

Rápido resumen:
- Plantilla con Vite + React.
- Service Worker simple para cache offline.
- `manifest.json` y iconos SVG.
- Archivo `src/firebase.js` como plantilla para tu configuración.

Pasos rápidos (PowerShell):

```powershell
# Instala dependencias
npm install

# Ejecuta en modo desarrollo
npm run dev

# Construye para producción
npm run build

# Ver una vista previa del build
npm run preview
```

Notas importantes:
- Actualiza `src/firebase.js` con la configuración real de tu proyecto Firebase.
- El Service Worker se registra en `src/main.jsx`. En desarrollo Vite sirve desde memoria; el Service Worker se activa típicamente en el build servido por un servidor estático (p.ej. `npm run preview` o Firebase Hosting).
- Para hosting en Firebase: configura Firebase Hosting desde la CLI (`firebase init hosting`) y despliega con `firebase deploy --only hosting`.

Si quieres, puedo:
- Ejecutar `npm install` aquí (si quieres que lo haga ahora).
- Añadir una configuración de Workbox o usar `vite-plugin-pwa` para una estrategia más avanzada.
