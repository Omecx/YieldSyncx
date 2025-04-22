import type { SensorReading, AnomalyReport, SensorThresholds } from '$lib/types';

/**
 * Anomaly detection service for agricultural sensor data
 * Identifies potential issues in environmental readings
 */

// Default thresholds for different sensor types
const DEFAULT_THRESHOLDS: Record<string, SensorThresholds> = {
  'temperature': {
    min: 5,
    max: 40,
    rateOfChangeWarning: 5, // °C per hour
    rateOfChangeAlert: 10,  // °C per hour
    normalRange: [15, 30]
  },
  'humidity': {
    min: 20,
    max: 95,
    rateOfChangeWarning: 15, // % per hour
    rateOfChangeAlert: 30,   // % per hour
    normalRange: [40, 80]
  },
  'soil-moisture': {
    min: 10,
    max: 100,
    rateOfChangeWarning: 20, // % per hour
    rateOfChangeAlert: 40,   // % per hour
    normalRange: [30, 70]
  },
  'light': {
    min: 0,
    max: 100000,
    rateOfChangeWarning: 20000, // lux per hour
    rateOfChangeAlert: 50000,   // lux per hour
    normalRange: [500, 10000]
  },
  'co2': {
    min: 300,
    max: 5000,
    rateOfChangeWarning: 500, // ppm per hour
    rateOfChangeAlert: 1000,  // ppm per hour
    normalRange: [400, 1200]
  }
};

// Cache for historical readings to detect rate of change
const historicalReadings: Record<string, SensorReading[]> = {};

/**
 * Maximum number of historical readings to keep per device/sensor type
 */
const MAX_HISTORY_SIZE = 100;

/**
 * Detect anomalies in a sensor reading
 * @param reading Current sensor reading
 * @param customThresholds Optional custom thresholds
 * @returns Anomaly report if issues detected, null otherwise
 */
export function detectAnomaly(
  reading: SensorReading,
  customThresholds?: Partial<SensorThresholds>
): AnomalyReport | null {
  try {
    // Get default thresholds for this sensor type
    const baseThresholds = DEFAULT_THRESHOLDS[reading.dataType] || DEFAULT_THRESHOLDS.temperature;
    
    // Merge with any custom thresholds
    const thresholds = { ...baseThresholds, ...customThresholds };
    
    // Parse the sensor data
    const parsedData = typeof reading.data === 'string' 
      ? JSON.parse(reading.data) 
      : reading.data;
    
    // Extract the value
    const value = parsedData.value !== undefined 
      ? parsedData.value 
      : parsedData[reading.dataType] || 0;
    
    // Initialize detection results
    const anomalies = [];
    let severity = 'info';
    
    // Check for out-of-bounds values
    if (value < thresholds.min) {
      anomalies.push({
        type: 'below_minimum',
        message: `Value ${value} is below minimum threshold of ${thresholds.min}`,
        threshold: thresholds.min,
        actual: value
      });
      severity = 'error';
    } else if (value > thresholds.max) {
      anomalies.push({
        type: 'above_maximum',
        message: `Value ${value} is above maximum threshold of ${thresholds.max}`,
        threshold: thresholds.max,
        actual: value
      });
      severity = 'error';
    } else if (value < thresholds.normalRange[0]) {
      anomalies.push({
        type: 'below_normal',
        message: `Value ${value} is below normal range of ${thresholds.normalRange[0]}`,
        threshold: thresholds.normalRange[0],
        actual: value
      });
      severity = 'warning';
    } else if (value > thresholds.normalRange[1]) {
      anomalies.push({
        type: 'above_normal',
        message: `Value ${value} is above normal range of ${thresholds.normalRange[1]}`,
        threshold: thresholds.normalRange[1],
        actual: value
      });
      severity = 'warning';
    }
    
    // Check rate of change (if historical data exists)
    const deviceKey = `${reading.deviceId}-${reading.dataType}`;
    
    // Store the current reading in history
    if (!historicalReadings[deviceKey]) {
      historicalReadings[deviceKey] = [];
    }
    
    // Add to history
    historicalReadings[deviceKey].push({
      ...reading,
      data: typeof reading.data === 'string' ? reading.data : JSON.stringify(reading.data)
    });
    
    // Limit history size
    if (historicalReadings[deviceKey].length > MAX_HISTORY_SIZE) {
      historicalReadings[deviceKey] = historicalReadings[deviceKey].slice(-MAX_HISTORY_SIZE);
    }
    
    // Need at least two readings to calculate rate of change
    if (historicalReadings[deviceKey].length > 1) {
      const previous = historicalReadings[deviceKey][historicalReadings[deviceKey].length - 2];
      const prevData = typeof previous.data === 'string' 
        ? JSON.parse(previous.data) 
        : previous.data;
      
      const prevValue = prevData.value !== undefined 
        ? prevData.value 
        : prevData[previous.dataType] || 0;
      
      const timeDiffHours = (reading.timestamp - previous.timestamp) / (1000 * 60 * 60);
      
      if (timeDiffHours > 0) {
        const changeRate = Math.abs(value - prevValue) / timeDiffHours;
        
        if (changeRate > thresholds.rateOfChangeAlert) {
          anomalies.push({
            type: 'rapid_change',
            message: `Rapid change of ${changeRate.toFixed(2)} per hour exceeds alert threshold`,
            threshold: thresholds.rateOfChangeAlert,
            actual: changeRate
          });
          severity = severity === 'info' ? 'error' : severity;
        } else if (changeRate > thresholds.rateOfChangeWarning) {
          anomalies.push({
            type: 'fast_change',
            message: `Fast change of ${changeRate.toFixed(2)} per hour exceeds warning threshold`,
            threshold: thresholds.rateOfChangeWarning,
            actual: changeRate
          });
          severity = severity === 'info' ? 'warning' : severity;
        }
      }
    }
    
    // Return null if no anomalies found
    if (anomalies.length === 0) {
      return null;
    }
    
    // Return anomaly report
    return {
      deviceId: reading.deviceId,
      dataType: reading.dataType,
      timestamp: reading.timestamp,
      location: reading.location,
      value: value,
      anomalies,
      severity
    };
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    
    // Return a parsing error anomaly
    return {
      deviceId: reading.deviceId,
      dataType: reading.dataType,
      timestamp: reading.timestamp,
      location: reading.location,
      value: 0,
      anomalies: [
        {
          type: 'parsing_error',
          message: 'Failed to parse sensor data',
          actual: reading.data
        }
      ],
      severity: 'error'
    };
  }
}

