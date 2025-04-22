import type { SensorReading, LocalDataAggregate, CropImage } from '$lib/types';

interface IndexedDBConfig {
  dbName: string;
  version: number;
  stores: {
    [storeName: string]: {
      keyPath: string;
      autoIncrement?: boolean;
      indexes: {
        name: string;
        keyPath: string | string[];
        unique?: boolean;
      }[];
    };
  };
}

const DB_CONFIG: IndexedDBConfig = {
  dbName: 'YieldSyncxDB',
  version: 1,
  stores: {
    sensorReadings: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'deviceId', keyPath: 'deviceId', unique: false },
        { name: 'timestamp', keyPath: 'timestamp', unique: false },
        { name: 'dataType', keyPath: 'dataType', unique: false },
        { name: 'deviceType', keyPath: ['deviceId', 'dataType'], unique: false },
        { name: 'synced', keyPath: 'synced', unique: false }
      ]
    },
    dataAggregates: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'deviceId', keyPath: 'deviceId', unique: false },
        { name: 'dataType', keyPath: 'dataType', unique: false },
        { name: 'deviceType', keyPath: ['deviceId', 'dataType'], unique: false },
        { name: 'timestamp', keyPath: 'startTimestamp', unique: false }
      ]
    },
    cropImages: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'deviceId', keyPath: 'deviceId', unique: false },
        { name: 'timestamp', keyPath: 'timestamp', unique: false },
        { name: 'hash', keyPath: 'hash', unique: true }
      ]
    }
  }
};

export class IndexedDBDataService {
  private static db: IDBDatabase | null = null;
  
  private static async getDatabase(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.dbName, DB_CONFIG.version);
      
