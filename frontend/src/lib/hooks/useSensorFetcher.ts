import { blockchainStore } from '$lib/stores/blockchainStore';
import type { FormattedSensorData } from '$lib/types';

/**
 * Hook for fetching and managing sensor data from blockchain
 */
export function useSensorFetcher() {
  // State using Svelte 5 runes
  let devices = $state<string[]>([]);
  let selectedDevice = $state<string>('');
  let sensorData = $state<FormattedSensorData[]>([]);
  let isLoading = $state<boolean>(false);

  /**
   * Load recent device IDs
   */
  async function loadDevices() {
    isLoading = true;
    try {
      const count = await blockchainStore.getRecordCount();
      const fetchCount = Math.min(count, 50);
      const ids = Array.from({ length: fetchCount }, (_, i) => count - 1 - i);
      const records = await Promise.all(ids.map(id => blockchainStore.getData(id)));
      
      // Extract unique device IDs
      devices = Array.from(
        new Set(records.filter(Boolean).map(r => r!.deviceId))
      );
    } catch (err) {
      console.error('Error loading devices:', err);
    } finally {
      isLoading = false;
    }
  }

  /**
   * Load data for a specific device
   */
  async function loadDeviceData(deviceId: string) {
    if (!deviceId) return;
    isLoading = true;
    try {
      const recordIds = await blockchainStore.getDeviceRecords(deviceId);
      const recs = await Promise.all(
        recordIds.map(id => blockchainStore.getData(id))
      );
      sensorData = recs.filter(Boolean) as FormattedSensorData[];
    } catch (err) {
      console.error('Error fetching device data:', err);
    } finally {
      isLoading = false;
    }
  }

  // React to device selection changes
  $effect(() => {
    if (!selectedDevice) return;
    loadDeviceData(selectedDevice);
  });

  return {
    // State
    devices,
    selectedDevice,
    sensorData,
    isLoading,
    // Actions
    loadDevices,
    loadDeviceData,
    // Helper to set the selected device
    selectDevice: (deviceId: string) => {
      selectedDevice = deviceId;
    }
  };
}