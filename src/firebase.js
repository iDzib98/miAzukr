import { initializeApp } from 'firebase/app'

// Este archivo intenta importar dinámicamente `src/firebaseConfig.js`.
// El repositorio debe contener `src/firebaseConfig.example.js` con valores de ejemplo.
// El archivo real `src/firebaseConfig.js` se debe crear localmente y estará en `.gitignore`.

export async function initializeFirebase() {
  let firebaseConfig
  try {
    const mod = await import('./firebaseConfig.js')
    // Soportar export default o named export
    firebaseConfig = mod.default || mod.firebaseConfig || mod
  } catch (err) {
    console.warn('Firebase: no se encontró `src/firebaseConfig.js`. Crea el archivo basado en `src/firebaseConfig.example.js`.')
    return null
  }

  if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('<')) {
    console.warn('Firebase: `src/firebaseConfig.js` contiene valores de ejemplo o está incompleto. Actualiza con tus credenciales reales.')
    return null
  }

  try {
    const app = initializeApp(firebaseConfig)
    return app
  } catch (e) {
    console.error('Error inicializando Firebase', e)
    return null
  }
}
