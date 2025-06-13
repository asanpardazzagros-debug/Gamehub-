import {
  VscodeOption,
  VscodeSingleSelect,
} from "@vscode-elements/react-elements";
import { ContractFileData } from "../../../utils/Types";

const SolFileDrop = ({
  solFiles,
  updateSelectedFile,
}: {
  solFiles: ContractFileData[];
  updateSelectedFile: (index: number) => void;
}) => {
  return (
    <div>
      <div className="heading">Deployable Contract</div>
      <VscodeSingleSelect
        onChange={(event) => {
          updateSelectedFile(
            parseInt((event.target as HTMLInputElement).value)
          );
        }}
      >
        {solFiles.map((file, index) => (
          <VscodeOption key={index} value={index.toString()}>
            {file.basename + ":" + file.contractName}
          </VscodeOption>
        ))}
      </VscodeSingleSelect>
    </div>
  );
};

export default SolFileDrop;
