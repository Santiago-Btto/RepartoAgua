<script>
    import { doc, getDoc } from 'firebase/firestore';
    import { auth, db } from '../firebase';
    import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

    let email = '';
    let password = '';
    let error = '';

    async function handleLogin() {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const docRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();

                if (userData.active === false) {
                    await signOut(auth);
                    error = 'Tu cuenta ha sido desactivada. No puedes ingresar.';
                    return;
                }
            }
        } catch (e) {
            console.error(e);
            if (e.code === 'auth/invalid-credential') {
                error = 'Email o contraseña incorrectos.';
            } else if (e.code === 'auth/user-not-found') {
                error = 'Usuario no encontrado.';
            } else {
                error = 'Error al iniciar sesión: ' + e.message;
            }
        }
    }

    const inputClass = "w-full bg-white shadow-sm border border-gray-600 rounded-md p-3 text-gray-900 focus:ring-blue-500 focus:border-blue-500";
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div class="w-full max-w-md bg-white shadow-sm border border-gray-300 rounded-xl p-8 shadow-2xl">
        <h1 class="text-2xl font-bold text-center text-blue-600 mb-6">Reparto de Agua</h1>
        
        <form on:submit|preventDefault={handleLogin} class="space-y-4">
        <div>
            <p class="text-sm text-gray-500">Email</p>
            <input type="email" class={inputClass} bind:value={email} required placeholder="admin@ejemplo.com">
        </div>
        
        <div>
            <p class="text-sm text-gray-500">Contraseña</p>
            <input type="password" class={inputClass} bind:value={password} required placeholder="••••••">
        </div>

        {#if error}
            <div class="p-3 bg-red-800/50 border border-red-700 text-gray-800 text-sm rounded">
            {error}
            </div>
        {/if}

        <button type="submit" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-gray-900 font-bold rounded-lg transition">
            Entrar
        </button>
        </form>
    </div>
</div>