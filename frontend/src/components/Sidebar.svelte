<script lang="ts">
	import { Navigation } from '@skeletonlabs/skeleton-svelte';
	import { UserRole } from '$lib/constants';
	import IconMenu from '@lucide/svelte/icons/menu';
	import IconHome from '@lucide/svelte/icons/home';
	import IconServer from '@lucide/svelte/icons/server';
	import IconImage from '@lucide/svelte/icons/image';
	import IconAlertCircle from '@lucide/svelte/icons/alert-circle';
	import IconAward from '@lucide/svelte/icons/award';
	import IconCheckCircle from '@lucide/svelte/icons/check-circle';
	import IconKeyRound from '@lucide/svelte/icons/key-round';
	import IconBox from '@lucide/svelte/icons/box';
	import FileBadge from '@lucide/svelte/icons/file-badge';
	import IconSettings from '@lucide/svelte/icons/settings';
	import IconActivity from '@lucide/svelte/icons/activity';
	import IconClipboardList from '@lucide/svelte/icons/clipboard-list';
	import IconShield from '@lucide/svelte/icons/shield';
  
	let { currentPath, onToggle } = $props();
	let isExpanded = $state(true);
	const userRole = $state(UserRole.ADMIN);
  
	const navLinks = [
	  { path: '/', label: 'Dashboard', icon: IconHome, roles: [] },
	  { path: '/devices', label: 'Devices', icon: IconServer, roles: [] },
	  { path: '/imagery', label: 'Imagery', icon: IconImage, roles: [] },
	  { path: '/analytics/anomalies', label: 'Anomaly', icon: IconAlertCircle, roles: [] },
	  { path: '/analytics/monitoring', label: 'Monitoring', icon: IconActivity, roles: [] },
	  { path: '/certificates', label: 'Certificates', icon: FileBadge, roles: [] },
	  { path: '/certifier/issue', label: 'Issue', icon: IconAward, roles: [UserRole.CERTIFIER, UserRole.ADMIN] },
	  { path: '/certifier/verify', label: 'Verify', icon: IconCheckCircle, roles: [UserRole.CERTIFIER, UserRole.ADMIN] },
	  { path: '/certifier/manage', label: 'Manage', icon: IconClipboardList, roles: [UserRole.CERTIFIER, UserRole.ADMIN] },
	  { path: '/admin', label: 'Admin', icon: IconShield, roles: [UserRole.ADMIN] },
	  { path: '/admin/roles', label: 'Roles', icon: IconKeyRound, roles: [UserRole.ADMIN] },
	  { path: '/admin/batches', label: 'Batches', icon: IconBox, roles: [UserRole.ADMIN] }
	];
  
	const visibleLinks = navLinks.filter(link => !link.roles.length || link.roles.includes(userRole));
  
	function toggleExpanded() {
	  isExpanded = !isExpanded;
	  onToggle?.(isExpanded);
	}
  
	// Initialize parent with current state
	$effect(() => {
	  onToggle?.(isExpanded);
	});
  </script>
  
  <!-- Fixed position sidebar that doesn't overlap content -->
  <div class="h-full z-20">
	<Navigation.Rail 
	  expanded={isExpanded}
	  base="fixed top-0 left-0 h-full"
	  background="bg-surface-900/95 backdrop-blur-md border-r border-surface-500/10"
	  padding="p-3"
	  width="w-16"
	  widthExpanded="w-72"
	  tilesGap="gap-2"
	  tilesClasses="flex-col"
	>
	  {#snippet header()}
		<Navigation.Tile title="Toggle" onclick={toggleExpanded}>
		  <IconMenu />
		</Navigation.Tile>
	  {/snippet}
  
	  {#snippet tiles()}
		{#each visibleLinks as {label, path, icon: Icon, roles}}
		  <Navigation.Tile
			labelExpanded={label}
			href={path}
			selected={currentPath === path || currentPath.startsWith(path + '/')}
			title={label}
			base="flex items-center justify-center relative transition-all duration-200"
		  >
			<Icon class="size-5 text-surface-100" />
			{#if path === '/analytics/anomalies' && currentPath !== path}
			  <span class="absolute -top-1 -right-1 size-2 bg-error-500 rounded-full animate-pulse"></span>
			{/if}
			{#if path === '/analytics/monitoring' && currentPath !== path}
			  <span class="absolute -top-1 -right-1 size-2 bg-warning-500 rounded-full animate-pulse"></span>
			{/if}
		  </Navigation.Tile>
		{/each}
	  {/snippet}
  
	  {#snippet footer()}
		<Navigation.Tile href="/settings" title="Settings">
		  <IconSettings class="size-5 text-surface-100" />
		</Navigation.Tile>
	  {/snippet}
	</Navigation.Rail>
  </div>