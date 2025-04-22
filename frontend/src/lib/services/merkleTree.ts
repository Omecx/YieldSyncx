import { ethers } from 'ethers';
import type { SensorData } from '$lib/types';

/**
 * Build Merkle layers from leaf hashes.
 */
function buildLayers(leaves: string[]): string[][] {
  const layers: string[][] = [leaves];
  while (layers.at(-1)!.length > 1) {
    const prev = layers.at(-1)!;
    const next: string[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      const left  = prev[i];
      const right = prev[i + 1] ?? left;
      // Pack and hash siblings
      next.push(
        ethers.solidityPackedKeccak256(
          ['bytes32','bytes32'],
          [left, right].sort() as [string,string]
        )
      );
    }
    layers.push(next);
  }
  return layers;
}

/**
 * Generate Merkle tree root & proofs.
 */
export function generateMerkleTree(records: SensorData[]) {
  if (!records.length) {
    throw new Error('No records for Merkle tree');
  }

  // Leaf = packed hash of each record
  const leaves = records.map(r =>
    ethers.solidityPackedKeccak256(
      ['string','uint256','string','string','string'],
      [r.deviceId, r.timestamp, r.data, r.dataType, r.location]
    )
  );

  const layers = buildLayers(leaves);
  const root   = layers.at(-1)![0];

  // Proof generation
  const proofs: Record<number,string[]> = {};
  leaves.forEach((leaf, idx) => {
    let proof: string[] = [];
    let index = idx;
    for (let i = 0; i < layers.length - 1; i++) {
      const layer = layers[i];
      const pairIndex = index ^ 1; // sibling
      if (pairIndex < layer.length) {
        proof.push(layer[pairIndex]);
      }
      index = Math.floor(index / 2);
    }
    proofs[idx] = proof;
  });

  return { merkleRoot: root, proofs };
}
