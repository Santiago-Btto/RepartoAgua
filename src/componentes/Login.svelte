<script>
    import { auth } from '../firebase';
    import { signInWithEmailAndPassword } from 'firebase/auth';

    let email = '';
    let password = '';
    let error = '';

    async function handleLogin() {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (e) {
            console.error(e);
            if (e.code === 'auth/invalid-credential') {
                error = 'Email o contraseña incorrectos.';
            } else {
                error = 'Error al iniciar sesión.';
            }
        }
    }

    const inputClass = "w-full bg-gray-800 border border-gray-600 rounded-md p-3 text-white focus:ring-blue-500 focus:border-blue-500";
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-900 p-4">
    <div class="w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-2xl">
        <h1 class="text-2xl font-bold text-center text-blue-400 mb-6">Reparto de Agua</h1>
        
        <form on:submit|preventDefault={handleLogin} class="space-y-4">
        <div>
            <p class="text-sm text-gray-400">Email</p>
            <input type="email" class={inputClass} bind:value={email} required placeholder="admin@ejemplo.com">
        </div>
        
        <div>
            <p class="text-sm text-gray-400">Contraseña</p>
            <input type="password" class={inputClass} bind:value={password} required placeholder="••••••">
        </div>

        {#if error}
            <div class="p-3 bg-red-900/50 border border-red-700 text-red-200 text-sm rounded">
            {error}
            </div>
        {/if}

        <button type="submit" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition">
            Entrar
        </button>
        </form>
    </div>
</div>