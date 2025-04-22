<script lang="ts">
    import { blockchainStore } from '$lib/stores/blockchainStore';
    import { onMount } from 'svelte';
    
    let recentData = $state<any[]>([]);
    let systemStats = $state({
      totalRecords: 0,
      activeDevices: 0,
      certificatesIssued: 0,
      anomaliesDetected: 0
    });
    
    $effect(() => {
      if ($blockchainStore.connected) {
        loadDashboardData();
      }
    });
    
    async function loadDashboardData() {
      try {
        const recordCount = await blockchainStore.getRecordCount();
        systemStats.totalRecords = recordCount;
        
        // Load recent data
        const records = await Promise.all(
          Array.from({ length: Math.min(5, recordCount) }, (_, i) => 
            blockchainStore.getData(recordCount - i - 1)
          )
        );
        recentData = records.filter(Boolean);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    }
  </script>
  
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">IoT Data Management Dashboard</h1>
    
    {#if !$blockchainStore.connected}
      <div class="bg-preset-filled-error text-white p-4 rounded-lg mb-8">
        <h2 class="text-xl font-semibold mb-2">Connect Your Wallet</h2>
        <p>Please connect your wallet to access the system.</p>
        <button 
          onclick={() => blockchainStore.connectWallet()}
          class="mt-4 bg-white text-preset-filled-primary px-4 py-2 rounded hover:bg-gray-100 transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-600">Total Records</h3>
          <p class="text-3xl font-bold text-preset-filled-primary">{systemStats.totalRecords}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-600">Active Devices</h3>
          <p class="text-3xl font-bold text-preset-filled-success">{systemStats.activeDevices}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-600">Certificates Issued</h3>
          <p class="text-3xl font-bold text-preset-filled-secondary">{systemStats.certificatesIssued}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-600">Anomalies Detected</h3>
          <p class="text-3xl font-bold text-preset-filled-warning">{systemStats.anomaliesDetected}</p>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Recent Records</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each recentData as record}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.id}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.deviceId}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.dataType}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.timestamp}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.parsedData?.value || 'N/A'} {record.parsedData?.unit || ''}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </div>