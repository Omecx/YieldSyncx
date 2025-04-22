/**
 * Raw sensor data from the blockchain
 */
export interface SensorData {
  deviceId: string;
  timestamp: number;
  data: string;
  dataType: string;
  location: string;
  dataHash?: string;
}

/**
 * Sensor reading from devices
 */
export interface SensorReading {
  deviceId: string;
  timestamp: number;
  dataType: string;
  data: string | Record<string, any>;
  location: string;
}

/**
 * Event data emitted by the contract
 */
export interface DataStoredEvent {
  recordId: number;
  deviceId: string;
  timestamp: number;
  dataType: string;
  data: string;
  event: any;
}

/**
 * Formatted sensor data for display
 */
export interface FormattedSensorData {
  id: number;
  deviceId: string;
  timestamp: string;
  sensorData: string;
  dataType: string;
  location: string;
  parsedData?: Record<string, any>;
}

/**
 * Batch information from blockchain
 */
export interface DataBatch {
  batchId: string;
  merkleRoot: string;
  fromIndex: number;
  toIndex: number;
  timestamp: number;
  description: string;
}

/**
 * Merkle proof information
 */
export interface MerkleProof {
  recordId: number;
  proof: string[];
  verified: boolean;
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorerUrl: string;
  isTestnet: boolean;
  wsRpcUrl?: string;
}

/**
 * Network information
 */
export interface NetworkInfo {
  name: string;
  chainId: number;
  isTestnet: boolean;
  blockExplorerUrl: string;
}

/**
 * Chart data point for visualization
 */
export interface ChartDataPoint {
  timestamp: number;
  value: number;
  deviceId: string;
  formattedTime: string;
  formattedDate: string;
}

/**
 * Device metrics
 */
export interface DeviceMetrics {
  deviceId: string;
  recordCount: number;
  firstTimestamp: number;
  lastTimestamp: number;
  dataTypes: string[];
}

/**
 * Certificate information
 */
export interface Certificate {
  tokenId: number;
  deviceId: string;
  certificateType: string;
  issueTimestamp: number;
  metadataURI: string;
  owner: string;
}

/**
 * Crop image data
 */
export interface CropImage {
  deviceId: string;
  location: string;
  timestamp: number;
  hash: string;
  size: number;
  originalSize: number;
  width: number;
  height: number;
  compressionRatio: number;
  preview: string;
  notes: string;
  data: Blob;
  id?: number;
}

/**
 * Sensor threshold configuration
 */
export interface SensorThresholds {
  min: number;
  max: number;
  rateOfChangeWarning: number;
  rateOfChangeAlert: number;
  normalRange: [number, number];
}

/**
 * Anomaly detail
 */
export interface AnomalyDetail {
  type: string;
  message: string;
  threshold?: number;
  actual: any;
}

/**
 * Anomaly report
 */
export interface AnomalyReport {
  deviceId: string;
  dataType: string;
  timestamp: number;
  location: string;
  value: number;
  anomalies: AnomalyDetail[];
  severity: 'info' | 'warning' | 'error';
}

/**
 * Local data aggregate
 */
export interface LocalDataAggregate {
  deviceId: string;
  dataType: string;
  startTimestamp: number;
  endTimestamp: number;
  recordCount: number;
  min: number;
  max: number;
  average: number;
  medianValue: number;
  standardDeviation: number;
  anomalyCount: number;
  merkleRoot: string;
}

/**
 * Connection status
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

/**
 * User roles
 */
export enum UserRole {
  ADMIN = 'admin',
  DEVICE = 'device',
  ANALYST = 'analyst',
  CERTIFIER = 'certifier',
  NONE = 'none'
}

/**
 * Notification type
 */
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

// In $lib/types.ts or similar file
export interface CropImage {
  deviceId: string;
  location: string;
  timestamp: number;
  preview: string;
  size: number;
  originalSize: number;
  width: number;
  height: number;
  notes: string;
  data: Blob;
}