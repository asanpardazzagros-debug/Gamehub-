import { useEffect, useState } from "react";
import { MessageId, ProjectType } from "../../src/MessageId";

import Header from "./components/Header";
import ProjectTypeNone from "./components/ProjectTypeNone";
import {
  ContractFileData,
  ContractJsonData,
  DeployedContract,
  ETHInputDataType,
  FuncState,
  LogData,
  WalletData,
} from "../utils/Types";
import SolFileDrop from "./components/SolFilesDrop";
import {
  buildFunctionStatesFromABI,
  buildInitialConstructorState,
} from "../utils/stateHelper/HelperFunc";
import ConstructorInput from "./components/ConstructorInput";
import { AnvilKeys } from "../utils/AnvilKeys";
import Wallets from "./components/Wallets";
import AtAddress from "./components/AtAddress";
import FoundryInstallMessage from "./components/FoundryInstallMessage";
import Networks from "./components/Networks";
import ETHInput from "./components/EthInput";
import { VscodeScrollable } from "@vscode-elements/react-elements";
import DeployButton from "./components/DeployButton";
import LogSection from "./components/LogSection";
import handleDeploy from "../utils/stateHelper/handleDeploy";
import { consoleLog, showError } from "../utils/HelperFunc";
import DeployedContractSection from "./components/DeployedContractsSection";
import { createPublicClient, formatEther, http, isAddress } from "viem";
import { anvil } from "viem/chains";
import { LOCAL_HOST_LINK } from "../utils/Constants";

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

/**
 *
 *  @dev All state variables will be managed in this file.
 * However, using state management tools like Redux can sometimes
 * impact application performance.
 *
 */

