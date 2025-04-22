import type { SensorReading, SensorData, LocalDataAggregate, AnomalyReport } from '$lib/types';
import { detectBatchAnomalies } from './anomalyDetection';
import { generateMerkleTree } from './merkleTree';

/**
 * Data aggregation service for preparing sensor data for blockchain storage
 * Processes raw readings into optimized batches with cryptographic proofs
 */

/**
 * Calculate statistical values from array of numbers
 * @param values Array of numeric values
 * @returns Statistical analysis
 */
function calculateStatistics(values: number[]): {
  min: number;
  max: number;
  average: number;
  median: number;
  standardDeviation: number;
} {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      average: 0,
      median: 0,
      standardDeviation: 0
    };
  }
  
  // Sort values for median calculation
  const sortedValues = [...values].sort((a, b) => a - b);
  
  // Calculate min and max
  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  
  // Calculate average
  const sum = sortedValues.reduce((acc, val) => acc + val, 0);
  const average = sum / sortedValues.length;
  
  // Calculate median
  const middle = Math.floor(sortedValues.length / 2);
  const median = sortedValues.length % 2 === 0
    ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
    : sortedValues[middle];
  
  // Calculate standard deviation
  const squaredDiffs = sortedValues.map(value => Math.pow(value - average, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / sortedValues.length;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    min,
    max,
    average,
    median,
    standardDeviation
  };
}

/**
 * Extract numeric value from sensor reading
 * @param reading Sensor reading
 * @returns Numeric value if available
 */
