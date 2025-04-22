// backupService.ts
import { IndexedDBDataService } from './dataService';

export class BackupService {
  private static readonly BACKUP_KEY = 'yieldsyncx_backup';
  
  static async createBackup(): Promise<string> {
    const data = {
      timestamp: Date.now(),
      sensorData: await IndexedDBDataService.getAllSensorData(),
      dataAggregates: await IndexedDBDataService.getAllAggregates(),
      cropImages: await IndexedDBDataService.getAllImages(),
      version: '1.0.0'
    };
    
    const backup = JSON.stringify(data);
    localStorage.setItem(this.BACKUP_KEY, backup);
    
    return backup;
  }
  
  static async exportBackup(): Promise<Blob> {
    const backup = await this.createBackup();
    return new Blob([backup], { type: 'application/json' });
  }
  
  static async restoreFromBackup(backupData: string): Promise<boolean> {
    try {
      const data = JSON.parse(backupData);
      
      // Validate backup structure
      if (!data.timestamp || !data.sensorData || !data.version) {
        throw new Error('Invalid backup format');
      }
      
      // Clear existing data
      await IndexedDBDataService.clearAllData();
      
      // Restore sensor data
      for (const record of data.sensorData) {
        await IndexedDBDataService.saveSensorData([record]);
      }
      
      // Restore aggregates
      if (data.dataAggregates) {
        for (const aggregate of data.dataAggregates) {
          await IndexedDBDataService.saveAggregate(aggregate);
        }
      }
      
      // Restore images
      if (data.cropImages) {
        for (const image of data.cropImages) {
          await IndexedDBDataService.saveImage(image);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Backup restoration failed:', error);
      return false;
    }
  }
  
  static getLastBackupTimestamp(): number | null {
    const backup = localStorage.getItem(this.BACKUP_KEY);
    if (!backup) return null;
    
    try {
      const data = JSON.parse(backup);
      return data.timestamp;
    } catch {
      return null;
    }
  }
}