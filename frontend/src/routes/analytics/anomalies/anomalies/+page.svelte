<script lang="ts">
  import { onMount } from 'svelte';
  import { blockchainStore } from '$lib/stores/blockchainStore';
  import { detectBatchAnomalies } from '$lib/services/anomalyDetection';
  import { aggregateSensorData } from '$lib/services/dataAggregation';
  import { ProgressRing, Tabs } from '@skeletonlabs/skeleton-svelte';
  import Icon from '@iconify/svelte';
  import AnomalyAlert from '../../../components/AnomalyAlert.svelte';
  import SensorDataChart from '../../../components/SensorDataChart.svelte';
  import { trigger } from '$lib/stores/toastStore.svelte';
  import type { SensorReading, AnomalyReport, FormattedSensorData, LocalDataAggregate } from '$lib/types';
  
  // Component state using Svelte 5 reactivity
  let isLoading = $state(true);
  let errorMessage = $state('');
  let records = $state<FormattedSensorData[]>([]);
  let anomalies = $state<AnomalyReport[]>([]);
  let aggregates = $state<LocalDataAggregate[]>([]);
  let selectedDevice = $state('');
  let selectedDataType = $state('');
  let activeTab = $state('anomalies');
  
  // Format sensor data for processing
  function formatForProcessing(records: FormattedSensorData[]): SensorReading[] {
    return records.map(record => ({
      deviceId: record.deviceId,
      timestamp: new Date(record.timestamp).getTime(),
      data: record.sensorData,
      dataType: record.dataType,
      location: record.location
    }));
  }
  
  // Load data from blockchain
  async function loadData() {
    isLoading = true;
    errorMessage = '';
    
    try {
      // Get record count
      if ($blockchainStore.connected) {
        const recordCount = await blockchainStore.getRecordCount();
        
        // Fetch latest records
        const fetchCount = Math.min(recordCount, 50);
        const promises = [];
        
        for (let i = recordCount - 1; i >= Math.max(0, recordCount - fetchCount); i--) {
          promises.push(blockchainStore.getIoTData(i));
        }
        
        const results = await Promise.all(promises);
        records = results.filter(r => r !== null) as FormattedSensorData[];
        
        // Process the records for anomalies
        const processableRecords = formatForProcessing(records);
        
        // Detect anomalies
        anomalies = detectBatchAnomalies(processableRecords);
        
        // Generate aggregates
        const aggregatesMap = aggregateSensorData(processableRecords);
        aggregates = Array.from(aggregatesMap.values());
        
        // Show success toast
        trigger({
          message: `Loaded ${results.length} records from blockchain`,
          background: 'preset-filled-success'
        });
      }
    } catch (err) {
      console.error('Error loading data:', err);
      errorMessage = err instanceof Error ? err.message : 'Error loading data';
      
      // Show error toast
      trigger({
        message: `Error: ${errorMessage}`,
        background: 'preset-filled-error'
      });
    } finally {
      isLoading = false;
    }
  }
  
  // Change $derived to functions that return values directly to avoid TypeScript errors
  function getDevices() {
    const deviceSet = new Set<string>();
    records.forEach(record => deviceSet.add(record.deviceId));
    return Array.from(deviceSet).map(id => ({
      id,
      name: id // In a real app, you'd have a mapping to human-readable names
    }));
  }
  
  function getDataTypes() {
    const typeSet = new Set<string>();
    records.forEach(record => typeSet.add(record.dataType));
    return Array.from(typeSet);
  }
  
  function getFilteredAnomalies() {
    return anomalies.filter(anomaly => 
      (!selectedDevice || anomaly.deviceId === selectedDevice) &&
      (!selectedDataType || anomaly.dataType === selectedDataType)
    ).sort((a, b) => {
      // Sort by severity first (error > warning > info)
      const severityOrder = { error: 0, warning: 1, info: 2 };
      const severityDiff = severityOrder[a.severity as keyof typeof severityOrder] - 
                          severityOrder[b.severity as keyof typeof severityOrder];
      
      if (severityDiff !== 0) return severityDiff;
      
      // Then sort by timestamp (newest first)
      return b.timestamp - a.timestamp;
    });
  }
  
  function getFilteredRecords() {
    return records.filter(record => 
      (!selectedDevice || record.deviceId === selectedDevice) &&
      (!selectedDataType || record.dataType === selectedDataType)
    );
  }
  
  function getFilteredAggregates() {
    return aggregates.filter(a => 
      (!selectedDevice || a.deviceId === selectedDevice) &&
      (!selectedDataType || a.dataType === selectedDataType)
    );
  }
  
  // Initialize component
  onMount(() => {
    if ($blockchainStore.connected) {
      loadData();
    } else {
      isLoading = false;
    }
  });
  
  // Watch for blockchain connection changes
  $effect(() => {
    if ($blockchainStore.connected && !isLoading && records.length === 0) {
      loadData();
    }
  });
