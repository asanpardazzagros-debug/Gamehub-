import { VscodeScrollable } from "@vscode-elements/react-elements";
import { LogData, DeployedContract, WalletData } from "../../utils/Types";
import Log from "./Log";
import { AnvilKeys } from "../../utils/AnvilKeys";
import { vscode } from "../App";
import { MessageId } from "../../../src/MessageId";
import { VscClearAll, VscCircleSlash } from "react-icons/vsc";

type LogSectionProps = {
  logs: LogData[];
  selectedNetwork: number;
  setDeployedContract: React.Dispatch<React.SetStateAction<DeployedContract[]>>;
  setLogData: React.Dispatch<React.SetStateAction<LogData[]>>;
  setWallets: React.Dispatch<React.SetStateAction<WalletData[]>>;
  setSelectedNetwork: React.Dispatch<React.SetStateAction<number>>;
};
const LogSection = ({
  logs,
  selectedNetwork,
  setDeployedContract,
  setLogData,
  setWallets,
  setSelectedNetwork,
}: LogSectionProps) => {
  return (
    <div style={{ height: "100%" }}>
      {/* log section header  */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          height: "5%",
          borderBottom: "1px solid gray",
          paddingBottom: "12px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          Logs
        </div>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <VscCircleSlash
            className="icon "
            onClick={() => {
              setLogData([]);
            }}
            style={{ cursor: "pointer", marginRight: "12px" }}
            title="Clear logs"
          />

          <VscClearAll
            style={{ cursor: "pointer" }}
            title="Reset all"
            className="icon"
            onClick={() => {
              setLogData([]);
              setDeployedContract([]);
              setWallets(AnvilKeys);
              setSelectedNetwork(0);
              if (selectedNetwork === 0)
                //otherwise network section useEffect already send the request to create new anvil terminal
                vscode.postMessage({
                  id: MessageId.restartAnvil,
                  data: "anvil --port 9545 --hardfork prague",
                });
            }}
          />
        </div>
      </div>

      {/* logs  */}
      <VscodeScrollable
        style={{
          height: "85%",
        }}
      >
        <Log logData={logs} />
      </VscodeScrollable>
    </div>
  );
};

export default LogSection;
