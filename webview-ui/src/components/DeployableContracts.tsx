import {
  VscodeOption,
  VscodeSingleSelect,
} from "@vscode-elements/react-elements";
import { ContractFileData } from "../../utils/Types";

type DeployableContractsProps = {
  contractFiles: ContractFileData[];
  updateSelectedContractIndex: (index: number) => void;
};

const DeployableContracts = ({
  contractFiles,
  updateSelectedContractIndex,
}: DeployableContractsProps) => {
  return (
    <div>
      <div className="heading ">Deployable Contract</div>

      <VscodeSingleSelect
        onChange={(event) => {
          // setCurrentContractFileIndex(
          //   JSON.parse((event.target as HTMLSelectElement).value)
          // );
          updateSelectedContractIndex(
            parseInt((event.target as HTMLInputElement).value)
          );
        }}
        style={{ marginBottom: "12px", width: "100%" }}
      >
        {contractFiles.length !== 0 &&
          contractFiles.map((file, index) => (
            <VscodeOption key={index} value={index.toString()}>
              {file.basename + ":" + file.contractName}
            </VscodeOption>
          ))}
      </VscodeSingleSelect>
    </div>
  );
};

export default DeployableContracts;
