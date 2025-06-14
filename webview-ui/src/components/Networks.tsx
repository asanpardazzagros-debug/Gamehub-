import {
  VscodeSingleSelect,
  VscodeOption,
  VscodeTextfield,
} from "@vscode-elements/react-elements";
import { consoleLog, isValidUrl, showError } from "../../utils/HelperFunc";
import { useEffect } from "react";
import { vscode } from "../App";
import { MessageId, Terminals } from "../../../src/MessageId";
import { AVAILABLE_NETWORKS } from "../../utils/Constants";

type NetworkProps = {
  selected: number;
  setSelected: React.Dispatch<React.SetStateAction<number>>;
  customUrl: string;
  setCustomUrl: React.Dispatch<React.SetStateAction<string>>;
  mainnetProvider: string;
  setMainnetProvider: React.Dispatch<React.SetStateAction<string>>;
  apiKey: string;
  setApiKey: React.Dispatch<React.SetStateAction<string>>;
  resetAll: () => void;
};

const Networks = ({
  selected,
  setSelected,
  customUrl,
  setCustomUrl,
  mainnetProvider,
  setMainnetProvider,
  apiKey,
  setApiKey,
  resetAll,
}: NetworkProps) => {
  const getSelectedNetworkType = () => {
    return AVAILABLE_NETWORKS[selected];
  };

  const generateAnvilCommand = (): string => {
    const selectedNetworkType = AVAILABLE_NETWORKS[selected];

    switch (selectedNetworkType.id) {
      case "prague":
        return "anvil --port 9545 --hardfork prague";

      case "cancun":
        return "anvil --port 9545 --hardfork cancun";

      case "fork":
        if (!apiKey.trim()) {
          return "";
        }
        const rpcUrl =
          mainnetProvider === "infura"
            ? `https://mainnet.infura.io/v3/${apiKey}`
            : `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
        return `anvil --port 9545 --fork-url ${rpcUrl}`;

      case "custom":
        return "";

      default:
        return "anvil --port 9545 --hardfork prague";
    }
  };

  const handleCustomUrlInput = (inputUrl: string) => {
    setCustomUrl(inputUrl);
    if (inputUrl.trim() === "") {
      return; // Empty input is allowed
    }
    if (isValidUrl(inputUrl)) {
      //   UPDATE PROVIDER URL
      consoleLog(`Valid custom URL set: ${inputUrl}`);
    } else {
      showError("Invalid URL format. Please enter a valid http or https URL.");
    }
  };

  useEffect(() => {
    const selectedNetwork = getSelectedNetworkType();
    if (selectedNetwork.id !== "custom") {
      const command = generateAnvilCommand();
      if (command === "") return;
      sendMessage(command);
    }
  }, [selected]);

  const sendMessage = (command: string) => {
    vscode.postMessage({
      id: MessageId.createTerminal,
      data: {
        type: Terminals.anvilTerminal,
        command: command,
      },
    });
    resetAll();
  };

  useEffect(() => {
    if (apiKey === "") return;
    const command = generateAnvilCommand();
    sendMessage(command);
    setApiKey("");
  }, [apiKey]);

  return (
    <div style={{ marginBottom: "12px" }}>
      <div className="heading">Network</div>
      <VscodeSingleSelect
        value={selected.toString()}
        onChange={(event) => {
          const networkIndex = parseInt(
            (event.target as HTMLInputElement).value
          );
          setSelected(networkIndex);
        }}
        selectedIndex={selected}
        style={{ width: "100%" }}
      >
        {AVAILABLE_NETWORKS.map((network, index) => (
          <VscodeOption key={`${network.id}-${index}`} value={index.toString()}>
            {network.name}
          </VscodeOption>
        ))}
      </VscodeSingleSelect>

      {/* Custom Network Input */}
      {getSelectedNetworkType().id === "custom" && (
        <VscodeTextfield
          style={{ marginTop: "12px", width: "100%" }}
          value={customUrl}
          placeholder="Enter custom rpc URL"
          onChange={(event) => {
            const customUrl = (event.target as HTMLInputElement).value;
            handleCustomUrlInput(customUrl);
          }}
        />
      )}

      {/* Mainnet Fork Configuration */}
      {getSelectedNetworkType().id === "fork" && (
        <div style={{ marginTop: "12px" }}>
          <div
            style={{
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            Mainnet Fork Configuration
          </div>

          {/* Provider Selection */}
          <VscodeSingleSelect
            value={mainnetProvider}
            onChange={(event) => {
              setMainnetProvider(
                (event.target as HTMLInputElement).value as "infura" | "alchemy"
              );
            }}
            style={{ marginBottom: "8px", width: "100%" }}
          >
            <VscodeOption value="infura">Infura</VscodeOption>
            <VscodeOption value="alchemy">Alchemy</VscodeOption>
          </VscodeSingleSelect>

          {/* API Key Input */}
          <VscodeTextfield
            value={apiKey}
            placeholder={`Enter your ${mainnetProvider} API key`}
            onChange={(event) => {
              setApiKey((event.target as HTMLInputElement).value.trim());
            }}
            type="password"
            style={{ width: "100%" }}
          />

          <div style={{ marginTop: "4px", fontSize: "12px", color: "#888" }}>
            {mainnetProvider === "infura"
              ? "Get your API key from: https://infura.io/"
              : "Get your API key from: https://www.alchemy.com/"}
          </div>
        </div>
      )}
    </div>
  );
};

export default Networks;
