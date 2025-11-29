<script>
  import Login from "./componentes/Login.svelte";
  import Principal from "./componentes/Principal.svelte";
  import { user } from './store/userStore';
</script>

<main id="app" class="app bg-gray-50 text-gray-900">
  {#if $user === undefined}
    <div class="min-h-screen flex items-center justify-center">
      <p>Cargando sesión...</p>
    </div>

  {:else if $user === null}
    <Login />

  {:else}
    <Principal />
  {/if}
</main>