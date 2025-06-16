import React from "react";
import {
  FuncState,
  WalletData,
  ContractFileData,
  DeployedContract,
  LogData,
  ContractJsonData,
  ETHInputDataType,
} from "../Types";
import { AVAILABLE_NETWORKS, LOCAL_HOST_LINK } from "../Constants";
import {
  createPublicClient,
  createWalletClient,
  encodeDeployData,
  formatEther,
  http,
} from "viem";
import { anvil } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  showError,
  consoleLog,
  parseArgs,
  parseEthValue,
  buildDeploymentLog,
} from "../HelperFunc";
import { buildFunctionStatesFromABI } from "./HelperFunc";

// Type definitions for the handleDeploy function parameters
interface HandleDeployParams {
  ethInputData: ETHInputDataType;
  constructorInputs: FuncState | undefined;
  wallets: WalletData[];
  currentWallet: number;
  contractFileData: ContractFileData;
  currentContractJsonData: ContractJsonData | undefined;
  selectedNetwork: number;
  customNetworkUrl: string;
  // Setter functions
  setDeployedContract: React.Dispatch<React.SetStateAction<DeployedContract[]>>;
  setLogData: React.Dispatch<React.SetStateAction<LogData[]>>;
  setWallets: React.Dispatch<React.SetStateAction<WalletData[]>>;
}

export default async function handleDeploy({
  ethInputData,
  constructorInputs,
  wallets,
  currentWallet,
  contractFileData,
  currentContractJsonData,
  selectedNetwork,
  customNetworkUrl = "",
  setDeployedContract,
  setLogData,
  setWallets,
}: HandleDeployParams) {
  // Validate eth value
  if (currentContractJsonData === undefined) {
    showError(
      "Invalid Contract Json Data i.e. ABI, Bytecode and StorageLayout"
    );
    return;
  }
  if (BigInt(ethInputData.ethValue) < 0) {
    showError("Eth value cannot be negative");
    return;
  }

  if (
    AVAILABLE_NETWORKS[selectedNetwork].id === "custom" &&
    customNetworkUrl === ""
  ) {
    showError("Enter your rpc url");
    return;
  }
  // Check if constructor is non-payable but eth value is provided
  if (
    constructorInputs?.stateMutability === "nonpayable" &&
    BigInt(ethInputData.ethValue) > 0
  ) {
    showError("Non-payable constructor");
    return;
  }

  // Validate constructor inputs
  for (const input of constructorInputs?.inputs || []) {
    if (input.value === "") {
      showError(`Please fill the ${input.name} input`);
      return;
    }
  }

  const providerNetwork =
    AVAILABLE_NETWORKS[selectedNetwork].id === "custom"
      ? customNetworkUrl
      : LOCAL_HOST_LINK;

  const provider = createPublicClient({
    chain: anvil,
    transport: http(providerNetwork),
  });

  // Create wallet client
  const walletAccount = privateKeyToAccount(
    wallets[currentWallet].privateKey as `0x${string}`
  );
  const walletClient = createWalletClient({
    account: walletAccount,
    chain: anvil,
    transport: http(providerNetwork),
  });

  // Determine value based on constructor mutability
  const value =
    constructorInputs?.stateMutability === "payable"
      ? {
          value: parseEthValue(
            ethInputData.ethValue.toString(),
            ethInputData.ethFormat.toString()
          ),
        }
      : {
          value: 0n,
        };

  // Parse constructor arguments
  const args = parseArgs(constructorInputs?.inputs || []);

  // Validate parsed arguments
  if (args.length !== (constructorInputs?.inputs?.length || 0)) {
    // Error message is already shown while parsing
    return;
  }

  // Get current contract data

  // Encode deployment data
  const deployData = encodeDeployData({
    abi: currentContractJsonData.abi,
    bytecode: currentContractJsonData.bytecode,
    args: args,
  });

  try {
    // Send deployment transaction
    const hash = await walletClient.sendTransaction({
      value: value.value,
      data: deployData,
    });

    // Wait for transaction receipt
    const receipt = await provider.waitForTransactionReceipt({
      hash: hash,
      confirmations: 0,
    });

    // Update wallet balance if payable
    let _balance = "0.0";
    if (constructorInputs?.stateMutability === "payable") {
      setWallets((prevWallets) => {
        const updatedWallets = [...prevWallets];
        const current = updatedWallets[currentWallet];
        updatedWallets[currentWallet] = {
          ...current,
          balance:
            current.balance -
            Number(
              formatEther(
                parseEthValue(
                  ethInputData.ethValue.toString(),
                  ethInputData.ethFormat.toString()
                )
              )
            ), // subtract the sent amount
        };

        return updatedWallets;
      });
      _balance = formatEther(BigInt(value.value));
    }

    // Create new deployed contract object
    const newContract: DeployedContract = {
      name: contractFileData.contractName,
      address: receipt.contractAddress || "",
      functions: buildFunctionStatesFromABI(currentContractJsonData.abi),
      abi: currentContractJsonData.abi,
      storageLayout: currentContractJsonData.storageLayout,
      refreshTick: 0,
      balance: _balance,
    };

    // Update deployed contracts state
    setDeployedContract((prev) => [...prev, newContract]);

    // Build and add success log
    consoleLog("log building started");
    const log = buildDeploymentLog(
      true, // success
      wallets[currentWallet].publicKey,
      `${contractFileData.basename}:${contractFileData.contractName}.(constructor)`,
      value.value.toString(),
      deployData,
      args,
      currentContractJsonData.abi,
      receipt
    );

    if (log !== undefined) {
      setLogData((prev) => [...prev, log]);
    }
  } catch (err: any) {
    // Handle deployment error
    consoleLog(`deployment error : ${JSON.stringify(err, null, 2)}`);

    // Build and add error log
    const log = buildDeploymentLog(
      false, // failure
      wallets[currentWallet].publicKey,
      `${contractFileData.basename}:${contractFileData.contractName}.(constructor)`,
      value.value.toString(),
      deployData,
      args,
      currentContractJsonData.abi
    );

    if (log !== undefined) {
      setLogData((prev) => [...prev, log]);
    }

    return;
  }
}
