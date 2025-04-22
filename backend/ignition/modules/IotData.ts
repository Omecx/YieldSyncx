import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Declare and export the module properly
const IoTDataModule = buildModule("IoTDataModule", (m) => {
  const iotData = m.contract("IoTData");
  return { iotData };
});

export default IoTDataModule;
