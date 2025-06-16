// contractFunctionHelper.ts

import {
  createWalletClient,
  http,
  encodeFunctionData,
  decodeFunctionResult,
  formatEther,
  createPublicClient,
} from "viem";
import { AVAILABLE_NETWORKS, LOCAL_HOST_LINK } from "../Constants";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";

import {
  ContractFileData,
  ETHInputDataType,
  FuncState,
  WalletData,
  LogData,
  DeployedContract,
  Output,
} from "../Types";
import {
  buildFunctionCallLogs,
  consoleLog,
  parseArgs,
  parseEthValue,
  showError,
} from "../HelperFunc";
import { stringifyWithBigInt, updateOutputValue } from "./HelperFunc";

interface FunctionCallParams {
  functionData: FuncState;
  contractAddress: string;
  abi: any;
  contractIndex: number;
  functionIndex: number;
  ethInputData: ETHInputDataType;
  wallets: WalletData[];
  currentWallet: number;
  contractFileData: ContractFileData;
  selectedNetwork: number;
  customNetworkUrl: string;
  setDeployedContract: React.Dispatch<React.SetStateAction<DeployedContract[]>>;
  setLogData: React.Dispatch<React.SetStateAction<LogData[]>>;
  setWallets: React.Dispatch<React.SetStateAction<WalletData[]>>;
}

