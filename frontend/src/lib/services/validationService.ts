import { ethers } from 'ethers';
import type { SensorReading } from '$lib/types';

interface ValidationRule {
  field: string;
  validator: (value: any) => boolean;
  errorMessage: string;
}

interface ValidationSchema {
  [dataType: string]: ValidationRule[];
}

export class DataValidator {
  private static readonly schemas: ValidationSchema = {
    temperature: [
      {
        field: 'value',
        validator: (value) => typeof value === 'number' && value >= -50 && value <= 100,
        errorMessage: 'Temperature must be between -50°C and 100°C'
      },
      {
        field: 'unit',
        validator: (value) => ['°C', '°F', 'K'].includes(value),
        errorMessage: 'Invalid temperature unit'
      }
    ],
    humidity: [
      {
        field: 'value',
        validator: (value) => typeof value === 'number' && value >= 0 && value <= 100,
        errorMessage: 'Humidity must be between 0% and 100%'
      }
    ],
    'soil-moisture': [
      {
        field: 'value',
        validator: (value) => typeof value === 'number' && value >= 0 && value <= 100,
        errorMessage: 'Soil moisture must be between 0% and 100%'
      }
    ]
  };

  static validateSensorReading(reading: SensorReading): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Basic structure validation
    if (!reading.deviceId) errors.push('Device ID is required');
    if (!reading.timestamp) errors.push('Timestamp is required');
    if (!reading.dataType) errors.push('Data type is required');
    if (!reading.location) errors.push('Location is required');
    
    // Parse data if it's a string
    let parsedData: any;
    try {
      parsedData = typeof reading.data === 'string' 
        ? JSON.parse(reading.data) 
        : reading.data;
    } catch (error) {
      errors.push('Invalid data format: must be valid JSON');
      return { isValid: false, errors };
    }
    
    // Apply schema validation
    const schema = this.schemas[reading.dataType];
    if (schema) {
      for (const rule of schema) {
        const value = parsedData[rule.field];
        if (!rule.validator(value)) {
          errors.push(rule.errorMessage);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateBatch(readings: SensorReading[]): {
    isValid: boolean;
    errors: Map<number, string[]>;
  } {
    const errors = new Map<number, string[]>();
    let isValid = true;
    
    readings.forEach((reading, index) => {
      const result = this.validateSensorReading(reading);
      if (!result.isValid) {
        isValid = false;
        errors.set(index, result.errors);
      }
    });
    
    return { isValid, errors };
  }
}