/**
 * Process a batch of sensor readings for anomalies
 * @param readings Array of sensor readings
 * @param customThresholds Optional custom thresholds
 * @returns Array of anomaly reports
 */
export function detectBatchAnomalies(
  readings: SensorReading[],
  customThresholds?: Record<string, Partial<SensorThresholds>>
): AnomalyReport[] {
  const anomalies: AnomalyReport[] = [];
  
  for (const reading of readings) {
    const thresholds = customThresholds?.[reading.dataType];
    const anomaly = detectAnomaly(reading, thresholds);
    
    if (anomaly) {
      anomalies.push(anomaly);
    }
  }
  
  return anomalies;
}

/**
 * Check if an anomaly requires immediate attention
 * @param anomaly Anomaly report to check
 * @returns True if urgent attention needed
 */
export function isUrgentAnomaly(anomaly: AnomalyReport): boolean {
  return anomaly.severity === 'error' ||
    anomaly.anomalies.some(a => 
      a.type === 'below_minimum' || 
      a.type === 'above_maximum' || 
      a.type === 'rapid_change'
    );
}

/**
 * Get suggested actions for an anomaly
 * @param anomaly Anomaly to get actions for
 * @returns Array of suggested actions
 */
export function getSuggestedActions(anomaly: AnomalyReport): string[] {
  const actions: string[] = [];
  
  switch (anomaly.dataType) {
    case 'temperature':
      if (anomaly.anomalies.some(a => a.type === 'above_maximum' || a.type === 'above_normal')) {
        actions.push('Increase ventilation');
        actions.push('Provide shade/cooling');
      } else if (anomaly.anomalies.some(a => a.type === 'below_minimum' || a.type === 'below_normal')) {
        actions.push('Increase heating');
        actions.push('Check greenhouse insulation');
      }
      break;
      
    case 'humidity':
      if (anomaly.anomalies.some(a => a.type === 'above_maximum' || a.type === 'above_normal')) {
        actions.push('Increase ventilation');
        actions.push('Reduce watering frequency');
      } else if (anomaly.anomalies.some(a => a.type === 'below_minimum' || a.type === 'below_normal')) {
        actions.push('Use humidifier or water misting');
        actions.push('Check for air leaks');
      }
      break;
      
    case 'soil-moisture':
      if (anomaly.anomalies.some(a => a.type === 'above_maximum' || a.type === 'above_normal')) {
        actions.push('Check for irrigation system malfunction');
        actions.push('Improve drainage');
      } else if (anomaly.anomalies.some(a => a.type === 'below_minimum' || a.type === 'below_normal')) {
        actions.push('Increase irrigation');
        actions.push('Check if irrigation system is working properly');
      }
      break;
      
    case 'light':
      if (anomaly.anomalies.some(a => a.type === 'above_maximum' || a.type === 'above_normal')) {
        actions.push('Provide shade protection');
        actions.push('Adjust grow light settings');
      } else if (anomaly.anomalies.some(a => a.type === 'below_minimum' || a.type === 'below_normal')) {
        actions.push('Supplement with artificial lighting');
        actions.push('Remove obstructions to natural light');
      }
      break;
      
    case 'co2':
      if (anomaly.anomalies.some(a => a.type === 'above_maximum' || a.type === 'above_normal')) {
        actions.push('Increase ventilation immediately');
        actions.push('Check CO₂ enrichment systems for malfunctions');
      } else if (anomaly.anomalies.some(a => a.type === 'below_minimum' || a.type === 'below_normal')) {
        actions.push('Check CO₂ supplementation system');
        actions.push('Ensure adequate air circulation');
      }
      break;
  }
  
  // Add general actions for all anomalies
  if (anomaly.anomalies.some(a => a.type === 'rapid_change' || a.type === 'fast_change')) {
    actions.push('Investigate sudden environmental changes');
    actions.push('Check sensor calibration');
  }
  
  if (anomaly.anomalies.some(a => a.type === 'parsing_error')) {
    actions.push('Check sensor hardware for malfunctions');
    actions.push('Verify data transmission system');
  }
  
  return actions;
}