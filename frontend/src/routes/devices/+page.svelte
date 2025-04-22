<script lang="ts">
    import { blockchainStore } from '$lib/stores/blockchainStore';
    import { trigger } from '$lib/stores/toastStore.svelte';
    
    interface DeviceStats {
      deviceId: string;
      totalRecords: number;
      lastActive: string;
      status: 'active' | 'inactive';
    }
    
    let devices = $state<DeviceStats[]>([]);
    let loading = $state(false);
    let selectedDevice = $state<string | null>(null);
    let deviceData = $state<any[]>([]);
    
    $effect(() => {
      if ($blockchainStore.connected) {
        loadDevices();
      }
    });
    
    async function loadDevices() {
      loading = true;
      try {
        const recordCount = await blockchainStore.getRecordCount();
        const deviceMap = new Map<string, DeviceStats>();
        
        for (let i = 0; i < recordCount; i++) {
          const record = await blockchainStore.getData(i);
          if (record) {
            if (!deviceMap.has(record.deviceId)) {
              deviceMap.set(record.deviceId, {
                deviceId: record.deviceId,
                totalRecords: 0,
                lastActive: record.timestamp,
                status: 'active'
              });
            }
            const device = deviceMap.get(record.deviceId)!;
            device.totalRecords++;
            if (record.timestamp > device.lastActive) {
              device.lastActive = record.timestamp;
            }
          }
        }
        
        devices = Array.from(deviceMap.values());
      } catch (error) {
        trigger({
          message: 'Failed to load devices',
          background: 'preset-filled-error'
        });
      } finally {
        loading = false;
      }
    }
    
    async function loadDeviceData(deviceId: string) {
      selectedDevice = deviceId;
      const records = await blockchainStore.getDeviceRecords(deviceId);
      deviceData = await Promise.all(
        records.map(id => blockchainStore.getData(id))
      );
    }
  </script>
  
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">Device Management</h1>
    
    {#if loading}
      <div class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-preset-filled-primary"></div>
      </div>
    {:else}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4">Registered Devices</h2>
            <div class="space-y-4">
              {#each devices as device}
                <button
                  onclick={() => loadDeviceData(device.deviceId)}
                  class={`w-full text-left p-4 rounded-lg border ${
                    selectedDevice === device.deviceId 
                      ? 'border-preset-filled-primary bg-preset-filled-primary/5' 
                      : 'border-gray-200 hover:border-preset-filled-primary'
                  }`}
                >
                  <div class="flex justify-between items-center">
                    <span class="font-medium">{device.deviceId}</span>
                    <span class={`px-2 py-1 rounded text-xs ${
                      device.status === 'active' 
                        ? 'bg-preset-filled-success/10 text-preset-filled-success' 
                        : 'bg-preset-filled-error/10 text-preset-filled-error'
                    }`}>
                      {device.status}
                    </span>
                  </div>
                  <div class="mt-2 text-sm text-gray-500">
                    <p>Records: {device.totalRecords}</p>
                    <p>Last Active: {device.lastActive}</p>
                  </div>
                </button>
              {/each}
            </div>
          </div>
        </div>
        
        <div class="lg:col-span-2">
          {#if selectedDevice}
            <div class="bg-white rounded-lg shadow p-6">
              <h2 class="text-xl font-semibold mb-4">Device Data: {selectedDevice}</h2>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    {#each deviceData as record}
                      <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.timestamp}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.dataType}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.parsedData?.value || 'N/A'} {record.parsedData?.unit || ''}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.location}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {:else}
            <div class="bg-gray-50 rounded-lg p-8 text-center">
              <p class="text-gray-500">Select a device to view its data</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>