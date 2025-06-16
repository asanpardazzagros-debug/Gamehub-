import {
  VscodeTextfield,
  VscodeSingleSelect,
  VscodeOption,
} from "@vscode-elements/react-elements";
import { ETHInputDataType } from "../../utils/Types";
import { ETH_FORMATS } from "../../utils/Constants";

type ETHInputProps = {
  ethInputData: ETHInputDataType;
  setData: (value: ETHInputDataType) => void;
};

const ETHInput = ({ ethInputData, setData }: ETHInputProps) => {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div className="heading">ETH Value</div>
      <VscodeTextfield
        type="number"
        value={ethInputData.ethValue.toString()}
        min={0}
        placeholder="ETH Value"
        onChange={(event) => {
          const value = Number((event.target as HTMLInputElement).value);
          setData({
            ethFormat: ethInputData.ethFormat,
            ethValue: value,
          });
        }}
        style={{ marginBottom: "12px", width: "100%" }}
      />

      <div>
        <VscodeSingleSelect
          onChange={(event) => {
            setData({
              ethFormat: parseInt((event.target as HTMLInputElement).value),
              ethValue: ethInputData.ethValue,
            });
          }}
          style={{ width: "100%" }}
        >
          {ETH_FORMATS.map((format, index) => {
            return (
              <VscodeOption key={index} value={index.toString()}>
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