const App = () => {
  const [projectType, setProjectType] = useState(ProjectType.none);
  const [isFoundryInstalled, setIsFoundryInstalled] = useState(false);
  const [pwd, setPwd] = useState("/");
  const [showCheck, setShowCheck] = useState(false);
  const [solFiles, setSolFiles] = useState<ContractFileData[]>([]);
  const [selectedSolFile, setSelectedSolFile] = useState(0);
  const [selectedContractJsonData, setSelectedSolFileJsonData] = useState<
    ContractJsonData | undefined
  >(undefined);
  const [constructorInput, setConstructorInput] = useState<
    FuncState | undefined
  >(undefined);

  const [wallets, setWallets] = useState<WalletData[]>(AnvilKeys);
  const [selectedWallet, setSelectedWallet] = useState(0);
  const [atAddress, setAtAddress] = useState("");

  // network state
  const [selectedNetwork, setSelectedNetwork] = useState(0);
  const [mainnetProvider, setMainnetProvider] = useState("infura");
  const [mainnetApiKey, setMainnetApiKey] = useState<string>("");
  const [customNetworkUrl, setCustomNetworkUrl] = useState<string>("");

  // eth values
  const [ethInputData, setEthInputData] = useState<ETHInputDataType>({
    ethValue: 0,
    ethFormat: 0,
  });

  // log data
  const [logData, setLogData] = useState<LogData[]>([]);

  // deployable contract
  const [deployedContracts, setDeployedContracts] = useState<
    DeployedContract[]
  >([]);

  useEffect(() => {
    consoleLog(`deployed contract ${JSON.stringify(deployedContracts)}`);
  }, [deployedContracts]);

  window.addEventListener("message", (event) => {
    const { id, data } = event.data;
    switch (id) {
      case MessageId.getCurrentWorkingDirectory:
        setPwd(data);
        break;
      case MessageId.getProjectType:
        setProjectType(data);
        break;
      case MessageId.getSolFiles:
        setSolFiles(data as ContractFileData[]);
        break;
      case MessageId.getAbi:
        setSelectedSolFileJsonData({
          abi: data.abi,
          bytecode: data.bytecode.object,
          storageLayout: data.storageLayout,
        });
        setConstructorInput(buildInitialConstructorState(data.abi[0]));
        break;
      case MessageId.buildCommandRunSuccess:
        setShowCheck(true);
        setTimeout(() => setShowCheck(false), 3000);
        fetchAbi();
        break;
      case MessageId.isFoundryInstalled:
        setIsFoundryInstalled(data);
        break;
    }
  });

  const fetchAbi = () => {
    if (
      solFiles.length > 0 &&
      selectedSolFile < solFiles.length &&
      pwd !== "/"
    ) {
      vscode.postMessage({
        id: MessageId.getAbi,
        data:
          pwd +
          "/out/" +
          solFiles[selectedSolFile].basename +
          "/" +
          solFiles[selectedSolFile].contractName +
          ".json",
      });
    }
  };

  useEffect(() => {
    // get project metadata
    vscode.postMessage({
      id: MessageId.getCurrentWorkingDirectory,
    });
    vscode.postMessage({
      id: MessageId.getProjectType,
    });
    vscode.postMessage({
      id: MessageId.isFoundryInstalled,
    });
  }, []);

  useEffect(() => {
    vscode.postMessage({ id: MessageId.runBuildCommand });
    vscode.postMessage({
      id: MessageId.getSolFiles,
    });
  }, [projectType, pwd]);

  useEffect(() => {
    fetchAbi();
  }, [solFiles, selectedSolFile]);

  async function getBalances(address: string): Promise<string> {
    const provider = createPublicClient({
      chain: anvil,
      transport: http(LOCAL_HOST_LINK),
    });

    const balance = await provider.getBalance({
      address: address as `0x${string}`,
    });
    return formatEther(balance);
  }
  const handleAtAddress = async () => {
    if (atAddress === "") {
      showError("Enter the contract address");
      return;
    } else if (!isAddress(atAddress)) {
      showError(`${atAddress} is not a valid contract address.`);
      return;
    } else if (selectedContractJsonData === undefined) {
      showError("Invalid contract");
      return;
    }

    // let _balance = await getBalances(atAddress);
    const newContract: DeployedContract = {
      name: solFiles[selectedSolFile].contractName,
      address: atAddress,
      functions: buildFunctionStatesFromABI(selectedContractJsonData.abi),
      abi: selectedContractJsonData.abi,
      storageLayout: selectedContractJsonData.storageLayout,
      refreshTick: 0,
      balance: await getBalances(atAddress),
    };

    setDeployedContracts((prev) => [...prev, newContract]);

    setDeployedContracts((prevContracts) =>
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

  const deployButtonHelper = () => {
    handleDeploy({
      ethInputData: ethInputData,
      constructorInputs: constructorInput,
      wallets: wallets,
      currentWallet: selectedWallet,
      contractFileData: solFiles[selectedSolFile],
      currentContractJsonData: selectedContractJsonData,
      selectedNetwork: selectedNetwork,
      customNetworkUrl: customNetworkUrl,
      setDeployedContract: setDeployedContracts,
      setLogData: setLogData,
      setWallets: setWallets,
    });
  };

  if (!isFoundryInstalled) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        }}
      >
        {/* header  */}
        <Header showCheck={showCheck} />
        <FoundryInstallMessage />
      </div>
    );
  }

  if (projectType === ProjectType.none) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        }}
      >
        {/* header  */}
        <Header showCheck={showCheck} />
        <ProjectTypeNone />
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      {/* header  */}
      <Header showCheck={showCheck} />
      <div
        style={{
          height: "60%",
          display: "flex",
          flexShrink: 0,
          flexDirection: "row",
          borderBottom: "1px solid gray",
        }}
      >
        <div style={{ width: "25%" }}>
          <VscodeScrollable
            style={{
              height: "100%",
              paddingRight: "12px",
            }}
          >
            <Networks
              selected={selectedNetwork}
              setSelected={setSelectedNetwork}
              customUrl={customNetworkUrl}
              setCustomUrl={setCustomNetworkUrl}
              mainnetProvider={mainnetProvider}
              setMainnetProvider={setMainnetProvider}
              apiKey={mainnetApiKey}
              setApiKey={setMainnetApiKey}
              resetAll={() => {
                setWallets(AnvilKeys);
                setDeployedContracts([]);
                setLogData([]);
              }}
            />
            <Wallets
              wallets={wallets}
              selectedWallet={selectedWallet}
              updateSelectedWallet={setSelectedWallet}
            />
            <SolFileDrop
              solFiles={solFiles}
              updateSelectedFile={setSelectedSolFile}
            />
            <ETHInput ethInputData={ethInputData} setData={setEthInputData} />
            {constructorInput !== undefined && (
              <ConstructorInput
                inputState={constructorInput}
                setConstructorInput={setConstructorInput}
              />
            )}

            <DeployButton
              constructorInput={constructorInput}
              handleDeploy={deployButtonHelper}
            />
            <AtAddress
              atAddress={atAddress}
              handleAtAddressButton={handleAtAddress}
              updateAtAddress={setAtAddress}
            />
          </VscodeScrollable>
        </div>
        <div
          style={{
            width: "75%",
            borderLeft: "1px solid gray",
            borderRight: "1px solid gray",
            paddingLeft: "12px",
            paddingRight: "12px",
            marginLeft: "12px",
          }}
        >
          {/* <LogSection /> */}
          <LogSection
            logs={logData}
            selectedNetwork={selectedNetwork}
            setDeployedContract={setDeployedContracts}
            setLogData={setLogData}
            setWallets={setWallets}
            setSelectedNetwork={setSelectedNetwork}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: "12px",
        }}
      >
        <div>
          <DeployedContractSection
            deployedContracts={deployedContracts}
            ethInputData={ethInputData}
            wallets={wallets}
            currentWallet={selectedWallet}
            contractFileData={solFiles[selectedSolFile]}
            selectedNetwork={selectedNetwork}
            customNetworkUrl={customNetworkUrl}
            setDeployedContract={setDeployedContracts}
            setLogData={setLogData}
            setWallets={setWallets}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
