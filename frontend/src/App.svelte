<script>
  import Router from "svelte-spa-router";
  import routes from "./routes";
  import { Toaster } from "svelte-french-toast";
</script>

<div class="h-dvh w-dvw overflow-x-hidden">
  <Router {routes} useHash={true} />
  <Toaster />
</div>
