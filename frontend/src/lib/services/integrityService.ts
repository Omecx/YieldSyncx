import { ethers } from 'ethers';
import type { SensorData } from '$lib/types';

export class IntegrityChecker {
  private static async calculateDataHash(record: SensorData): Promise<string> {
    return ethers.solidityPackedKeccak256(
      ['string', 'uint256', 'string', 'string', 'string'],
      [record.deviceId, record.timestamp, record.data, record.dataType, record.location]
    );
  }

  static async verifyDataIntegrity(
    record: SensorData,
    expectedHash?: string
  ): Promise<boolean> {
    const calculatedHash = await this.calculateDataHash(record);
    
    if (expectedHash) {
      return calculatedHash === expectedHash;
    }
    
    return true; // For new records without expected hash
  }

  static async verifyBatchIntegrity(
    records: SensorData[],
    merkleRoot: string
  ): Promise<boolean> {
    const { merkleRoot: calculatedRoot } = MerkleTreeUtils.generateMerkleTree(records);
    return calculatedRoot === merkleRoot;
  }

  static async generateIntegrityReport(records: SensorData[]): Promise<{
    totalRecords: number;
    validRecords: number;
    corruptedRecords: number;
    details: Array<{
      recordId: number;
      error: string;
    }>;
  }> {
    const details: Array<{ recordId: number; error: string }> = [];
    let validRecords = 0;
    
    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];
        const hash = record.dataHash;
        
        if (hash) {
          const isValid = await this.verifyDataIntegrity(record, hash);
          if (isValid) {
            validRecords++;
          } else {
            details.push({
              recordId: i,
              error: 'Data integrity check failed'
            });
          }
        } else {
          validRecords++; // Count records without hash as valid
        }
      } catch (error) {
        details.push({
          recordId: i,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return {
      totalRecords: records.length,
      validRecords,
      corruptedRecords: records.length - validRecords,
      details
    };
  }
}