# Reparto de Agua — SIN login (PWA + Firestore) — v2

Mejoras:
- Suscripción **realtime** (onSnapshot): ves cambios al instante sin refrescar.
- **Buscador** por nombre/dirección/teléfono/notas.
- Filtros por **día** y **estado**.
- Render robusto con estado "vacío".

> Reglas para pruebas (abiertas, inseguras):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // INSEGURO
    }
  }
}
```
Luego cambiá a reglas seguras.
