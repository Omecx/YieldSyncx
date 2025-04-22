<script lang="ts">
	import { ProgressRing, Tabs } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';
	import type { FormattedSensorData } from '$lib/types';
	import SensorChart from './SensorDataChart.svelte';
	import { useSensorFetcher } from '$lib/hooks/useSensorFetcher';
	
	// Use the hook without destructuring to maintain reactivity
	const sensorFetcher = useSensorFetcher();
	
	// Tabs state with Svelte 5 runes
	let activeTab = $state('temperature');
	
	// Load devices when component initializes
	$effect(() => {
	  sensorFetcher.loadDevices();
	});
  </script>
  
  <div class="card preset-filled-surface p-4 shadow-lg">
	<header class="mb-4 flex items-center justify-between">
	  <h2 class="text-2xl font-bold">Sensor Dashboard</h2>
	  <div class="flex items-center gap-2">
		<select class="select" bind:value={sensorFetcher.selectedDevice}>
		  <option value="">All Devices</option>
		  {#each sensorFetcher.devices as id}
			<option value={id}>{id}</option>
		  {/each}
		</select>
		<button
		  class="btn preset-filled-primary"
		  onclick={() => sensorFetcher.loadDeviceData(sensorFetcher.selectedDevice)}
		  disabled={!sensorFetcher.selectedDevice || sensorFetcher.isLoading}
		>
		  <Icon icon="mdi:refresh" class="size-5" />
		</button>
	  </div>
	</header>
  
	{#if sensorFetcher.isLoading}
	  <div class="flex justify-center p-8">
		<ProgressRing />
	  </div>
	{:else}
	  <Tabs value={activeTab} onValueChange={(e) => activeTab = e.value} listJustify="justify-start">
		{#snippet list()}
		  <Tabs.Control value="temperature">Temperature</Tabs.Control>
		  <Tabs.Control value="humidity">Humidity</Tabs.Control>
		  <Tabs.Control value="soil">Soil Moisture</Tabs.Control>
		{/snippet}
  
		{#snippet content()}
		  <Tabs.Panel value="temperature">
			<div class="p-4">
			  <h3 class="h3">Temperature Data</h3>
			  <div class="chart-container bg-surface-100 dark:bg-surface-800 my-4 h-64 rounded-lg">
				<SensorChart data={sensorFetcher.sensorData} dataType="temperature" />
			  </div>
			</div>
		  </Tabs.Panel>
		  
		  <Tabs.Panel value="humidity">
			<div class="p-4">
			  <h3 class="h3">Humidity Data</h3>
			  <div class="chart-container bg-surface-100 dark:bg-surface-800 my-4 h-64 rounded-lg">
				<SensorChart data={sensorFetcher.sensorData} dataType="humidity" />
			  </div>
			</div>
		  </Tabs.Panel>
		  
		  <Tabs.Panel value="soil">
			<div class="p-4">
			  <h3 class="h3">Soil Moisture Data</h3>
			  <div class="chart-container bg-surface-100 dark:bg-surface-800 my-4 h-64 rounded-lg">
				<SensorChart data={sensorFetcher.sensorData} dataType="soil" />
			  </div>
			</div>
		  </Tabs.Panel>
		{/snippet}
	  </Tabs>
	{/if}
  </div>