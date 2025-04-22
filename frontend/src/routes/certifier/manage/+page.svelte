<script lang="ts">
    import { blockchainStore, isAnalyst } from '$lib/stores/blockchainStore';
    import { trigger } from '$lib/stores/toastStore.svelte';
    
    let pendingCertifications = $state<any[]>([]);
    let processedCertifications = $state<any[]>([]);
    let loading = $state(false);
    
    $effect(() => {
      if ($blockchainStore.connected && $isAnalyst) {
        loadCertifications();
      }
    });
    
    async function loadCertifications() {
      loading = true;
      try {
        // Load pending certifications (records not yet certified)
        const recordCount = await blockchainStore.getRecordCount();
        const records = await Promise.all(
          Array.from({ length: Math.min(20, recordCount) }, (_, i) => 
            blockchainStore.getData(recordCount - i - 1)
          )
        );
        pendingCertifications = records.filter(Boolean);
        
        // Load processed certifications
        // This would need an additional contract method to get user's certifications
      } catch (error) {
        trigger({
          message: 'Failed to load certifications',
          background: 'preset-filled-error'
        });
      } finally {
        loading = false;
      }
    }
    
    async function certifyRecord(recordId: number, level: string) {
      try {
        const tokenURI = `https://api.yieldsyncx.com/certificates/${recordId}`;
        await blockchainStore.certifyRecord(recordId, tokenURI, level);
        trigger({
          message: 'Record certified successfully',
          background: 'preset-filled-success'
        });
        loadCertifications();
      } catch (error) {
        trigger({
          message: 'Certification failed',
          background: 'preset-filled-error'
        });
      }
    }
  </script>
  
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">Certification Management</h1>
    
    {#if !$isAnalyst}
      <div class="bg-preset-filled-warning/10 border border-preset-filled-warning rounded-lg p-6">
        <h2 class="text-xl font-semibold text-preset-filled-warning mb-2">Access Restricted</h2>
        <p class="text-gray-700">You need analyst role to access this page.</p>
      </div>
    {:else if loading}
      <div class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-preset-filled-primary"></div>
      </div>
    {:else}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 class="text-xl font-semibold mb-4">Pending Certifications</h2>
          <div class="space-y-4">
            {#each pendingCertifications as record}
              <div class="bg-white rounded-lg shadow p-6">
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3 class="font-medium">Record #{record.id}</h3>
                    <p class="text-sm text-gray-500">Device: {record.deviceId}</p>
                    <p class="text-sm text-gray-500">Type: {record.dataType}</p>
                    <p class="text-sm text-gray-500">Time: {record.timestamp}</p>
                  </div>
                  <div class="flex space-x-2">
                    <button
                      onclick={() => certifyRecord(record.id, 'STANDARD')}
                      class="px-3 py-1 bg-preset-filled-primary text-white rounded hover:bg-preset-filled-primary/90"
                    >
                      Standard
                    </button>
                    <button
                      onclick={() => certifyRecord(record.id, 'PREMIUM')}
                      class="px-3 py-1 bg-preset-filled-secondary text-white rounded hover:bg-preset-filled-secondary/90"
                    >
                      Premium
                    </button>
                  </div>
                </div>
                <pre class="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify(record.parsedData, null, 2)}
                </pre>
              </div>
            {/each}
          </div>
        </div>
        
        <div>
          <h2 class="text-xl font-semibold mb-4">Recent Certifications</h2>
          <div class="space-y-4">
            {#each processedCertifications as cert}
              <div class="bg-white rounded-lg shadow p-6">
                <div class="flex justify-between items-center">
                  <div>
                    <h3 class="font-medium">Certificate #{cert.tokenId}</h3>
                    <p class="text-sm text-gray-500">Device: {cert.deviceId}</p>
                    <p class="text-sm text-gray-500">Level: {cert.certificationLevel}</p>
                  </div>
                  <span class="px-3 py-1 bg-preset-filled-success/10 text-preset-filled-success rounded">
                    Certified
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>