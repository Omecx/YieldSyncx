export const CONTRACT_ADDRESSES = {
    // Replace these with actual deployed addresses
    IOT_DATA: "0xD5ABbfa4CA26565C500fc613eCce6914B2C085EA",
    NFT_DATA: process.env.PUBLIC_NFT_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000",
    BRIDGE: process.env.PUBLIC_BRIDGE_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000"
  };
  
  export const NETWORK_CONFIG = {
    1287: {
      name: 'Moonbase Alpha',
      rpcUrl: 'https://rpc.api.moonbase.moonbeam.network',
      blockExplorerUrl: 'https://moonbase.moonscan.io',
      isTestnet: true
    }
  };