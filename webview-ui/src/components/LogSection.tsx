import {
  VscodeDivider,
  VscodeScrollable,
} from "@vscode-elements/react-elements";
import Log from "./Log";
import { LogData } from "../../utils/Types";
import { vscode } from "../App";
import { MessageId } from "../../../src/MessageId";

type LogSectionProps = {
  logData: LogData[];
  resetLogs: () => void;
  resetDeployedContract: () => void;
  resetWallets: () => void;
};

const LogSection = ({
  logData,
  resetLogs,
  resetDeployedContract,
  resetWallets,
}: LogSectionProps) => {
  return (
    <div
      style={{
        width: "75%",
        borderLeft: "1px solid gray",
        paddingLeft: "12px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: "8px",
          alignItems: "center",
        }}
      >
        <div className="heading" style={{ marginBottom: "0px" }}>
          Logs
        </div>

        <div style={{ display: "flex", flexDirection: "row" }}>
          <div
            className="icon "
            onClick={() => {
              resetLogs();
            }}
            style={{ cursor: "pointer", marginRight: "12px" }}
            title="Clear logs"
          >
            <i className="codicon codicon-circle-slash"></i>
          </div>
          <div
            className="icon "
            onClick={() => {
              resetLogs();
              resetDeployedContract();
              resetWallets();
              vscode.postMessage({
                id: MessageId.restartAnvil,
              });
            }}
            style={{ cursor: "pointer" }}
            title="Reset all"
          >
            <i className="codicon codicon-clear-all"></i>
          </div>
        </div>
      </div>
      <VscodeDivider />
      <VscodeScrollable style={{ height: "450px" }}>
        <Log logData={logData} />
      </VscodeScrollable>
    </div>
  );
};

export default LogSection;
