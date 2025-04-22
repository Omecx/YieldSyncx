import { ethers, BrowserProvider, Contract } from 'ethers';
import type { NetworkConfig, FormattedSensorData } from '$lib/types';
import abi from '$lib/blockchain/contract-abi.json';
import { trigger } from './toastStore.svelte';
import { writable, derived, type Writable } from 'svelte/store';

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Role constants must match Solidity's keccak256("ROLE_NAME")
export const ADMIN_ROLE     = ethers.id('ADMIN_ROLE');
export const DEVICE_ROLE    = ethers.id('DEVICE_ROLE');
export const ANALYST_ROLE   = ethers.id('ANALYST_ROLE');

export const NETWORKS: Record<number, NetworkConfig> = {
  1284: { name: 'Moonbeam',      chainId:1284, rpcUrl:'https://rpc.api.moonbeam.network',     blockExplorerUrl:'https://moonscan.io',               isTestnet:false  },
  1287: { name: 'Moonbase Alpha',chainId:1287, rpcUrl:'https://rpc.api.moonbase.moonbeam.network', blockExplorerUrl:'https://moonbase.moonscan.io', isTestnet:true, wsRpcUrl:'wss://wss.api.moonbase.moonbeam.network' },
  1337: { name: 'Local Hardhat', chainId:1337, rpcUrl:'http://localhost:8545',             blockExplorerUrl:'',                                  isTestnet:true  }
};

const address = (await import('$lib/blockchain/contract-address.json')).address;

interface State {
  connected: boolean;
  loading:  boolean;
  error:    string | null;
  provider: BrowserProvider | null;
  signer:   ethers.Signer | null;
  contract: Contract        | null;
  account:  string;
  chainId:  number | null;
  network:  string | null;
  roles:    string[];
}

const initial: State = {
  connected: false,
  loading:  false,
  error:    null,
  provider: null,
  signer:   null,
  contract: null,
  account:  '',
  chainId:  null,
  network:  null,
  roles:    []
};

