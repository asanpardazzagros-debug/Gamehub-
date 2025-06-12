import {
  VscodeOption,
  VscodeSingleSelect,
  VscodeTextfield,
} from "@vscode-elements/react-elements";

export const ETHFormat = ["wei", "gwei", "finney", "ether"];
type ETHInputProps = {
  ethValue: string;
  updateETHValue: (value: string) => void;
  updateETHFormat: (value: string) => void;
};

const ETHInput = ({
  ethValue,
  updateETHFormat,
  updateETHValue,
}: ETHInputProps) => {
  return (
    <div>
      <div className="heading">ETH Value</div>
      <VscodeTextfield
        type="number"
        value={ethValue}
        min={0}
        placeholder="ETH Value"
        onChange={(event) => {
          const value = Number((event.target as HTMLInputElement).value);
          updateETHValue(value.toString());
        }}
        style={{ marginBottom: "12px", width: "100%" }}
      />

      <div>
        <VscodeSingleSelect
          onChange={(event) => {
            updateETHFormat((event.target as HTMLInputElement).value);
          }}
          style={{ marginBottom: "12px", width: "100%" }}
        >
          {ETHFormat.map((format, index) => {
            return (
              <VscodeOption key={index} value={format}>
                {format.toLocaleUpperCase()}
              </VscodeOption>
            );
          })}
        </VscodeSingleSelect>
      </div>
    </div>
  );
};

export default ETHInput;
