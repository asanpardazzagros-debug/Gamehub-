import {
  VscodeOption,
  VscodeSingleSelect,
  VscodeTextfield,
} from "@vscode-elements/react-elements";
import "../App.css";
import { consoleLog, showError } from "../../utils/HelperFunc";
import { useEffect, useState } from "react";
import { MessageId, Terminals } from "../../../src/MessageId";
import { vscode } from "../App";

type NetworkProps = {
  updateRpcUrl: (value: string) => void;
  resetAnvil: number;
};

type NetworkType =
  | "Anvil Prague (Default)"
  | "Anvil Cancun"
  | "Mainnet Fork"
  | "Custom rpc URL";

const Network = ({ updateRpcUrl, resetAnvil }: NetworkProps) => {
  const availableNetworks: NetworkType[] = [
    "Anvil Prague (Default)",
    "Anvil Cancun",
    "Mainnet Fork",
    "Custom rpc URL",
  ];

  const [selectedNetwork, setSelectedNetwork] = useState<number>(0);
  const [customNetworkUrl, setCustomNetworkUrl] = useState<string>("");
  const [mainnetProvider, setMainnetProvider] = useState<"infura" | "alchemy">(
    "infura"
  );
  const [mainnetApiKey, setMainnetApiKey] = useState<string>("");

  // Validate URL format
  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Generate anvil command based on current selection
  const generateAnvilCommand = (): string => {
    const selectedNetworkType = availableNetworks[selectedNetwork];

    switch (selectedNetworkType) {
      case "Anvil Prague (Default)":
        return "anvil --port 9545 --hardfork prague";

      case "Anvil Cancun":
        return "anvil --port 9545 --hardfork cancun";

      case "Mainnet Fork":
        if (!mainnetApiKey.trim()) {
          return ""; // Invalid state - no API key
        }
        const rpcUrl =
          mainnetProvider === "infura"
            ? `https://mainnet.infura.io/v3/${mainnetApiKey}`
            : `https://eth-mainnet.g.alchemy.com/v2/${mainnetApiKey}`;
        return `anvil --port 9545 --fork-url ${rpcUrl}`;

      case "Custom rpc URL":
        return ""; // No anvil command for custom URL

      default:
        return "anvil --port 9545 --hardfork prague";
    }
  };

  // Update RPC URL based on selected network
  const updateRpcUrlForNetwork = () => {
    const selectedNetworkType = availableNetworks[selectedNetwork];

    if (selectedNetworkType === "Custom rpc URL") {
      if (customNetworkUrl && isValidUrl(customNetworkUrl)) {
        updateRpcUrl(customNetworkUrl);
      }
    } else {
      // For all anvil networks (including mainnet fork), use localhost
      updateRpcUrl("http://localhost:9545");
    }
  };

  // Handle custom URL input with validation
  const handleCustomUrlInput = (inputUrl: string) => {
    setCustomNetworkUrl(inputUrl);

    if (!inputUrl.trim()) {
      return; // Empty input is allowed
    }

    if (isValidUrl(inputUrl)) {
      updateRpcUrl(inputUrl);
      consoleLog(`Valid custom URL set: ${inputUrl}`);
    } else {
      showError("Invalid URL format. Please enter a valid http or https URL.");
    }
  };

  // Handle network selection change
  const handleNetworkChange = (networkIndex: number) => {
    setSelectedNetwork(networkIndex);

    // Clear any previous error states
    const selectedNetworkType = availableNetworks[networkIndex];

    // Update RPC URL immediately for non-custom networks
    if (selectedNetworkType !== "Custom rpc URL") {
      updateRpcUrl("http://localhost:9545");
    } else if (customNetworkUrl && isValidUrl(customNetworkUrl)) {
      updateRpcUrl(customNetworkUrl);
    }
  };

  // Validate mainnet fork configuration
  const isMainnetForkConfigValid = (): boolean => {
    return selectedNetwork === 2 && mainnetApiKey.trim() !== "";
  };

  // Get current network type
  const getSelectedNetworkType = (): NetworkType => {
    return availableNetworks[selectedNetwork];
  };

  const setAnvilState = () => {
    const command = generateAnvilCommand();

    if (command) {
      consoleLog(`Generated anvil command: ${command}`);
      // onAnvilCommandChange?.(command);
      consoleLog("send anvil start message");
      vscode.postMessage({
        id: MessageId.createTerminal,
        data: {
          type: Terminals.anvilTerminal,
          command: command,
        },
      });
    } else if (
      getSelectedNetworkType() === "Mainnet Fork" &&
      !mainnetApiKey.trim()
    ) {
      consoleLog("Mainnet fork selected but no API key provided");
    }

    // Update RPC URL when dependencies change
    updateRpcUrlForNetwork();
  };

  // Effect to handle command generation and validation
  useEffect(() => {
    setAnvilState();
  }, [selectedNetwork, mainnetApiKey, mainnetProvider, customNetworkUrl]);

  useEffect(() => {
    if (selectedNetwork === 0) {
      setAnvilState();
    } else setSelectedNetwork(0);
  }, [resetAnvil]);

  return (
    <div style={{ marginBottom: "12px" }}>
      <div className="heading">Network</div>

      <VscodeSingleSelect
        value={selectedNetwork.toString()}
        onChange={(event) => {
          const networkIndex = parseInt(
            (event.target as HTMLInputElement).value
          );
          handleNetworkChange(networkIndex);
        }}
        selectedIndex={selectedNetwork}
      >
        {availableNetworks.map((network, index) => (
          <VscodeOption key={`${network}-${index}`} value={index.toString()}>
            {network}
          </VscodeOption>
        ))}
      </VscodeSingleSelect>

      {/* Custom Network Input */}
      {getSelectedNetworkType() === "Custom rpc URL" && (
        <VscodeTextfield
          style={{ marginTop: "12px" }}
          value={customNetworkUrl}
          placeholder="Enter custom RPC URL (e.g., https://your-rpc-url.com)"
          onChange={(event) => {
            const customUrl = (event.target as HTMLInputElement).value;
            handleCustomUrlInput(customUrl);
          }}
        />
      )}

      {/* Mainnet Fork Configuration */}
      {getSelectedNetworkType() === "Mainnet Fork" && (
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
            style={{ marginBottom: "8px" }}
          >
            <VscodeOption value="infura">Infura</VscodeOption>
            <VscodeOption value="alchemy">Alchemy</VscodeOption>
          </VscodeSingleSelect>

          {/* API Key Input */}
          <VscodeTextfield
            value={mainnetApiKey}
            placeholder={`Enter your ${mainnetProvider} API key`}
            onChange={(event) => {
              setMainnetApiKey((event.target as HTMLInputElement).value.trim());
            }}
            type="password"
          />

          <div style={{ marginTop: "4px", fontSize: "12px", color: "#888" }}>
            {mainnetProvider === "infura"
              ? "Get your API key from: https://infura.io/"
              : "Get your API key from: https://www.alchemy.com/"}
          </div>

          {/* Validation message for mainnet fork */}
          {!isMainnetForkConfigValid() && (
            <div
              style={{ marginTop: "4px", fontSize: "12px", color: "#ff6b6b" }}
            >
              API key is required for mainnet fork
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Network;
