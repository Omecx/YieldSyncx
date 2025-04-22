import { getUnsyncedSensorData, markSensorDataAsSynced, prepareSensorBatch } from './dataAggregation';
import { trigger} from '$lib/stores/toastStore.svelte';
import type { SensorReading } from '$lib/types';

/**
 * Sync status store using Svelte 5 reactivity
 */
export function createSyncStore() {
  // Use the blockchainStore as a reactive dependency
  let blockchainStore = $state({
    connected: false,
    storeIoTData: async (deviceId: string, data: any, dataType: string, location: string) => {
      // Implementation would be imported from actual blockchainStore
      return Promise.resolve();
    },
    createBatch: async (startIndex: number, endIndex: number, merkleRoot: string, description: string) => {
      // Implementation would be imported from actual blockchainStore
      return Promise.resolve();
    }
  });

  // Effect to update blockchainStore when the imported store changes
  $effect(() => {
    // This would be replaced with the actual import once converted to Svelte 5
    // const imported = $blockchainStore;
    // blockchainStore.connected = imported.connected;
    // Other properties would be updated here
  });
  
  // State variables with explicit typing
  let isSyncing = $state(false);
  let lastSyncTime = $state<number | null>(null);
  let pendingCount = $state(0);
  let syncError = $state<string | null>(null);
  let autoSyncEnabled = $state(
    typeof localStorage !== 'undefined' && localStorage.getItem('autoSyncEnabled') === 'true'
  );
  
  // Update pending count
  async function updatePendingCount() {
    try {
      const unsyncedData = await getUnsyncedSensorData();
      pendingCount = unsyncedData.length;
    } catch (error) {
      console.error('Error checking pending data:', error);
    }
  }
  
  // Toggle auto-sync
  function toggleAutoSync(enabled: boolean) {
    autoSyncEnabled = enabled;
    
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('autoSyncEnabled', enabled.toString());
    }
    
    if (enabled) {
      // Perform initial sync
      syncData();
    }
  }
  
  // Synchronize offline data with blockchain
  async function syncData(): Promise<boolean> {
    // Don't sync if already syncing or not connected
    if (isSyncing || !blockchainStore.connected) {
      return false;
    }
    
    isSyncing = true;
    syncError = null;
    
    try {
      // Get unsynced data
      const unsyncedData = await getUnsyncedSensorData();
      
      if (unsyncedData.length === 0) {
        pendingCount = 0;
        lastSyncTime = Date.now();
        return true;
      }
      
      // Group data by device for more efficient syncing
      const deviceGroups = groupByDevice(unsyncedData);
      
      // Process each device group
      for (const [deviceId, readings] of deviceGroups.entries()) {
        // Prepare the batch
        const { formattedData, merkleRoot } = prepareSensorBatch(readings);
        
        // Track IDs to mark as synced
        const syncedIds: number[] = [];
        
        // Process in smaller batches if needed
        const BATCH_SIZE = 5; // Maximum records to process at once
        for (let i = 0; i < formattedData.length; i += BATCH_SIZE) {
          const batchSlice = formattedData.slice(i, i + BATCH_SIZE);
          
          // Send data to blockchain
          for (const data of batchSlice) {
            await blockchainStore.storeIoTData(
              data.deviceId,
              data.data,
              data.dataType,
              data.location
            );
            
            // Add to synced IDs
            syncedIds.push(i);
          }
        }
        
        // Mark synced data
        await markSensorDataAsSynced(syncedIds);
        
        // Create batch record with Merkle root (if enough records)
        if (formattedData.length > 10) {
          const batchDescription = `Auto-synced batch for ${deviceId} at ${new Date().toISOString()}`;
          
          await blockchainStore.createBatch(
            0, // Blockchain recordCount - formattedData.length
            formattedData.length - 1, // Blockchain recordCount - 1
            merkleRoot,
            batchDescription
          );
        }
      }
      
      // Update pending count
      await updatePendingCount();
      
      // Update last sync time
      lastSyncTime = Date.now();
      
      // Show success notification
      trigger({
        message: `Successfully synchronized ${unsyncedData.length} records`,
        background: 'preset-filled-success' // Updated from variant-* to preset-*
      });
      
      return true;
    } catch (error) {
      console.error('Error syncing data:', error);
      syncError = error instanceof Error ? error.message : 'Unknown sync error';
      
      // Show error notification
      trigger({
        message: `Sync error: ${syncError}`,
        background: 'preset-filled-error' // Updated from variant-* to preset-*
      });
      
      return false;
    } finally {
      isSyncing = false;
    }
  }
  
  // Group readings by device ID
  function groupByDevice(readings: SensorReading[]): Map<string, SensorReading[]> {
    const groups = new Map<string, SensorReading[]>();
    
    for (const reading of readings) {
      if (!groups.has(reading.deviceId)) {
        groups.set(reading.deviceId, []);
      }
      groups.get(reading.deviceId)!.push(reading);
    }
    
    return groups;
  }
  
  // Set up auto-sync
  function setupAutoSync() {
    // With Svelte 5 reactivity, we can use $effect instead of subscriptions
    $effect(() => {
      if (blockchainStore.connected && autoSyncEnabled) {
        syncData();
      }
    });
    
    // Set up interval for checking pending data
    let interval: number | undefined;
    
    if (typeof window !== 'undefined') {
      interval = window.setInterval(updatePendingCount, 30000);
      
      // Initial pending count update
      updatePendingCount();
    }
    
    // Return cleanup function for component unmount
    return () => {
      if (interval !== undefined && typeof window !== 'undefined') {
        window.clearInterval(interval);
      }
    };
  }
  
  // Setup auto-sync if in browser environment
  if (typeof window !== 'undefined') {
    setupAutoSync();
  }
  
  // In Svelte 5, we don't need getters, as reactive state is directly accessible
  return {
    isSyncing,
    lastSyncTime,
    pendingCount,
    syncError,
    autoSyncEnabled,
    syncData,
    toggleAutoSync,
    updatePendingCount
  };
}

// Create and export the store
export const syncStore = createSyncStore();