function extractNumericValue(reading: SensorReading): number | null {
  try {
    let data: Record<string, any>;
    
    // Parse data if it's a string
    if (typeof reading.data === 'string') {
      data = JSON.parse(reading.data);
    } else {
      data = reading.data;
    }
    
    // Try to extract value based on common patterns
    if (typeof data.value === 'number') {
      return data.value;
    }
    
    // Try property matching the data type
    if (reading.dataType && typeof data[reading.dataType] === 'number') {
      return data[reading.dataType];
    }
    
    // Find first numeric property
    for (const key in data) {
      if (typeof data[key] === 'number') {
        return data[key];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting numeric value:', error);
    return null;
  }
}

/**
 * Format sensor reading for blockchain storage
 * @param reading Raw sensor reading
 * @returns Formatted sensor data
 */
export function formatSensorData(reading: SensorReading): SensorData {
  return {
    deviceId: reading.deviceId,
    timestamp: reading.timestamp,
    data: typeof reading.data === 'string' ? reading.data : JSON.stringify(reading.data),
    dataType: reading.dataType,
    location: reading.location
  };
}

/**
 * Aggregate sensor readings by device and data type
 * @param readings Array of sensor readings
 * @returns Map of aggregated data by device and type
 */
export function aggregateSensorData(
  readings: SensorReading[]
): Map<string, LocalDataAggregate> {
  // Group readings by device and data type
  const groupedReadings = new Map<string, SensorReading[]>();
  
  for (const reading of readings) {
    const key = `${reading.deviceId}-${reading.dataType}`;
    if (!groupedReadings.has(key)) {
      groupedReadings.set(key, []);
    }
    groupedReadings.get(key)!.push(reading);
  }
  
  // Process each group
  const aggregates = new Map<string, LocalDataAggregate>();
  
  for (const [key, group] of groupedReadings.entries()) {
    // Sort by timestamp (ascending)
    group.sort((a, b) => a.timestamp - b.timestamp);
    
    // Extract timestamps
    const startTimestamp = group[0].timestamp;
    const endTimestamp = group[group.length - 1].timestamp;
    
    // Extract numeric values for statistics
    const numericValues: number[] = [];
    for (const reading of group) {
      const value = extractNumericValue(reading);
      if (value !== null) {
        numericValues.push(value);
      }
    }
    
    // Calculate statistics
    const stats = calculateStatistics(numericValues);
    
    // Check for anomalies
    const anomalies = detectBatchAnomalies(group);
    
    // Format sensor data for Merkle tree
    const formattedData = group.map(reading => formatSensorData(reading));
    
    // Generate Merkle tree
    const { merkleRoot } = generateMerkleTree(formattedData);
    
    // Create aggregate
    const [deviceId, dataType] = key.split('-');
    
    aggregates.set(key, {
      deviceId,
      dataType,
      startTimestamp,
      endTimestamp,
      recordCount: group.length,
      min: stats.min,
      max: stats.max,
      average: stats.average,
      medianValue: stats.median,
      standardDeviation: stats.standardDeviation,
      anomalyCount: anomalies.length,
      merkleRoot
    });
  }
  
  return aggregates;
}

/**
 * Prepare batch of sensor data for blockchain storage
 * @param readings Array of sensor readings to batch
 * @returns Batch data with Merkle tree information
 */
export function prepareSensorBatch(readings: SensorReading[]): {
  formattedData: SensorData[];
  merkleRoot: string;
  proofs: { [index: number]: string[] };
  aggregates: LocalDataAggregate[];
  anomalies: AnomalyReport[];
} {
  // Format readings for blockchain storage
  const formattedData = readings.map(reading => formatSensorData(reading));
  
  // Generate Merkle tree
  const { merkleRoot, proofs } = generateMerkleTree(formattedData);
  
  // Detect anomalies
  const anomalies = detectBatchAnomalies(readings);
  
  // Create aggregates
  const aggregatesMap = aggregateSensorData(readings);
  const aggregates = Array.from(aggregatesMap.values());
  
  return {
    formattedData,
    merkleRoot,
    proofs,
    aggregates,
    anomalies
  };
}

/**
 * Store sensor data in IndexedDB for offline access
 * @param readings Array of sensor readings
 * @returns Promise indicating success
 */
export async function storeSensorDataOffline(readings: SensorReading[]): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Open IndexedDB
    const request = indexedDB.open('YieldSyncxSensorDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('sensorReadings')) {
        const store = db.createObjectStore('sensorReadings', { autoIncrement: true });
        store.createIndex('deviceId', 'deviceId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('dataType', 'dataType', { unique: false });
        store.createIndex('deviceType', ['deviceId', 'dataType'], { unique: false });
      }
      
      if (!db.objectStoreNames.contains('dataAggregates')) {
        const store = db.createObjectStore('dataAggregates', { keyPath: 'id', autoIncrement: true });
        store.createIndex('deviceId', 'deviceId', { unique: false });
        store.createIndex('dataType', 'dataType', { unique: false });
        store.createIndex('deviceType', ['deviceId', 'dataType'], { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['sensorReadings', 'dataAggregates'], 'readwrite');
      
      // Store each reading
      const readingsStore = transaction.objectStore('sensorReadings');
      for (const reading of readings) {
        readingsStore.add({
          ...reading,
          data: typeof reading.data === 'string' ? reading.data : JSON.stringify(reading.data)
        });
      }
      
      // Generate and store aggregates
      const { aggregates } = prepareSensorBatch(readings);
      const aggregatesStore = transaction.objectStore('dataAggregates');
      
      for (const aggregate of aggregates) {
        aggregatesStore.add(aggregate);
      }
      
      transaction.oncomplete = () => {
        db.close();
        resolve(true);
      };
      
      transaction.onerror = () => {
        reject(new Error('Failed to store sensor data in IndexedDB'));
      };
    };
    
    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Get offline sensor data that hasn't been synced to blockchain
 * @returns Promise with unsynced readings
 */
export async function getUnsyncedSensorData(): Promise<SensorReading[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('YieldSyncxSensorDB', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Check if synced flag exists
      if (!db.objectStoreNames.contains('sensorReadings')) {
        resolve([]);
        return;
      }
      
      const transaction = db.transaction(['sensorReadings'], 'readonly');
      const store = transaction.objectStore('sensorReadings');
      
      // Get unsynced readings (all for now - in a real app we'd track which are synced)
      const getRequest = store.getAll();
      
      getRequest.onsuccess = () => {
        const readings = getRequest.result as SensorReading[];
        resolve(readings);
      };
      
      getRequest.onerror = () => {
        reject(new Error('Failed to get unsynced sensor data'));
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    };
    
    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Mark sensor readings as synced to blockchain
 * @param ids Array of reading IDs
 * @returns Promise indicating success
 */
export async function markSensorDataAsSynced(ids: number[]): Promise<boolean> {
  // In a real application, we would update a 'synced' flag for each reading
  // For this demo, we'll just return success
  return Promise.resolve(true);
}