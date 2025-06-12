import {
  VscodeButton,
  VscodeScrollable,
  VscodeTabHeader,
  VscodeTabPanel,
  VscodeTabs,
  VscodeTextfield,
} from "@vscode-elements/react-elements";

import "./App.css";
import { AnvilKeys } from "../utils/AnvilKeys";
import { useEffect, useState } from "react";
import { MessageId, ProjectType, Terminals } from "../../src/MessageId";
import {
  FuncState,
  DeployedContract,
  LogData,
  WalletData,
  Output,
  ContractFileData,
} from "../utils/Types";

import {
  parseArgs,
  parseEthValue,
  showError,
  consoleLog,
  buildDeploymentLog,
  buildFunctionCallLogs,
} from "../utils/HelperFunc";
import "@vscode/codicons/dist/codicon.css";
import StorageLayout from "./components/StorageLayout";

import {
  createPublicClient,
  createWalletClient,
  encodeDeployData,
  formatEther,
  http,
  isAddress,
  encodeFunctionData,
  decodeFunctionResult,
} from "viem";
import { anvil } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  buildInitialConstructorState,
  buildFunctionStatesFromABI,
  updateInputValue,
  stringifyWithBigInt,
  updateOutputValue,
  handleCopy,
} from "../utils/stateHelper/HelperFunc.ts";
import Network from "./components/Network.tsx";
import Wallets from "./components/Wallets.tsx";
import DeployableContracts from "./components/DeployableContracts.tsx";
import ETHInput, { ETHFormat } from "./components/EthInput.tsx";
import ConstructorInput from "./components/ConstructorInput.tsx";
import LogSection from "./components/LogSection.tsx";

