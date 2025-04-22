<script lang="ts">
	import { AppBar } from '@skeletonlabs/skeleton-svelte';
	import Menu from '@lucide/svelte/icons/menu';
	import Wallet from '@lucide/svelte/icons/wallet';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Eye from '@lucide/svelte/icons/eye';
	import Copy from '@lucide/svelte/icons/copy';
	import LogOut from '@lucide/svelte/icons/log-out';
	import CircleUser from '@lucide/svelte/icons/circle-user';
	import { blockchainStore } from '$lib/stores/blockchainStore';
	import type { NetworkInfo } from '$lib/types';
  
	let isMenuOpen = $state(false);
	let networkInfo: NetworkInfo | null = $state(null);
  
	function toggleMenu() {
	  isMenuOpen = !isMenuOpen;
	}
  
	function formatAddress(addr: string) {
	  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';
	}
  
	$effect(() => {
	  const chainId = $blockchainStore.chainId;
	  networkInfo = chainId
		? {
			name:
			  chainId === 1287
				? 'Moonbase Alpha'
				: chainId === 1284
				? 'Moonbeam'
				: chainId === 1337
				? 'Local Hardhat'
				: 'Unknown',
			chainId,
			isTestnet: chainId !== 1284,
			blockExplorerUrl:
			  chainId === 1287
				? 'https://moonbase.moonscan.io'
				: chainId === 1284
				? 'https://moonscan.io'
				: ''
		  }
		: null;
	});
  </script>
  
  <svelte:window
	onclick={(e) => {
	  if (
		isMenuOpen &&
		!(e.target as HTMLElement).closest('.dropdown-content, .dropdown-trigger')
	  ) {
		isMenuOpen = false;
	  }
	}}
  />
  
  <AppBar
	background="bg-surface-900 dark:bg-surface-900/90 backdrop-blur-sm"
	padding="p-4"
	shadow="shadow-xl border-b border-surface-500/10"
	headlineClasses="sm:hidden"
	base="place-content-start gap-4"
	trailBase="justify-end gap-4"
	centerClasses="hidden sm:flex items-center"
  >
	{#snippet lead()}
	  <!-- left icon on small screens -->
	  <div class="flex items-center gap-3">
		<!-- App logo/icon with gradient effect -->
		<div class="bg-gradient-to-br from-primary-500 to-tertiary-500 p-2 rounded-lg shadow-lg">
		  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-white"><path d="M2 12a10 10 0 1 1 20 0Z"></path></svg>
		</div>
		
		<div class="hidden md:block">
		  <h3 class="font-bold text-xl bg-gradient-to-r from-primary-300 to-tertiary-300 bg-clip-text text-transparent">YieldSyncx</h3>
		  <p class="text-xs text-surface-300">Agricultural IoT Platform</p>
		</div>
	  </div>
	{/snippet}
  
	{#snippet trail()}
    <!-- Network info badge with animation -->
    {#if networkInfo}
      <div class="hidden lg:flex badge preset-filled-{networkInfo.isTestnet ? 'warning' : 'primary'} items-center gap-2 py-1.5 px-3">
        <span class="size-2 rounded-full animate-pulse bg-{networkInfo.isTestnet ? 'warning-400' : 'primary-400'}"></span>
        <span>{networkInfo.name}</span>
      </div>
    {/if}
    
    <!-- Wallet section with improved styling -->
    {#if $blockchainStore.account}
      <div class="relative">
        <button
          class="btn preset-filled-tertiary flex items-center gap-2 shadow-lg"
          onclick={toggleMenu}
        >
          <div class="bg-gradient-to-br from-primary-600 to-tertiary-600 flex h-8 w-8 items-center justify-center rounded-full shadow-inner">
            {$blockchainStore.account.slice(2, 4)}
          </div>
          <span class="hidden md:inline">{formatAddress($blockchainStore.account)}</span>
          <ChevronDown size={16} class="opacity-70" />
        </button>
        
        {#if isMenuOpen}
          <div class="card absolute right-0 mt-2 w-56 p-2 shadow-2xl backdrop-blur-lg bg-surface-800/95 border border-surface-500/20 rounded-lg z-50">
            <button class="w-full p-2.5 flex items-center gap-3 hover:preset-soft-primary rounded-md transition-all">
              <Eye size={18} /> 
              <span>View on Explorer</span>
            </button>
            <button class="w-full p-2.5 flex items-center gap-3 hover:preset-soft-primary rounded-md transition-all">
              <Copy size={18} /> 
              <span>Copy Address</span>
            </button>
            <div class="my-1.5 h-px bg-surface-600/20"></div>
            <button class="w-full p-2.5 flex items-center gap-3 hover:preset-soft-error rounded-md transition-all">
              <LogOut size={18} /> 
              <span>Disconnect</span>
            </button>
          </div>
        {/if}
      </div>
    {:else}
      <button
        class="btn preset-filled-tertiary shadow-lg hover:shadow-tertiary-500/20 transition-all"
        onclick={() => blockchainStore.connectWallet()}
        disabled={$blockchainStore.loading}
      >
        <div class="relative">
          <Wallet size={18} class="mr-2" />
          {#if $blockchainStore.loading}
            <span class="absolute -top-1 -right-1 size-2.5 bg-primary-400 rounded-full animate-ping"></span>
          {/if}
        </div>
        <span>{$blockchainStore.loading ? 'Connecting…' : 'Connect Wallet'}</span>
      </button>
    {/if}
  {/snippet}
  
	{#snippet headline()}
	  <h2 class="h2 text-surface-900 dark:text-surface-100">YieldSyncx Dashboard</h2>
	{/snippet}
  
	<!-- fallback center content -->
  </AppBar>
  