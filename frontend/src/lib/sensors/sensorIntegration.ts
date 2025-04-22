import type { SensorReading } from '$lib/types';

// Interface for different sensor types
interface SensorConfig {
  id: string;
  type: 'temperature' | 'humidity' | 'soil-moisture' | 'light' | 'co2';
  location: string;
  minValue: number;
  maxValue: number;
  unit: string;
  variability: number; // How much values can change between readings
}

// Sample sensor configuration
const sensorConfigs: SensorConfig[] = [
  {
    id: 'device-001',
    type: 'temperature',
    location: 'field-north',
    minValue: 15,
    maxValue: 35,
    unit: '°C',
    variability: 0.5
  },
  {
    id: 'device-002',
    type: 'humidity',
    location: 'field-north',
    minValue: 40,
    maxValue: 90,
    unit: '%',
    variability: 2
  },
  {
    id: 'device-003',
    type: 'soil-moisture',
    location: 'field-north',
    minValue: 20,
    maxValue: 80,
    unit: '%',
    variability: 1
  },
  {
    id: 'device-004',
    type: 'light',
    location: 'field-south',
    minValue: 500,
    maxValue: 10000,
    unit: 'lux',
    variability: 100
  },
  {
    id: 'device-005',
    type: 'co2',
    location: 'greenhouse',
    minValue: 350,
    maxValue: 1500,
    unit: 'ppm',
    variability: 10
  }
];

// Store last readings to create realistic changes
const lastReadings = new Map<string, number>();

// Simulate sensor data
export function simulateSensorReading(sensorId: string): SensorReading {
  const sensor = sensorConfigs.find(s => s.id === sensorId);
  
  if (!sensor) {
    // If sensor not found, create a default one
    const defaultSensor: SensorConfig = {
      id: sensorId,
      type: 'temperature',
      location: 'field-north',
      minValue: 15,
      maxValue: 35,
      unit: '°C',
      variability: 0.5
    };
    
    return generateReading(defaultSensor);
  }
  
  return generateReading(sensor);
}

// Generate a reading based on sensor config
function generateReading(sensor: SensorConfig): SensorReading {
  let value: number;
  
  if (lastReadings.has(sensor.id)) {
    // Generate a value that's relatively close to the last reading
    const lastValue = lastReadings.get(sensor.id)!;
    const change = (Math.random() * 2 - 1) * sensor.variability;
    value = Math.max(sensor.minValue, Math.min(sensor.maxValue, lastValue + change));
  } else {
    // First reading - generate a random value in range
    value = sensor.minValue + Math.random() * (sensor.maxValue - sensor.minValue);
  }
  
  // Round value to appropriate precision
  value = Number(value.toFixed(2));
  
  // Save this reading
  lastReadings.set(sensor.id, value);
  
  // Generate additional sensor-specific data
  const additionalData: Record<string, any> = {};
  
  // Add battery level
  additionalData.battery = Math.floor(70 + Math.random() * 30);
  
  // Add signal strength
  additionalData.signal = Math.floor(60 + Math.random() * 40);
  
  // For temperature, add humidity correlation
  if (sensor.type === 'temperature') {
    // Higher temperature, lower humidity (inverse relationship)
    const normalizedTemp = (value - sensor.minValue) / (sensor.maxValue - sensor.minValue);
    additionalData.humidity = Math.floor(80 - normalizedTemp * 30);
  }
  
  // For humidity, add dewpoint
  if (sensor.type === 'humidity') {
    additionalData.dewPoint = Math.floor(12 + Math.random() * 8);
  }
  
  // For soil moisture, add temperature
  if (sensor.type === 'soil-moisture') {
    additionalData.soilTemp = Math.floor(15 + Math.random() * 10);
  }
  
  // Combine all data
  const sensorData = {
    value,
    unit: sensor.unit,
    timestamp: Date.now(),
    ...additionalData
  };
  
  return {
    deviceId: sensor.id,
    timestamp: Date.now(),
    dataType: sensor.type,
    data: JSON.stringify(sensorData),
    location: sensor.location
  };
}

// Interface for real sensor connection
export interface SensorConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  readSensor(): Promise<SensorReading>;
}

// Real sensor implementation (placeholder - would need hardware-specific implementation)
export class ArduinoSensorConnection implements SensorConnection {
  private readonly sensorId: string;
  private port: any; // Would be SerialPort in real implementation
  
  constructor(sensorId: string) {
    this.sensorId = sensorId;
  }
  
  async connect(): Promise<void> {
    try {
      // In a real implementation, this would use Web Serial API or similar
      // Example with Web Serial API:
      if (typeof navigator !== 'undefined' && 'serial' in navigator) {
        this.port = await (navigator as any).serial.requestPort();
        await this.port.open({ baudRate: 9600 });
        console.log(`Connected to sensor ${this.sensorId}`);
      } else {
        throw new Error('Web Serial API not supported in this browser');
      }
    } catch (err) {
      console.error('Failed to connect to sensor:', err);
      throw err;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.port?.close) {
      await this.port.close();
      console.log(`Disconnected from sensor ${this.sensorId}`);
    }
  }
  
  async readSensor(): Promise<SensorReading> {
    // In a real implementation, this would read from the serial port
    // For example:
    /*
    const reader = this.port.readable.getReader();
    try {
      const { value, done } = await reader.read();
      if (done) {
        throw new Error('Serial port closed');
      }
      
      // Parse the incoming data (assuming a JSON format)
      const decoder = new TextDecoder();
      const data = decoder.decode(value);
      const parsedData = JSON.parse(data);
      
      return {
        deviceId: this.sensorId,
        timestamp: Date.now(),
        dataType: parsedData.type,
        data: JSON.stringify(parsedData),
        location: parsedData.location
      };
    } finally {
      reader.releaseLock();
    }
    */
    
    // For now, return simulated data
    return simulateSensorReading(this.sensorId);
  }
}

// Factory function to get appropriate sensor connection
export function getSensorConnection(sensorId: string): SensorConnection {
  // Check if real hardware is available
  if (typeof navigator !== 'undefined' && 'serial' in navigator) {
    return new ArduinoSensorConnection(sensorId);
  }
  
  // Fall back to simulation
  return {
    connect: async () => Promise.resolve(),
    disconnect: async () => Promise.resolve(),
    readSensor: async () => simulateSensorReading(sensorId)
  };
}