export const ANVIL_PROT = 9545;
export const LOCAL_HOST_LINK = `http://localhost:${ANVIL_PROT}`;

export const AVAILABLE_NETWORKS = [
  {
    id: "prague",
    name: "Anvil Prague (Default)",
  },
  { id: "cancun", name: "Anvil Cancun" },
  {
    id: "fork",
    name: "Mainnet Fork",
  },
  //TODO need to add custom network
  // {
  //   id: "custom",
  //   name: "Custom rpc URL",
  // },
];

export const ETH_FORMATS = ["wei", "gwei", "finney", "ether"];