</script>

<div class="space-y-6">
  <!-- Page header -->
  <div class="flex flex-col lg:flex-row justify-between gap-4">
    <div>
      <h1 class="text-3xl font-bold mb-2">Anomaly Detection & Analytics</h1>
      <p class="text-surface-700 max-w-3xl">
        Monitor sensor anomalies, analyze environmental data, and receive automated recommendations.
      </p>
    </div>
    
    <div class="flex flex-wrap items-center gap-2">
      <select 
        class="select" 
        bind:value={selectedDevice}
      >
        <option value="">All Devices</option>
        {#each getDevices() as device}
          <option value={device.id}>{device.id}</option>
        {/each}
      </select>
      
      <select 
        class="select" 
        bind:value={selectedDataType}
      >
        <option value="">All Data Types</option>
        {#each getDataTypes() as type}
          <option value={type}>{type}</option>
        {/each}
      </select>
      
      <button 
        class="btn preset-filled-primary" 
        onclick={loadData}
        disabled={isLoading || !$blockchainStore.connected}
      >
        {#if isLoading}
          <div class="w-5 h-5">
            <ProgressRing meterBase="bg-white" strokeWidth="2px" />
          </div>
          <span>Loading...</span>
        {:else}
          <Icon icon="mdi:refresh" class="size-5" />
          <span>Refresh</span>
        {/if}
      </button>
    </div>
  </div>
  
  <!-- Connection Status Alert -->
  {#if !$blockchainStore.connected}
    <div class="alert preset-filled-warning">
      <Icon icon="mdi:wallet-outline" class="size-5" />
      <div class="alert-message">
        <h3 class="h3">Wallet Not Connected</h3>
        <p>Please connect your wallet to access blockchain data and monitor sensor anomalies.</p>
      </div>
      <div class="alert-actions">
        <button 
          class="btn preset-filled" 
          onclick={() => blockchainStore.connectWallet()}
        >
          Connect Wallet
        </button>
      </div>
    </div>
  {/if}

  <!-- Dashboard Tabs -->
  <Tabs value={activeTab} onValueChange={(e) => (activeTab = e.value)}>
    {#snippet list()}
      <Tabs.Control value="anomalies">
        <Icon icon="mdi:alert-circle" class="size-5 mr-2" />
        Anomalies
        {#if getFilteredAnomalies().length > 0}
          <span class="badge bg-error-500 text-white ml-2">{getFilteredAnomalies().length}</span>
        {/if}
      </Tabs.Control>
      <Tabs.Control value="charts">
        <Icon icon="mdi:chart-line" class="size-5 mr-2" />
        Data Trends
      </Tabs.Control>
      <Tabs.Control value="aggregates">
        <Icon icon="mdi:calculator" class="size-5 mr-2" />
        Aggregated Data
      </Tabs.Control>
    {/snippet}
    
    {#snippet content()}
      <Tabs.Panel value="anomalies">
        <div class="p-4">
          {#if isLoading}
            <div class="flex justify-center items-center h-64">
              <ProgressRing meterBase="bg-primary-500" strokeWidth="2px" />
            </div>
          {:else if errorMessage}
            <div class="alert preset-filled-error">
              <Icon icon="mdi:alert-circle" class="size-5" />
              <div class="alert-message">
                <p>{errorMessage}</p>
              </div>
            </div>
          {:else if getFilteredAnomalies().length === 0}
            <div class="alert preset-filled-success">
              <Icon icon="mdi:check-circle" class="size-5" />
              <div class="alert-message">
                <h3 class="h3">No Anomalies Detected</h3>
                <p>All sensor readings are within expected parameters.</p>
              </div>
            </div>
          {:else}
            <div class="space-y-4">
              {#each getFilteredAnomalies() as anomaly}
                <AnomalyAlert anomaly={anomaly} />
              {/each}
            </div>
          {/if}
        </div>
      </Tabs.Panel>
      
      <Tabs.Panel value="charts">
        <div class="p-4">
          <h3 class="h3 mb-4">Data Trends</h3>
          {#if isLoading}
            <div class="flex justify-center items-center h-64">
              <ProgressRing meterBase="bg-primary-500" strokeWidth="2px" />
            </div>
          {:else if getFilteredRecords().length === 0}
            <div class="alert preset-filled-surface">
              <Icon icon="mdi:information" class="size-5" />
              <div class="alert-message">
                <p>No data available for the selected filters.</p>
              </div>
            </div>
          {:else}
            <SensorDataChart 
              data={getFilteredRecords()} 
              deviceId={selectedDevice}
            />
          {/if}
        </div>
      </Tabs.Panel>
      
      <Tabs.Panel value="aggregates">
        <div class="p-4">
          <h3 class="h3 mb-4">Aggregated Data</h3>
          {#if isLoading}
            <div class="flex justify-center items-center h-64">
              <ProgressRing meterBase="bg-primary-500" strokeWidth="2px" />
            </div>
          {:else if aggregates.length === 0}
            <div class="alert preset-filled-surface">
              <Icon icon="mdi:information" class="size-5" />
              <div class="alert-message">
                <p>No aggregated data available.</p>
              </div>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each getFilteredAggregates() as aggregate}
                <div class="card p-4 shadow">
                  <h4 class="text-lg font-semibold mb-2">
                    {aggregate.deviceId} - {aggregate.dataType}
                  </h4>
                  <div class="space-y-2 text-sm">
                    <p><span class="font-medium">Records:</span> {aggregate.recordCount}</p>
                    <p><span class="font-medium">Range:</span> {new Date(aggregate.startTimestamp).toLocaleDateString()} - {new Date(aggregate.endTimestamp).toLocaleDateString()}</p>
                    <p><span class="font-medium">Min/Max:</span> {aggregate.min.toFixed(2)} / {aggregate.max.toFixed(2)}</p>
                    <p><span class="font-medium">Average:</span> {aggregate.average.toFixed(2)}</p>
                    <p><span class="font-medium">Median:</span> {aggregate.medianValue.toFixed(2)}</p>
                    <p><span class="font-medium">Standard Deviation:</span> {aggregate.standardDeviation.toFixed(2)}</p>
                    <p>
                      <span class="font-medium">Anomalies:</span> 
                      {aggregate.anomalyCount}
                      {#if aggregate.anomalyCount > 0}
                        <span class="badge preset-filled-warning ml-2">{aggregate.anomalyCount}</span>
                      {/if}
                    </p>
                    <div class="pt-2 font-medium">
                      <p class="text-xs font-mono truncate" title={aggregate.merkleRoot}>
                        <span class="font-medium">Merkle Root:</span> {aggregate.merkleRoot.substring(0, 18)}...
                      </p>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </Tabs.Panel>
    {/snippet}
  </Tabs>
</div>