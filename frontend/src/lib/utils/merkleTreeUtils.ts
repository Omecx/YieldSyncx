// merkleTreeUtils.ts
import { ethers } from 'ethers';
import type { SensorData } from '$lib/types';

export class MerkleTreeUtils {
  static sortPairs(left: string, right: string): [string, string] {
    if (left < right) {
      return [left, right];
    }
    return [right, left];
  }

  static hashNode(left: string, right: string): string {
    const [sortedLeft, sortedRight] = this.sortPairs(left, right);
    return ethers.solidityPackedKeccak256(
      ['bytes32', 'bytes32'],
      [sortedLeft, sortedRight]
    );
  }

  static generateLeaves(records: SensorData[]): string[] {
    return records.map(record => 
      ethers.solidityPackedKeccak256(
        ['string', 'uint256', 'string', 'string', 'string'],
        [record.deviceId, record.timestamp, record.data, record.dataType, record.location]
      )
    );
  }

  static buildLayers(leaves: string[]): string[][] {
    if (leaves.length === 0) {
      throw new Error('No leaves provided');
    }

    const layers: string[][] = [leaves];
    
    while (layers[layers.length - 1].length > 1) {
      const currentLayer = layers[layers.length - 1];
      const nextLayer: string[] = [];
      
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = currentLayer[i + 1] || left;
        nextLayer.push(this.hashNode(left, right));
      }
      
      layers.push(nextLayer);
    }
    
    return layers;
  }

  static generateMerkleTree(records: SensorData[]) {
    const leaves = this.generateLeaves(records);
    const layers = this.buildLayers(leaves);
    const merkleRoot = layers[layers.length - 1][0];
    
    const proofs: Record<number, string[]> = {};
    
    leaves.forEach((leaf, index) => {
      let currentIndex = index;
      const proof: string[] = [];
      
      for (let i = 0; i < layers.length - 1; i++) {
        const layer = layers[i];
        const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
        
        if (siblingIndex < layer.length) {
          proof.push(layer[siblingIndex]);
        }
        
        currentIndex = Math.floor(currentIndex / 2);
      }
      
      proofs[index] = proof;
    });
    
    return { merkleRoot, proofs };
  }

  static verifyProof(leaf: string, proof: string[], root: string): boolean {
    let computedHash = leaf;
    
    for (const proofElement of proof) {
      computedHash = this.hashNode(computedHash, proofElement);
    }
    
    return computedHash === root;
  }
}