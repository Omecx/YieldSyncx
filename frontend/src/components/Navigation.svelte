<script lang="ts">
    // --- Imports ---
    import { Modal } from '@skeletonlabs/skeleton-svelte';
    import { Navigation } from '@skeletonlabs/skeleton-svelte';
    import { beforeNavigate } from '$app/navigation';
    // Icons
    import { Home, Cpu, GanttChartSquare, BotMessageSquare, Image, AlertTriangle, CheckCheck, UserCog, Boxes, X } from '@lucide/svelte';
    
    // --- State Runes (Svelte 5) ---
    let drawerOpen = $state(false);
    let { id = 'main-nav' }: { id?: string } = $props();
    
    // --- Event Handlers ---
    function closeDrawer(): void {
      drawerOpen = false;
    }
    
    // --- Close drawer when navigation starts ---
    beforeNavigate(() => {
      closeDrawer();
    });
  </script>
  
  <!-- Mobile Navigation Drawer -->
  <Modal
    open={drawerOpen}
    onOpenChange={(e) => (drawerOpen = e.open)}
    contentBase="bg-surface-100-900 p-4 space-y-4 shadow-xl w-[280px] h-screen"
    positionerJustify="justify-start"
    positionerAlign=""
    positionerPadding=""
    transitionsPositionerIn={{ x: -280, duration: 200 }}
    transitionsPositionerOut={{ x: -280, duration: 200 }}
  >
    {#snippet trigger()}
      <button class="btn-icon preset-tonal-surface lg:hidden" aria-label="Open menu">
        <Boxes size={20} />
      </button>  
    {/snippet}
    
    {#snippet content()}
      <header class="flex items-center justify-between mb-6">
        <h2 class="h3 font-bold">YieldSyncx</h2>
        <button class="btn-icon preset-tonal hover:preset-filled-error-500" onclick={closeDrawer} aria-label="Close Navigation Drawer">
          <X size={18} />
        </button>
      </header>
      
      <Navigation.Rail expanded>
        {#snippet tiles()}
          <Navigation.Tile label="Dashboard" labelExpanded="Dashboard" href="/">
            <Home />
          </Navigation.Tile>
          <Navigation.Tile label="Devices" labelExpanded="Devices" href="/devices">
            <Cpu />
          </Navigation.Tile>
          <Navigation.Tile label="Imagery" labelExpanded="Imagery" href="/imagery">
            <Image />
          </Navigation.Tile>
          <Navigation.Tile label="Anomaly" labelExpanded="Anomaly" href="/anomaly">
            <AlertTriangle />
          </Navigation.Tile>
          <Navigation.Tile label="Certificates" labelExpanded="Certificates" href="/certificates">
            <GanttChartSquare />
          </Navigation.Tile>
          <Navigation.Tile label="Issue" labelExpanded="Issue" href="/issue">
            <BotMessageSquare />
          </Navigation.Tile>
          <Navigation.Tile label="Verify" labelExpanded="Verify" href="/verify">
            <CheckCheck />
          </Navigation.Tile>
          <Navigation.Tile label="Roles" labelExpanded="Roles" href="/roles">
            <UserCog />
          </Navigation.Tile>
          <Navigation.Tile label="Batches" labelExpanded="Batches" href="/batches">
            <Boxes />
          </Navigation.Tile>
        {/snippet}
      </Navigation.Rail>
      
      <footer class="mt-auto pt-4 text-center text-xs text-surface-400-600">
        Version 1.0.0
      </footer>
    {/snippet}
  </Modal>
  
  <!-- Desktop Sidebar -->
  <aside class="hidden lg:flex h-screen flex-col flex-shrink-0 bg-surface-50-950 border-r border-surface-200-800">
    <header class="p-4">
      <h2 class="h3 font-bold">YieldSyncx</h2>
    </header>
    
    <Navigation.Rail>
      {#snippet tiles()}
        <Navigation.Tile label="Dashboard" href="/">
          <Home />
        </Navigation.Tile>
        <Navigation.Tile label="Devices" href="/devices">
          <Cpu />
        </Navigation.Tile>
        <Navigation.Tile label="Imagery" href="/imagery">
          <Image />
        </Navigation.Tile>
        <Navigation.Tile label="Anomaly" href="/anomaly">
          <AlertTriangle />
        </Navigation.Tile>
        <Navigation.Tile label="Certificates" href="/certificates">
          <GanttChartSquare />
        </Navigation.Tile>
        <Navigation.Tile label="Issue" href="/issue">
          <BotMessageSquare />
        </Navigation.Tile>
        <Navigation.Tile label="Verify" href="/verify">
          <CheckCheck />
        </Navigation.Tile>
        <Navigation.Tile label="Roles" href="/roles">
          <UserCog />
        </Navigation.Tile>
        <Navigation.Tile label="Batches" href="/batches">
          <Boxes />
        </Navigation.Tile>
      {/snippet}
    </Navigation.Rail>
    
    <footer class="mt-auto p-4 text-center text-xs text-surface-400-600">
      Version 1.0.0
    </footer>
  </aside>