declare function acquireVsCodeApi(): {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

// to check ui from browser
const isVSCode = typeof acquireVsCodeApi === "function";

export const vscode = isVSCode
  ? acquireVsCodeApi()
  : {
      postMessage: (msg: any) => {
        console.log("[Mock vscode.postMessage]", msg);
      },
    };

export let provider = createPublicClient({
  chain: anvil,
  transport: http("http://localhost:9545"),
});

function App() {
  const [currentWallet, setCurrentWallet] = useState(0);
  const [wallets, setWalletData] = useState<WalletData[]>(AnvilKeys);
  const [networkUrl, setNetworkUrl] = useState("http://localhost:9545");
  const [resetAnvil, setResetAnvil] = useState(0);
  provider = createPublicClient({
    transport: http(networkUrl),
  });

  const [pwd, setPwd] = useState();
  const [contractFiles, setContractFiles] = useState<ContractFileData[]>([]);
  const [currentContractFileIndex, setCurrentContractFileIndex] = useState(0);
  const [currentContractJsonData, setCurrentContractJsonData] =
    useState<any>(null);
  const [constructorInputs, setConstructorInputs] = useState<
    FuncState | undefined
  >(undefined);
  const [deployedContract, setDeployedContract] = useState<DeployedContract[]>(
    []
  );

  const [ethValue, setEthValue] = useState<string>("");
  const [ethFormat, setEthFormat] = useState<string>(
    ETHFormat[0].toUpperCase()
  );

  const [logData, setLogData] = useState<LogData[]>([]);
  const [atAddress, setAtAddress] = useState("");
  const [showCheck, setShowCheck] = useState(false);
  const [_, setProjectType] = useState(ProjectType.none);

  window.addEventListener("message", (event) => {
    const { id, data } = event.data;
    if (id === MessageId.getSolFiles) {
      setContractFiles(data);
    } else if (id === MessageId.getCurrentWorkingDirectory) {
      setPwd(data);
    } else if (id === MessageId.getAbi) {
      setCurrentContractJsonData(data);
      setConstructorInputs(buildInitialConstructorState(data.abi[0]));
    } else if (id === MessageId.buildCommandRunSuccess) {
      setShowCheck(true);
      setTimeout(() => setShowCheck(false), 3000);
      getAbiMessage();
    } else if (id === MessageId.getProjectType) {
      setProjectType(data);
    }
  });

  useEffect(() => {
    vscode.postMessage({
      id: MessageId.runBuildCommand,
    });
    vscode.postMessage({
      id: MessageId.getSolFiles,
    });
    vscode.postMessage({
      id: MessageId.getCurrentWorkingDirectory,
    });
    vscode.postMessage({
      id: MessageId.getProjectType,
    });
    getAbiMessage();
    vscode.postMessage({
      id: MessageId.createTerminal,
      data: Terminals.anvilTerminal,
    });
  }, []);

  useEffect(() => {
    getAbiMessage();
  }, [currentContractFileIndex, pwd]);

  const getAbiMessage = () => {
    if (pwd === undefined) return;

    vscode.postMessage({
      id: MessageId.getAbi,
      data:
        pwd +
        "/out/" +
        contractFiles[currentContractFileIndex].basename +
        "/" +
        contractFiles[currentContractFileIndex].contractName +
        ".json",
    });
  };

  function handleInputChange(index: number, value: string) {
    setConstructorInputs((prevState: FuncState | undefined) => {
      if (!prevState) return prevState;
      const updatedInputs = prevState.inputs.map((input, idx) =>
        idx === index ? { ...input, value } : input
      );
      return {
        ...prevState,
        inputs: updatedInputs,
      };
    });
  }

  async function getBalances(address: string): Promise<string> {
    const balance = await provider.getBalance({
      address: address as `0x${string}`,
    });
    return formatEther(balance);
  }

  async function handleDeploy() {
    if (pwd === undefined) {
      return;
    } else {
      if (BigInt(ethValue) < 0) {
        showError("Eth value cannot be negative");
        return;
      }
      if (
        constructorInputs?.stateMutability === "nonpayable" &&
        BigInt(ethValue) > 0
      ) {
        showError("Non-payable constructor");
        return;
      }

      for (const input of constructorInputs?.inputs || []) {
        if (input.value === "") {
          showError(`Please fill the ${input.name} input`);
          return;
        }
      }

      const walletAccount = privateKeyToAccount(
        wallets[currentWallet].privateKey as `0x${string}`
      );
      const walletClient = createWalletClient({
        account: walletAccount,
        chain: anvil,
        transport: http("http://localhost:9545"),
      });

      const value =
        constructorInputs?.stateMutability === "payable"
          ? {
              value: parseEthValue(ethValue, ethFormat),
            }
          : {
              value: 0n,
            };

      const args = parseArgs(constructorInputs?.inputs || []);

      // failed to parse the constructor args
      if (args.length !== (constructorInputs?.inputs?.length || 0)) {
        //no need to show the error message here, as error message is already shown while parsing
        return;
      }

      const currentContractData = contractFiles[currentContractFileIndex];
      const deployData = encodeDeployData({
        abi: currentContractJsonData.abi,
        bytecode: currentContractJsonData.bytecode.object,
        args: args,
      });

      try {
        const hash = await walletClient.sendTransaction({
          value: value.value,
          data: deployData,
        });
        const receipt = await provider.waitForTransactionReceipt({
          hash: hash,
          confirmations: 0,
        });

        let _balance = "0.0";
        if (constructorInputs?.stateMutability === "payable") {
          updateWalletBalance();
          _balance = formatEther(BigInt(value.value));
        }

        const newContract: DeployedContract = {
          name: contractFiles[currentContractFileIndex].contractName,
          address: receipt.contractAddress || "",
          functions: buildFunctionStatesFromABI(currentContractJsonData.abi),
          abi: currentContractJsonData.abi,
          storageLayout: currentContractJsonData.storageLayout,
          refreshTick: 0,
          balance: _balance,
        };
        setDeployedContract((prev) => [...prev, newContract]);
        consoleLog("log building started");
        const log = buildDeploymentLog(
          true,
          wallets[currentWallet].publicKey,
          `${currentContractData.basename}:${currentContractData.contractName}.(constructor)`,
          value.value.toString(),
          deployData,
          args,
          currentContractJsonData.abi,
          receipt
        );
        if (log !== undefined) setLogData((prev) => [...prev, log]);
      } catch (err: any) {
        consoleLog(`deployment error : ${JSON.stringify(err, null, 2)}`);
        const log = buildDeploymentLog(
          false,
          wallets[currentWallet].publicKey,
          `${currentContractData.basename}:${currentContractData.contractName}.(constructor)`,
          value.value.toString(),
          deployData,
          args,
          currentContractJsonData.abi
        );
        if (log !== undefined) setLogData((prev) => [...prev, log]);
        return;
      }
    }
  }

  async function handleFunctionCall(
    functionData: FuncState,
    contractAddress: string,
    abi: any,
    contractIndex: number,
    functionIndex: number
  ) {
    if (BigInt(ethValue) < 0n) {
      showError("Eth value cannot be negative");
      return;
    }

    for (const input of functionData.inputs) {
      if (input.value === "") {
        showError(`Please fill the ${input.name} input`);
        return;
      }
    }

    const walletAccount = privateKeyToAccount(
      wallets[currentWallet].privateKey as `0x${string}`
    );
    const walletClient = createWalletClient({
      account: walletAccount,
      chain: anvil,
      transport: http("http://localhost:9545"),
    });

    const currentContractData = contractFiles[currentContractFileIndex];

    // === Fallback Handling ===
    const isLowLevel = functionData.name === "low-level";
    const calldataHex = isLowLevel ? functionData.inputs[0].value.trim() : "";

    const value =
      functionData.stateMutability === "payable"
        ? { value: parseEthValue(ethValue, ethFormat) }
        : { value: 0n };

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

        updateWalletBalance();

        const log = buildFunctionCallLogs(
          true,
          wallets[currentWallet].publicKey,
          `${currentContractData.basename}:${currentContractData.contractName}.fallback()`,
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
          `${currentContractData.basename}:${currentContractData.contractName}.fallback()`,
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

    // === Normal Function Handling ===
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

        updateWalletBalance();

        const log = buildFunctionCallLogs(
          true,
          wallets[currentWallet].publicKey,
          `${currentContractData.basename}:${currentContractData.contractName}.${functionData.name}()`,
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
          `${currentContractData.basename}:${currentContractData.contractName}.${functionData.name}()`,
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
  }

  function handleCloseContractTab(indexToRemove: number) {
    setDeployedContract((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  }

  const updateWalletBalance = () => {
    setWalletData((prevWallets) => {
      const updatedWallets = [...prevWallets];
      const current = updatedWallets[currentWallet];
      updatedWallets[currentWallet] = {
        ...current,
        balance:
          current.balance -
          Number(formatEther(parseEthValue(ethValue, ethFormat))), // subtract the sent amount
      };

      return updatedWallets;
    });
  };

  const handleAtAddress = async () => {
    if (atAddress === "") {
      showError("Enter the contract address");
      return;
    } else if (!isAddress(atAddress)) {
      showError(`${atAddress} is not a valid contract address.`);
      return;
    }

    let _balance = await getBalances(atAddress);
    const newContract: DeployedContract = {
      name: contractFiles[currentContractFileIndex].contractName,
      address: atAddress,
      functions: buildFunctionStatesFromABI(currentContractJsonData.abi),
      abi: currentContractJsonData.abi,
      storageLayout: currentContractJsonData.storageLayout,
      refreshTick: 0,
      balance: _balance,
    };

    setDeployedContract((prev) => [...prev, newContract]);

    setDeployedContract((prevContracts) =>
      prevContracts.map((contract) =>
        contract.address === atAddress
          ? {
              ...contract,
              refreshTick: contract.refreshTick + 1,
            }
          : contract
      )
    );
  };

  return (
    <div>
      <div
        style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
      >
        <h1>SlotMatrix</h1>
        {showCheck && (
          <div className="green-check">
            <i
              className="codicon codicon-check-all"
              style={{
                color: "white",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            ></i>
          </div>
        )}
      </div>

      <p>Code. Deploy. Inspect. All in One Matrix.</p>

      {/* deployment and logs  */}
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "row",
        }}
      >
        <VscodeScrollable
          style={{ width: "25%", paddingRight: "12px", height: "500px" }}
        >
          {/* network  */}
          <Network updateRpcUrl={setNetworkUrl} resetAnvil={resetAnvil} />
          {/* wallets  */}
          <Wallets
            wallets={wallets}
            currentWallet={currentWallet}
            updateCurrentWallet={setCurrentWallet}
          />

          {/* deployable contract  */}
          <DeployableContracts
            contractFiles={contractFiles}
            updateSelectedContractIndex={setCurrentContractFileIndex}
          />

          {/* eth value  */}
          <ETHInput
            ethValue={ethValue}
            updateETHFormat={setEthFormat}
            updateETHValue={setEthValue}
          />

          {/* constructor inputs */}
          <ConstructorInput
            constructorAbiFormat={constructorInputs}
            handleInputChange={handleInputChange}
          />
          {/* deploy button */}

          <VscodeButton
            onClick={() => {
              handleDeploy();
            }}
            style={{
              backgroundColor:
                constructorInputs?.stateMutability === "payable"
                  ? "#cb0303"
                  : undefined,
              width: "100%",
              boxSizing: "border-box",
              marginBottom: "12px",
            }}
          >
            Deploy
          </VscodeButton>

          {/* At address  */}
          <VscodeTextfield
            value={atAddress}
            placeholder="Load contract from address"
            onChange={(event) => {
              setAtAddress((event.target as HTMLInputElement).value);
            }}
            style={{ marginBottom: "12px", width: "100%" }}
          />
          <VscodeButton
            onClick={handleAtAddress}
            style={{ width: "100%", boxSizing: "border-box" }}
          >
            At Address
          </VscodeButton>
        </VscodeScrollable>

        <LogSection
          logData={logData}
          resetLogs={() => setLogData([])}
          resetDeployedContract={() => setDeployedContract([])}
          resetWallets={() => {
            setWalletData(AnvilKeys);
            setResetAnvil(resetAnvil + 1);
          }}
        />
      </div>

      {/* functions of contract and interactions  */}
      <VscodeTabs>
        {deployedContract.map((contractData, contractIndex) => (
          <>
            <VscodeTabHeader>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <div>{contractData.name}</div>
                <div
                  className="icon"
                  style={{ paddingTop: "4px", cursor: "pointer" }}
                  onClick={() => handleCloseContractTab(contractIndex)}
                >
                  <i className="codicon codicon-close icon"></i>
                </div>
              </div>
            </VscodeTabHeader>
            <VscodeTabPanel>
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "row",
                  marginTop: "32px",
                }}
              >
                <div style={{ width: "25%", paddingRight: "12px" }}>
                  {/* function interaction  */}
                  <div className="heading">Contract Interaction</div>
                  <div
                    style={{
                      marginBottom: "4px",
                      display: "flex",
                      flexDirection: "row",
                    }}
                  >
                    <div>
                      {`Address : ${contractData.address.slice(
                        0,
                        6
                      )}...${contractData.address.slice(-6)}`}
                    </div>
                    <div
                      className="icon "
                      style={{ marginLeft: "4px", cursor: "pointer" }}
                      onClick={() => handleCopy(contractData.address)}
                    >
                      <i className="codicon codicon-copy icon"></i>
                    </div>
                  </div>

                  <div
                    style={{ marginBottom: "12px" }}
                  >{`Balance : ${contractData.balance} ETH`}</div>

                  <div>
                    {contractData.functions.map(
                      (functionData, functionIndex) => (
                        <div key={functionIndex}>
                          <div>
                            {functionData.inputs.map((input, inputIndex) => (
                              <div key={inputIndex}>
                                {input.name !== "" && (
                                  <div style={{ marginBottom: "4px" }}>
                                    {input.name} :
                                  </div>
                                )}
                                <VscodeTextfield
                                  value={input.value}
                                  style={{
                                    marginBottom: "12px",
                                    width: "100%",
                                  }}
                                  placeholder={input.type}
                                  onChange={(event) => {
                                    const newValue = (
                                      event.target as HTMLInputElement
                                    ).value;
                                    setDeployedContract((prev) =>
                                      updateInputValue(
                                        prev,
                                        contractIndex,
                                        functionIndex,
                                        inputIndex,
                                        newValue
                                      )
                                    );
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                          <VscodeButton
                            style={{
                              backgroundColor:
                                functionData.stateMutability === "payable"
                                  ? "#cb0303"
                                  : functionData.stateMutability ===
                                    "nonpayable"
                                  ? "#fc8330"
                                  : undefined,
                              width: "100%",
                              boxSizing: "border-box",
                              marginBottom: "12px",
                            }}
                            onClick={() =>
                              handleFunctionCall(
                                functionData,
                                contractData.address,
                                contractData.abi,
                                contractIndex,
                                functionIndex
                              )
                            }
                          >
                            {functionData.name}
                          </VscodeButton>
                          {functionData.outputs &&
                            functionData.outputs.every(
                              (output) => output.value !== ""
                            ) && (
                              <div
                                style={{
                                  marginBottom: "12px",
                                  maxWidth: "25vw",
                                }}
                              >
                                {functionData.outputs.map((output, index) => {
                                  const label = output.name?.trim()
                                    ? `${index} ${output.type} ${output.name}`
                                    : `${index} ${output.type}`;

                                  return (
                                    <div
                                      key={index}
                                      style={{
                                        display: "flex",
                                        gap: "4px",
                                        flexDirection: "row",
                                        alignItems: "flex-start",
                                        wordBreak: "break-word",
                                        overflowWrap: "break-word",
                                        whiteSpace: "normal",
                                      }}
                                    >
                                      <span
                                        style={{
                                          wordBreak: "break-word",
                                          overflowWrap: "break-word",
                                        }}
                                      >
                                        {label} : "{output.value}"
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div
                  style={{
                    width: "75%",
                    borderLeft: "1px solid gray",
                    paddingLeft: "12px",
                  }}
                >
                  {/* storage layout  */}
                  <div className="heading">Storage Layout</div>
                  <StorageLayout
                    storageLayout={contractData.storageLayout}
                    refreshTick={contractData.refreshTick}
                    contractAddress={contractData.address}
                  />
                </div>
              </div>
            </VscodeTabPanel>
          </>
        ))}
      </VscodeTabs>
    </div>
  );
}

export default App;
