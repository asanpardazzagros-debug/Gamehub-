import { useEffect, useState } from "react";
import { vscode } from "./App";
import { MessageId, ProjectType } from "../../src/MessageId";

import Header from "./components/second-components/Header";
import ProjectTypeNone from "./components/second-components/ProjectTypeNone";
import {
  ContractFileData,
  ContractJsonData,
  FuncState,
  WalletData,
} from "../utils/Types";
import SolFileDrop from "./components/second-components/SolFilesDrop";
import { buildInitialConstructorState } from "../utils/stateHelper/HelperFunc";
import ConstructorInput from "./components/second-components/ConstructorInput";
import { AnvilKeys } from "../utils/AnvilKeys";
import Wallets from "./components/second-components/Wallets";
import AtAddress from "./components/second-components/AtAddress";
import FoundryInstallMessage from "./components/second-components/FoundryInstallMessage";

/**
 *
 *  @dev All state variables will be managed in this file.
 * However, using state management tools like Redux can sometimes
 * impact application performance.
 *
 */

const SecondApp = () => {
  const [projectType, setProjectType] = useState(ProjectType.none);
  const [isFoundryInstalled, setIsFoundryInstalled] = useState(false);
  const [pwd, setPwd] = useState("/");
  const [showCheck, setShowCheck] = useState(false);
  const [solFiles, setSolFiles] = useState<ContractFileData[]>([]);
  const [selectedSolFile, setSelectedSolFile] = useState(0);
  const [__, setSelectedSolFileJsonData] = useState<
    ContractJsonData | undefined
  >(undefined);
  const [constructorInput, setConstructorInput] = useState<
    FuncState | undefined
  >(undefined);

  const [wallets, ___] = useState<WalletData[]>(AnvilKeys);
  const [selectedWallet, setSelectedWallet] = useState(0);

  const [atAddress, setAtAddress] = useState("");

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

  const handleAtAddressButton = () => {};

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

  function handleInputChange(index: number, value: string) {
    setConstructorInput((prevState: FuncState | undefined) => {
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
        }}
      >
        <div style={{ width: "20%" }}>
          {constructorInput !== undefined && (
            <ActivityBar
              wallets={wallets}
              selectedWallet={selectedWallet}
              setSelectedWallet={setSelectedWallet}
              solFiles={solFiles}
              setSelectedSolFile={setSelectedSolFile}
              constructorInput={constructorInput}
              handleInputChange={handleInputChange}
              atAddress={atAddress}
              handleAtAddressButton={handleAtAddressButton}
              updateAtAddress={setAtAddress}
            />
          )}
        </div>
        <div style={{ width: "80%" }}>logs</div>
      </div>

      <div style={{}}>
        <div>Deployed contract line 1</div>
      </div>
    </div>
  );
};

export default SecondApp;

const ActivityBar = ({
  wallets,
  selectedWallet,
  setSelectedWallet,
  solFiles,
  setSelectedSolFile,
  constructorInput,
  handleInputChange,
  atAddress,
  handleAtAddressButton,
  updateAtAddress,
}: {
  wallets: WalletData[];
  selectedWallet: number;
  setSelectedWallet: (index: number) => void;
  solFiles: ContractFileData[];
  setSelectedSolFile: (index: number) => void;
  constructorInput: FuncState;
  handleInputChange: (index: number, value: string) => void;
  atAddress: string;
  handleAtAddressButton: () => void;
  updateAtAddress: (value: string) => void;
}) => {
  return (
    <>
      <Wallets
        wallets={wallets}
        selectedWallet={selectedWallet}
        updateSelectedWallet={setSelectedWallet}
      />
      <SolFileDrop
        solFiles={solFiles}
        updateSelectedFile={setSelectedSolFile}
      />

      <ConstructorInput
        inputState={constructorInput}
        handleInputChange={handleInputChange}
      />
      <AtAddress
        atAddress={atAddress}
        handleAtAddressButton={handleAtAddressButton}
        updateAtAddress={updateAtAddress}
      />
    </>
  );
};
