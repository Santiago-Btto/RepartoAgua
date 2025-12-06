<script>
    import { onMount } from 'svelte';
    import { db, auth } from '../firebase'; // Ajusta tu ruta
    import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
    import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
  import { deleteApp, initializeApp } from 'firebase/app';

    let usuarios = [];
    let loading = true;
    let error = '';
    let success = '';

    // Formulario
    let nuevoEmail = '';
    let nuevoPassword = '';

    // Clases reutilizables (basadas en tu Login)
    const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";
    const btnPrimary = "w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-md";

    // 1. CARGAR USUARIOS
    async function cargarUsuarios() {
        loading = true;
        try {
            const querySnapshot = await getDocs(collection(db, "usuarios"));
            
        usuarios = querySnapshot.docs
        .map(d => {
            const data = d.data();
            return { 
                id: d.id,
                active: data.active,
                rol: data.role,
                email: data.email
            };
        })
        .filter(usuario => usuario.rol !== 'admin');

        } catch (e) {
            console.error(e);
            error = "Error al cargar la lista de usuarios.";
        } finally {
            loading = false;
        }
    }

    // 2. CREAR USUARIO (Active: TRUE)
    async function crearUsuario() {
        error = ''; success = '';
        
        if (!nuevoEmail || !nuevoPassword) return;

        const secondaryApp = initializeApp(auth.app.options, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);

        try {
            // Creamos el usuario en la instancia SECUNDARIA
            // Esto loguea al usuario nuevo en 'secondaryAuth', pero TU 'auth' (Admin) sigue intacto
            const credencial = await createUserWithEmailAndPassword(secondaryAuth, nuevoEmail, nuevoPassword);
            const user = credencial.user;

            // 2. Guardamos en Firestore (Usamos tu 'db' normal, eso no cambia)
            await setDoc(doc(db, "usuarios", user.uid), {
                email: user.email,
                active: true,
                role: 'user',
                createdAt: new Date().toISOString()
            });

            // 3. Limpieza: Deslogueamos de la app secundaria y la borramos
            await signOut(secondaryAuth);
            await deleteApp(secondaryApp);

            success = 'Usuario creado correctamente sin cerrar tu sesión.';
            nuevoEmail = '';
            nuevoPassword = '';
            
            await cargarUsuarios();

        } catch (e) {
            console.error(e);
            if (e.code === 'auth/email-already-in-use') {
                error = 'El email ya está registrado.';
            } else {
                error = 'Error al crear usuario: ' + e.message;
            }
            try { await deleteApp(secondaryApp); } catch(err) {} 
        }
    }

    // 3. TOGGLE ESTADO (Soft Delete)
    async function toggleEstado(usuario) {
        try {
            const userRef = doc(db, "usuarios", usuario.id);
            const nuevoEstado = !usuario.active;

            // Actualizamos Firestore
            await updateDoc(userRef, { active: nuevoEstado });

            // Actualizamos UI localmente (reactividad)
            usuarios = usuarios.map(u => 
                u.id === usuario.id ? { ...u, active: nuevoEstado } : u
            );

        } catch (e) {
            console.error(e);
            alert("No se pudo cambiar el estado del usuario.");
        }
    }

    onMount(() => {
        cargarUsuarios();
    });
</script>

<div class="min-h-screen bg-gray-50 p-6 md:p-10">
    <div class="max-w-5xl mx-auto space-y-8">
        
        <div class="flex flex-col md:flex-row justify-between items-center">
            <h1 class="text-3xl font-bold text-blue-600">Gestión de Repartidores</h1>
            <p class="text-sm text-gray-500 mt-2 md:mt-0">Panel de Administración</p>
        </div>

        <div class="bg-white shadow-sm border border-gray-300 rounded-xl p-6 md:p-8">
            <h2 class="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Registrar Nuevo Usuario</h2>
            
            <form on:submit|preventDefault={crearUsuario} class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label class="text-sm text-gray-500 mb-1 block">Email</label>
                    <input type="email" class={inputClass} bind:value={nuevoEmail} placeholder="usuario@reparto.com" required>
                </div>
                <div>
                    <label class="text-sm text-gray-500 mb-1 block">Contraseña</label>
                    <input type="password" class={inputClass} bind:value={nuevoPassword} placeholder="••••••" required>
                </div>
                <div>
                    <button type="submit" class={btnPrimary}>
                        + Agregar Usuario
                    </button>
                </div>
            </form>

            {#if error}
                <div class="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    {error}
                </div>
            {/if}
            {#if success}
                <div class="mt-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    {success}
                </div>
            {/if}
        </div>

        <div class="bg-white shadow-sm border border-gray-300 rounded-xl overflow-hidden">
            <div class="p-6 border-b border-gray-200">
                <h2 class="text-xl font-semibold text-gray-800">Directorio de Usuarios</h2>
            </div>

            {#if loading}
                <div class="p-8 text-center text-gray-500">Cargando datos...</div>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                <th class="p-4 font-medium border-b">Email</th>
                                <th class="p-4 font-medium border-b text-center">Estado</th>
                                <th class="p-4 font-medium border-b text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="text-gray-700 text-sm">
                            {#each usuarios as usuario}
                                <tr class="border-b last:border-0 hover:bg-gray-50 transition-colors duration-150 {usuario?.active ? '' : 'bg-gray-100 opacity-60'}">
                                    
                                    <td class="p-4">
                                        <div class="font-medium text-gray-900">{usuario?.email}</div>
                                    </td>

                                    <td class="p-4 text-center">
                                        {#if usuario?.active}
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <span class="w-2 h-2 mr-1 bg-green-500 rounded-full"></span> Activo
                                            </span>
                                        {:else}
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                <span class="w-2 h-2 mr-1 bg-red-500 rounded-full"></span> Bloqueado
                                            </span>
                                        {/if}
                                    </td>

                                    <td class="p-4 text-right">
                                        <button 
                                            on:click={() => toggleEstado(usuario)}
                                            class="text-sm font-medium underline focus:outline-none transition-colors 
                                            {usuario?.active 
                                                ? 'text-red-600 hover:text-red-800' 
                                                : 'text-green-600 hover:text-green-800'}"
                                        >
                                            {usuario?.active ? 'Desactivar acceso' : 'Habilitar acceso'}
                                        </button>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    </div>
</div>