      request.onerror = () => reject(new Error(IDBTransaction.error?.message ?? 'Failed to save sensor data'));
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        for (const [storeName, config] of Object.entries(DB_CONFIG.stores)) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: config.keyPath,
              autoIncrement: config.autoIncrement
            });
            
            // Create indexes
            for (const index of config.indexes) {
              store.createIndex(index.name, index.keyPath, { unique: index.unique });
            }
          }
        }
      };
    });
  }
  
  static async saveSensorData(readings: SensorReading[]): Promise<boolean> {
    const db = await this.getDatabase();
    const transaction = db.transaction(['sensorReadings'], 'readwrite');
    const store = transaction.objectStore('sensorReadings');
    
    return new Promise((resolve, reject) => {
      for (const reading of readings) {
        store.add({
          ...reading,
          synced: false,
          dateAdded: Date.now()
        });
      }
      
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(new Error(transaction.error?.message ?? 'Failed Transaction'));
    });
  }
  
  static async getSensorData(
    filters?: {
      deviceId?: string;
      dataType?: string;
      fromTimestamp?: number;
      toTimestamp?: number;
      synced?: boolean;
    }
  ): Promise<SensorReading[]> {
    const db = await this.getDatabase();
    const transaction = db.transaction(['sensorReadings'], 'readonly');
    const store = transaction.objectStore('sensorReadings');
    
    return new Promise((resolve, reject) => {
      const results: SensorReading[] = [];
      let request: IDBRequest;
      
      if (filters?.deviceId && filters?.dataType) {
        const index = store.index('deviceType');
        request = index.openCursor([filters.deviceId, filters.dataType]);
      } else if (filters?.deviceId) {
        const index = store.index('deviceId');
        request = index.openCursor(filters.deviceId);
      } else if (filters?.synced !== undefined) {
        const index = store.index('synced');
        request = index.openCursor(filters.synced);
      } else {
        request = store.openCursor();
      }
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const record = cursor.value;
          let include = true;
          
          // Apply additional filters
          if (filters?.fromTimestamp && record.timestamp < filters.fromTimestamp) {
            include = false;
          }
          if (filters?.toTimestamp && record.timestamp > filters.toTimestamp) {
            include = false;
          }
          
          if (include) {
            results.push(record);
          }
          
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(new Error(transaction.error?.message ?? 'Failed to save sensor data'));
    });
  }
  
  static async markSensorDataAsSynced(ids: number[]): Promise<boolean> {
    const db = await this.getDatabase();
    const transaction = db.transaction(['sensorReadings'], 'readwrite');
    const store = transaction.objectStore('sensorReadings');
    
    return new Promise((resolve, reject) => {
      for (const id of ids) {
        const request = store.get(id);
        
        request.onsuccess = () => {
          const record = request.result;
          if (record) {
            record.synced = true;
            store.put(record);
          }
        };
      }
      
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }
  
  static async saveAggregate(aggregate: LocalDataAggregate): Promise<boolean> {
    const db = await this.getDatabase();
    const transaction = db.transaction(['dataAggregates'], 'readwrite');
    const store = transaction.objectStore('dataAggregates');
    
    return new Promise((resolve, reject) => {
      store.add(aggregate);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }
  
  static async getAggregates(
    filters?: {
      deviceId?: string;
      dataType?: string;
      fromTimestamp?: number;
      toTimestamp?: number;
    }
  ): Promise<LocalDataAggregate[]> {
    const db = await this.getDatabase();
    const transaction = db.transaction(['dataAggregates'], 'readonly');
    const store = transaction.objectStore('dataAggregates');
    
    return new Promise((resolve, reject) => {
      const results: LocalDataAggregate[] = [];
      let request: IDBRequest;
      
      if (filters?.deviceId && filters?.dataType) {
        const index = store.index('deviceType');
        request = index.openCursor([filters.deviceId, filters.dataType]);
      } else if (filters?.deviceId) {
        const index = store.index('deviceId');
        request = index.openCursor(filters.deviceId);
      } else {
        request = store.openCursor();
      }
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const record = cursor.value;
          let include = true;
          
          // Apply additional filters
          if (filters?.fromTimestamp && record.startTimestamp < filters.fromTimestamp) {
            include = false;
          }
          if (filters?.toTimestamp && record.endTimestamp > filters.toTimestamp) {
            include = false;
          }
          
          if (include) {
            results.push(record);
          }
          
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(new Error(transaction.error?.message ?? 'Failed to save sensor data'));
    });
  }
  
  static async saveImage(image: CropImage): Promise<boolean> {
    const db = await this.getDatabase();
    const transaction = db.transaction(['cropImages'], 'readwrite');
    const store = transaction.objectStore('cropImages');
    
    return new Promise((resolve, reject) => {
      store.add(image);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }
  
  static async getImages(
    filters?: {
      deviceId?: string;
      fromTimestamp?: number;
      toTimestamp?: number;
    }
  ): Promise<CropImage[]> {
    const db = await this.getDatabase();
    const transaction = db.transaction(['cropImages'], 'readonly');
    const store = transaction.objectStore('cropImages');
    
    return new Promise((resolve, reject) => {
      const results: CropImage[] = [];
      let request: IDBRequest;
      
      if (filters?.deviceId) {
        const index = store.index('deviceId');
        request = index.openCursor(filters.deviceId);
      } else {
        request = store.openCursor();
      }
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const record = cursor.value;
          let include = true;
          
          // Apply additional filters
          if (filters?.fromTimestamp && record.timestamp < filters.fromTimestamp) {
            include = false;
          }
          if (filters?.toTimestamp && record.timestamp > filters.toTimestamp) {
            include = false;
          }
          
          if (include) {
            results.push(record);
          }
          
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(new Error(transaction.error?.message ?? 'Failed to save sensor data'));
    });
  }
  
  static async clearAllData(): Promise<boolean> {
    const db = await this.getDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        ['sensorReadings', 'dataAggregates', 'cropImages'],
        'readwrite'
      );
      
      transaction.objectStore('sensorReadings').clear();
      transaction.objectStore('dataAggregates').clear();
      transaction.objectStore('cropImages').clear();
      
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(new Error(transaction.error?.message ?? 'Failed to save sensor data'));
    });
  }
  
  static async getAllSensorData(): Promise<SensorReading[]> {
    return this.getSensorData();
  }
  
  static async getAllAggregates(): Promise<LocalDataAggregate[]> {
    return this.getAggregates();
  }
  
  static async getAllImages(): Promise<CropImage[]> {
    return this.getImages();
  }
}