import { writable } from 'svelte/store';
import { auth, db } from '../firebase'; // Tu archivo firebase.js
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Store escribible que usaremos en toda la app
// Comienza como 'undefined' (cargando), luego será null (no logueado) o el objeto usuario
export const user = writable(undefined);

// Escuchar cambios de sesión (LOGIN / LOGOUT / REFRESH)
onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
        try {
            // Buscamos su rol en Firestore
            const docRef = doc(db, 'usuarios', firebaseUser.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // Combinamos datos de Auth + Datos de Firestore
                const userData = docSnap.data();
                user.set({ 
                uid: firebaseUser.uid, 
                email: firebaseUser.email, 
                role: userData.role
                });
            } else {
                // Si no tiene rol asignado, es un usuario normal
                user.set({ uid: firebaseUser.uid, email: firebaseUser.email, role: 'user' });
            }
        } catch (error) {
            console.error("Error buscando rol:", error);
            user.set(null);
        }
    } else {
        // Usuario deslogueado
        user.set(null);
    }
});

// Función helper para salir
export const logOut = () => signOut(auth);