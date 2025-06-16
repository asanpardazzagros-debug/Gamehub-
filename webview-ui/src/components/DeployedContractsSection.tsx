import React from "react";
import {
  DeployedContract,
  ETHInputDataType,
  ContractFileData,
  LogData,
  WalletData,
} from "../../utils/Types";
import {
  VscodeTabPanel,
  VscodeTabs,
  VscodeButton,
  VscodeTextfield,
} from "@vscode-elements/react-elements";
import { TabHeader } from "./TabHeader";
import {
  handleCopy,
  updateInputValue,
} from "../../utils/stateHelper/HelperFunc";
import { MdOutlineContentCopy } from "react-icons/md";
import StorageLayout from "./StorageLayout";
import { handleFuncCall } from "../../utils/stateHelper/handleFuncCall";

type DeployedContractSectionProps = {
  deployedContracts: DeployedContract[];
  ethInputData: ETHInputDataType;
  wallets: WalletData[];
  currentWallet: number;
  contractFileData: ContractFileData;
  selectedNetwork: number;
  customNetworkUrl: string;
  setDeployedContract: React.Dispatch<React.SetStateAction<DeployedContract[]>>;
  setLogData: React.Dispatch<React.SetStateAction<LogData[]>>;
  setWallets: React.Dispatch<React.SetStateAction<WalletData[]>>;
};

const DeployedContractSection = ({
  deployedContracts,
  ethInputData,
  wallets,
  currentWallet,
  contractFileData,
  selectedNetwork,
  customNetworkUrl,
  setDeployedContract,
  setLogData,
  setWallets,
}: //   selectedNetwork,
//   customNetworkURL,
DeployedContractSectionProps) => {
  function handleCloseContractTab(indexToRemove: number) {
    setDeployedContract((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  }

  return (
    <VscodeTabs>
      {deployedContracts.map((contractData, contractIndex) => (
        <>
          <TabHeader
            title={contractData.name}
            handleClose={() => {
              handleCloseContractTab(contractIndex);
            }}
          />

          <VscodeTabPanel>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: "25%",
                  display: "flex",
                  paddingTop: "12px",
                  flexDirection: "column",
                  wordBreak: "break-all",
                }}
              >
                <div style={{ paddingRight: "12px" }}>
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
                    <MdOutlineContentCopy
                      style={{ marginLeft: "4px", cursor: "pointer" }}
                      onClick={() => handleCopy(contractData.address)}
                    />
                  </div>
                  <div
                    style={{ marginBottom: "12px" }}
                  >{`Balance : ${contractData.balance} ETH`}</div>
                </div>
                <div>
                  {contractData.functions.map((functionData, functionIndex) => (
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
                              : functionData.stateMutability === "nonpayable"
                              ? "#fc8330"
                              : undefined,
                          width: "100%",
                          boxSizing: "border-box",
                          marginBottom: "12px",
                        }}
                        onClick={() => {
                          handleFuncCall({
                            functionData: functionData,
                            contractAddress: contractData.address,
                            abi: contractData.abi,
                            contractIndex: contractIndex,
                            functionIndex: functionIndex,
                            ethInputData: ethInputData,
                            wallets: wallets,
                            currentWallet: currentWallet,
                            contractFileData: contractFileData,
                            selectedNetwork: selectedNetwork,
                            customNetworkUrl: customNetworkUrl,
                            setDeployedContract: setDeployedContract,
                            setLogData: setLogData,
                            setWallets: setWallets,
                          });
                        }}
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
                  ))}
                </div>
              </div>

              <div
                style={{
                  width: "75%",
                  borderLeft: "1px solid gray",
                  paddingTop: "12px",
                  paddingLeft: "12px",
                  marginLeft: "12px",
                }}
              >
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
  );
};

export default DeployedContractSection;