export const handleFuncCall = async ({
  functionData,
  contractAddress,
  abi,
  contractIndex,
  functionIndex,
  ethInputData,
  wallets,
  currentWallet,
  contractFileData,
  selectedNetwork,
  customNetworkUrl,

  setDeployedContract,
  setLogData,
  setWallets,
}: FunctionCallParams) => {
  const { ethValue, ethFormat } = ethInputData;

  if (BigInt(ethValue) < 0n) {
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
  for (const input of functionData.inputs) {
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

  const isLowLevel = functionData.name === "low-level";
  const calldataHex = isLowLevel ? functionData.inputs[0].value.trim() : "";
  const value =
    functionData.stateMutability === "payable"
      ? { value: parseEthValue(ethValue.toString(), ethFormat.toString()) }
      : { value: 0n };

  // ====low level call i.e. fallback=====
  if (isLowLevel) {
    const isValidBytes = /^0x([0-9a-fA-F]{2})*$/.test(calldataHex);
    if (calldataHex.length % 2 !== 0 || !isValidBytes) {
      showError("Invalid bytes value");
      return;
    }

    try {
      const hash = await walletClient.sendTransaction({
        to: contractAddress as `0x${string}`,
        data: calldataHex as `0x${string}`,
        value: value.value,
      });

      const receipt = await provider.waitForTransactionReceipt({
        hash: hash,
        confirmations: 0,
      });

      updateWalletBalance({
        setWalletData: setWallets,
        currentWallet: currentWallet,
        ethInputData: ethInputData,
      });

      const log = buildFunctionCallLogs(
        true,
        wallets[currentWallet].publicKey,
        `${contractFileData.basename}:${contractFileData.contractName}.fallback()`,
        "fallback",
        calldataHex,
        [calldataHex],
        abi,
        value.value.toString(),
        contractAddress,
        undefined,
        receipt
      );

      if (log !== undefined) {
        setLogData((prev) => [...prev, log]);
      }

      setDeployedContract((prevContracts) =>
        prevContracts.map((contract) =>
          contract.address === contractAddress
            ? {
                ...contract,
                refreshTick: contract.refreshTick + 1,
                balance: formatEther(BigInt(value.value)),
              }
            : contract
        )
      );
    } catch (err: any) {
      consoleLog(`fallback call error: ${JSON.stringify(err, null, 2)}`);
      const log = buildFunctionCallLogs(
        false,
        wallets[currentWallet].publicKey,
        `${contractFileData.basename}:${contractFileData.contractName}.fallback()`,
        "fallback",
        calldataHex,
        [calldataHex],
        abi,
        value.value.toString(),
        contractAddress,
        err.data,
        undefined,
        err
      );
      if (log !== undefined) setLogData((prev) => [...prev, log]);
    }

    return;
  }

  const args = parseArgs(functionData.inputs);
  if (args.length !== functionData.inputs.length) return;

  if (
    functionData.stateMutability === "view" ||
    functionData.stateMutability === "pure"
  ) {
    try {
      const result = await provider.readContract({
        address: contractAddress as `0x${string}`,
        abi: abi,
        functionName: functionData.name,
        args: args,
        account: walletAccount,
      });

      if (!functionData.outputs) return;

      const resultArray = Array.isArray(result) ? result : [result];

      const newOutput: Output[] = functionData.outputs.map(
        (v: Output, i: number) => ({
          ...v,
          value: `${resultArray[i]}`,
        })
      );

      setDeployedContract((prev) =>
        updateOutputValue(prev, contractIndex, functionIndex, newOutput)
      );
    } catch (err) {
      consoleLog(`view function error: ${JSON.stringify(err, null, 2)}`);
    }
  } else {
    if (
      functionData.stateMutability === "nonpayable" &&
      BigInt(ethValue) > 0n
    ) {
      showError(`${functionData.name} is not payable function`);
      return;
    }

    const rawCallData = encodeFunctionData({
      abi,
      functionName: functionData.name,
      args: args,
    });
    try {
      let rawOutput: any = undefined;
      let decodedOutput: any = undefined;

      if (functionData.outputs && functionData.outputs.length > 0) {
        rawOutput = await provider.call({
          to: contractAddress as `0x${string}`,
          data: rawCallData,
          value: value.value,
          account: walletAccount,
        });

        decodedOutput = decodeFunctionResult({
          abi: abi,
          functionName: functionData.name,
          data: `${rawOutput.data}` as `0x${string}`,
        });
      }

      if (
        decodedOutput?.length > 0 &&
        functionData.outputs &&
        functionData.outputs.length > 0
      ) {
        let newOutput: Output[] = [];
        if (functionData.outputs.length === 1) {
          newOutput.push({
            ...functionData.outputs[0],
            value: `${decodedOutput}`,
          });
        } else {
          newOutput = functionData.outputs.map((v: Output, i) => ({
            ...v,
            value: `${decodedOutput[i]}`,
          }));
        }
        setDeployedContract((prev) =>
          updateOutputValue(prev, contractIndex, functionIndex, newOutput)
        );
      }

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: abi,
        functionName: functionData.name,
        args: args,
        value: value.value,
      });
      consoleLog(`hash: ${hash}`);
      const receipt = await provider.waitForTransactionReceipt({
        hash: hash,
        confirmations: 0,
      });
      consoleLog(`receipt: ${stringifyWithBigInt(receipt)}`);

      updateWalletBalance({
        setWalletData: setWallets,
        ethInputData: ethInputData,
        currentWallet: currentWallet,
      });

      const log = buildFunctionCallLogs(
        true,
        wallets[currentWallet].publicKey,
        `${contractFileData.basename}:${contractFileData.contractName}.${functionData.name}()`,
        functionData.name,
        rawCallData,
        args,
        abi,
        value.value.toString(),
        contractAddress,
        rawOutput !== undefined ? `${rawOutput?.data}` : undefined,
        receipt
      );

      if (log !== undefined) {
        setLogData((prev) => [...prev, log]);
      }

      setDeployedContract((prevContracts) =>
        prevContracts.map((contract) =>
          contract.address === contractAddress
            ? {
                ...contract,
                refreshTick: contract.refreshTick + 1,
                balance: formatEther(BigInt(value.value)),
              }
            : contract
        )
      );
    } catch (err: any) {
      consoleLog(`error: ${stringifyWithBigInt(err)}`);
      const log = buildFunctionCallLogs(
        false,
        wallets[currentWallet].publicKey,
        `${contractFileData.basename}:${contractFileData.contractName}.${functionData.name}()`,
        functionData.name,
        rawCallData,
        args,
        abi,
        value.value.toString(),
        contractAddress,
        undefined,
        undefined,
        err
      );

      if (log !== undefined) {
        setLogData((prev) => [...prev, log]);
      }
    }
  }
};

const updateWalletBalance = ({
  setWalletData,
  currentWallet,
  ethInputData,
}: {
  setWalletData: React.Dispatch<React.SetStateAction<WalletData[]>>;
  currentWallet: number;
  ethInputData: ETHInputDataType;
}) => {
  const { ethValue, ethFormat } = ethInputData;
  setWalletData((prevWallets) => {
    const updatedWallets = [...prevWallets];
    const current = updatedWallets[currentWallet];
    updatedWallets[currentWallet] = {
      ...current,
      balance:
        current.balance -
        Number(
          formatEther(parseEthValue(ethValue.toString(), ethFormat.toString()))
        ),
    };

    return updatedWallets;
  });
};
