import { VscodeButton } from "@vscode-elements/react-elements";
import { FuncState } from "../../utils/Types";

type DeployButtonProps = {
  constructorInput: FuncState | undefined;
  handleDeploy: () => void;
};
const DeployButton = ({
  constructorInput,
  handleDeploy,
}: DeployButtonProps) => {
  return (
    <div style={{ marginBottom: "12px" }}>
      <VscodeButton
        onClick={handleDeploy}
        style={{
          backgroundColor:
            constructorInput?.stateMutability === "payable"
              ? "#cb0303"
              : undefined,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        Deploy
      </VscodeButton>
    </div>
  );
};

export default DeployButton;
