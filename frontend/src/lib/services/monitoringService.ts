// monitoringService.ts
import { ethers } from 'ethers';
import { blockchainStore } from './blockchainStore';

interface MonitoringEvent {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: number;
  details: any;
}

export class MonitoringService {
  private static events: MonitoringEvent[] = [];
  private static eventListeners: Map<string, (event: MonitoringEvent) => void> = new Map();
  
  static async startMonitoring() {
    // Monitor contract events
    const { contract } = blockchainStore;
    if (!contract) return;
    
    contract.on('DataStored', (recordId, deviceId, timestamp, dataType, data) => {
      this.logEvent({
        type: 'DATA_STORED',
        severity: 'info',
        timestamp: Date.now(),
        details: { recordId, deviceId, timestamp, dataType }
      });
    });
    
    contract.on('BatchCreated', (batchId, merkleRoot, fromIndex, toIndex) => {
      this.logEvent({
        type: 'BATCH_CREATED',
        severity: 'info',
        timestamp: Date.now(),
        details: { batchId, merkleRoot, fromIndex, toIndex }
      });
    });
    
    // Monitor system health
    setInterval(() => this.checkSystemHealth(), 60000);
  }
  
  private static async checkSystemHealth() {
    try {
      const provider = blockchainStore.provider;
      if (!provider) {
        this.logEvent({
          type: 'CONNECTION_LOST',
          severity: 'critical',
          timestamp: Date.now(),
          details: { message: 'Blockchain provider disconnected' }
        });
        return;
      }
      
      // Check network connectivity
      const network = await provider.getNetwork();
      if (network.chainId !== 1287) {
        this.logEvent({
          type: 'WRONG_NETWORK',
          severity: 'error',
          timestamp: Date.now(),
          details: { 
            expected: 1287, 
            actual: network.chainId 
          }
        });
      }
      
      // Check contract responsiveness
      const contract = blockchainStore.contract;
      if (contract) {
        const recordCount = await contract.getRecordCount();
        this.logEvent({
          type: 'HEALTH_CHECK',
          severity: 'info',
          timestamp: Date.now(),
          details: { recordCount }
        });
      }
    } catch (error) {
      this.logEvent({
        type: 'HEALTH_CHECK_FAILED',
        severity: 'error',
        timestamp: Date.now(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }
  
  private static logEvent(event: MonitoringEvent) {
    this.events.push(event);
    
    // Trim old events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
    
    // Notify listeners
    const listener = this.eventListeners.get(event.type);
    if (listener) {
      listener(event);
    }
    
    // Critical events trigger immediate alerts
    if (event.severity === 'critical') {
      this.triggerAlert(event);
    }
  }
  
  private static triggerAlert(event: MonitoringEvent) {
    console.error('CRITICAL ALERT:', event);
    // In production, this would integrate with external alerting systems
  }
  
  static addEventListener(eventType: string, callback: (event: MonitoringEvent) => void) {
    this.eventListeners.set(eventType, callback);
  }
  
  static getRecentEvents(count: number = 100): MonitoringEvent[] {
    return this.events.slice(-count);
  }
  
  static getEventsByType(type: string): MonitoringEvent[] {
    return this.events.filter(event => event.type === type);
  }
}