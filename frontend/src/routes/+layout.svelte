<script lang="ts">
	import "../app.css";
	import { page } from '$app/state';
	import { blockchainStore } from '$lib/stores/blockchainStore';
	import Header from '../components/Header.svelte';
	import Sidebar from '../components/Sidebar.svelte';
	import Toast from '../components/Toast.svelte';
  
	let { children } = $props();
	
	// Track sidebar expansion state to adjust layout
	let sidebarExpanded = $state(true);
	
	// Handle wallet persistence with modern effect pattern
	$effect(() => {
	  const wasConnected = localStorage.getItem('yieldsyncx-connected') === 'true';
	  if (wasConnected) {
		blockchainStore.connectWallet().then(ok => {
		  if (!ok) localStorage.removeItem('yieldsyncx-connected');
		});
	  }
  
	  return blockchainStore.subscribe(state => {
		if (state.connected) {
		  localStorage.setItem('yieldsyncx-connected', 'true');
		} else {
		  localStorage.removeItem('yieldsyncx-connected');
		}
	  });
	});
  
	// Handle sidebar state changes
	function handleSidebarToggle(expanded) {
	  sidebarExpanded = expanded;
	}
  </script>
  
  <!-- Main layout container with proper spacing and flex structure -->
  <div class="flex h-screen w-full bg-surface-900 text-surface-200 overflow-hidden">
	<!-- Sidebar with toggle event handler -->
	<Sidebar 
	  currentPath={page.url.pathname} 
	  onToggle={handleSidebarToggle}
	/>
	
	<!-- Main content container that adjusts to sidebar state -->
	<div class="flex-1 flex flex-col overflow-hidden transition-all duration-300"
		 class:ml-16={!sidebarExpanded}
		 class:ml-72={sidebarExpanded}>
	  <!-- Fixed header at the top -->
	  <Header />
	  
	  <!-- Scrollable main content -->
	  <main class="flex-1 overflow-auto">
		<div class="min-h-full bg-gradient-to-b from-surface-900 to-surface-800/90">
		  <!-- Content wrapper with responsive padding -->
		  <div class="max-w-screen-2xl mx-auto p-4 md:p-6 lg:p-8">
			<!-- Toast notifications -->
			<Toast />
			
			<!-- Page content -->
			{@render children?.()}
		  </div>
		</div>
	  </main>
	</div>
  </div>