function createStore() {
  const { subscribe, update, set }: Writable<State> = writable(initial);

  // Helper to read current state
  function snapshot(): State {
    let s!: State;
    subscribe(v => (s = v))();
    return s;
  }

  // Reset entire store
  function reset() {
    set(initial);
    trigger({ message: 'Disconnected', background: 'preset-filled-info' });
  }

  // Connect wallet & contract
  async function connectWallet(): Promise<boolean> {
    update(s => ({ ...s, loading: true, error: null }));
    try {
      if (!window.ethereum) throw new Error('MetaMask not found');
      const [acct] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainHex = await window.ethereum.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainHex, 16);
      const netCfg = NETWORKS[chainId];
      if (!netCfg) throw new Error(`Unsupported network: ${chainId}`);

      const provider = new BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(address, abi, signer);

      // Listen for changes
      window.ethereum.on('accountsChanged', onAccountsChanged);
      window.ethereum.on('chainChanged',  _ => window.location.reload());

      update(s => ({
        ...s,
        connected: true,
        loading:   false,
        provider, signer, contract,
        account:  acct,
        chainId,  network: netCfg.name
      }));

      await refreshRoles();
      trigger({ message: `Connected: ${acct.slice(0,6)}…${acct.slice(-4)}`, background: 'preset-filled-success' });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      update(s => ({ ...s, loading:false, error: msg }));
      trigger({ message: msg, background: 'preset-filled-error' });
      return false;
    }
  }

  // On account change
  function onAccountsChanged(addrs: string[]) {
    if (!addrs.length) return disconnectWallet();
    update(s => ({ ...s, account: addrs[0] }));
    trigger({ message: `Account: ${addrs[0].slice(0,6)}…${addrs[0].slice(-4)}`, background: 'preset-filled-info' });
    refreshRoles();
  }

  // Disconnect & clean up
  function disconnectWallet() {
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', onAccountsChanged);
    }
    reset();
  }

  // Query on‑chain roles
  async function refreshRoles() {
    const { contract, account } = snapshot();
    if (!contract || !account) return;
    try {
      const [adm, dev, anl] = await Promise.all([
        contract.hasRole(ADMIN_ROLE,   account),
        contract.hasRole(DEVICE_ROLE,  account),
        contract.hasRole(ANALYST_ROLE, account)
      ]);
      const roles = [
        ...(adm ? ['ADMIN_ROLE'] : []),
        ...(dev ? ['DEVICE_ROLE'] : []),
        ...(anl ? ['ANALYST_ROLE'] : [])
      ];
      update(s => ({ ...s, roles }));
    } catch {}
  }

  //
  // === Contract wrappers ===
  //

  async function storeData(
    deviceId: string, data: string, dataType: string, location: string
  ): Promise<number> {
    update(s => ({ ...s, loading: true }));
    try {
      const { contract } = snapshot();
      if (!contract) throw new Error('Not connected');
      const tx = await contract.storeData(deviceId, data, dataType, location);
      const rec = await tx.wait();
      const id  = rec.events?.find(e => e.event === 'DataStored')?.args?.[0];
      trigger({ message: 'Data stored on-chain', background:'preset-filled-success' });
      return Number(id);
    } catch (err) {
      const msg = (err as Error).message || 'Error storing data';
      trigger({ message: msg, background:'preset-filled-error' });
      return -1;
    } finally {
      update(s => ({ ...s, loading:false }));
    }
  }

  async function createBatch(
    fromIndex: number, toIndex: number, merkleRoot: string, description: string
  ): Promise<string> {
    update(s => ({ ...s, loading: true }));
    try {
      const { contract } = snapshot();
      if (!contract) throw new Error('Not connected');
      const tx = await contract.createBatch(fromIndex, toIndex, merkleRoot, description);
      const rec = await tx.wait();
      const batchId = rec.events?.find(e => e.event === 'BatchCreated')?.args?.[0];
      trigger({ message: `Batch ${batchId} created`, background:'preset-filled-success' });
      return String(batchId);
    } catch (err) {
      const msg = (err as Error).message || 'Error creating batch';
      trigger({ message: msg, background:'preset-filled-error' });
      return '';
    } finally {
      update(s => ({ ...s, loading:false }));
    }
  }

  async function verifyRecord(id: number, merkleRoot: string, proof: string[]): Promise<boolean> {
    const { contract } = snapshot();
    if (!contract) throw new Error('Not connected');
    return contract.verifyRecord(id, merkleRoot, proof);
  }

  async function getData(id: number): Promise<FormattedSensorData | null> {
    const { contract } = snapshot();
    if (!contract) throw new Error('Not connected');
    const res = await contract.getData(id);
    return {
      id,
      deviceId:   res[0],
      timestamp:  new Date(Number(res[1]) * 1e3).toLocaleString(),
      sensorData: res[2],
      dataType:   res[3],
      location:   res[4],
      parsedData: (() => { try { return JSON.parse(res[2]); } catch { return null; } })()
    };
  }

  async function getRecordCount(): Promise<number> {
    const { contract } = snapshot();
    if (!contract) throw new Error('Not connected');
    return Number(await contract.getRecordCount());
  }

  async function getDeviceRecords(deviceId: string): Promise<number[]> {
    const { contract } = snapshot();
    if (!contract) throw new Error('Not connected');
    return (await contract.getDeviceRecords(deviceId)).map(Number);
  }

  async function getBatchCount(): Promise<number> {
    const { contract } = snapshot();
    if (!contract) throw new Error("Not connected");
    return Number(await contract.getBatchCount());
  }

  async function getBatchByIndex(index: number) {
    const { contract } = snapshot();
    if (!contract) throw new Error("Not connected");
    const [batchId, merkleRoot, from, to, ts, desc] =
      await contract.getBatchByIndex(index);
    return { batchId, merkleRoot, from, to, timestamp: Number(ts), description: desc };
  }

  async function getLatestDeviceData(deviceId: string) {
    const { contract } = snapshot();
    if (!contract) throw new Error("Not connected");
    const [idx, ts, data, type, loc] = await contract.getLatestDeviceData(deviceId);
    return { recordId: Number(idx), timestamp: Number(ts), data, dataType: type, location: loc };
  }

  async function getDeviceMetrics(
    deviceId: string,
    dataType: string,
    fromTs: number,
    toTs: number
  ) {
    const { contract } = snapshot();
    if (!contract) throw new Error("Not connected");
    const [count, firstTs, lastTs] = await contract.getDeviceMetrics(deviceId, dataType, fromTs, toTs);
    return { recordCount: Number(count), firstTimestamp: Number(firstTs), lastTimestamp: Number(lastTs) };
  }

  /** Role management wrappers **/
  async function grantDeviceRole(account: string) {
    const { contract } = snapshot();
    if (!contract) throw new Error("Not connected");
    const tx = await contract.grantDeviceRole(account);
    await tx.wait();
    await refreshRoles();
  }

  async function grantAnalystRole(account: string) {
    const { contract } = snapshot();
    if (!contract) throw new Error("Not connected");
    const tx = await contract.grantAnalystRole(account);
    await tx.wait();
    await refreshRoles();
  }

  async function revokeRole(role: string, account: string) {
    const { contract } = snapshot();
    if (!contract) throw new Error("Not connected");
    const tx = await contract.revokeRole(ethers.id(role), account);
    await tx.wait();
    await refreshRoles();
  }

  // Expose
  return {
    subscribe,
    connectWallet,
    disconnectWallet,
    storeData,
    createBatch,
    verifyRecord,
    getData,
    getRecordCount,
    getDeviceRecords,
    refreshRoles,
    getBatchCount,
    getBatchByIndex,
    getLatestDeviceData,
    getDeviceMetrics,
    grantDeviceRole,
    grantAnalystRole,
    revokeRole,
  };
}

export const blockchainStore = createStore();

// Role‐derived stores
export const isAdmin    = derived(blockchainStore, $c => $c.roles.includes('ADMIN_ROLE'));
export const isDevice   = derived(blockchainStore, $c => $c.roles.includes('DEVICE_ROLE'));
export const isAnalyst = derived(blockchainStore, $c => $c.roles.includes('ANALYST_ROLE'));
