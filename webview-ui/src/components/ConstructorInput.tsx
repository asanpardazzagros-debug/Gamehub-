import { VscodeTextfield } from "@vscode-elements/react-elements";
import { FuncState } from "../../utils/Types";

type ConstructorInputProps = {
  constructorAbiFormat: FuncState | undefined;
  handleInputChange: (index: number, value: string) => void;
};

const ConstructorInput = ({
  constructorAbiFormat,
  handleInputChange,
}: ConstructorInputProps) => {
  return (
    <div>
      {constructorAbiFormat !== undefined &&
        constructorAbiFormat.inputs.length > 0 && (
          <div>
            <div className="heading">Constructor Input</div>
            {constructorAbiFormat.inputs.map((input, index) => {
              return (
                <>
                  <div style={{ marginBottom: "4px" }}>{input.name} : </div>
                  <VscodeTextfield
                    key={index}
                    value={input.value}
                    placeholder={input.type}
                    onChange={(event) => {
                      handleInputChange(
                        index,
                        (event.target as HTMLInputElement).value
                      );
                    }}
                    style={{ marginBottom: "12px", width: "100%" }}
                  />
                </>
              );
            })}
          </div>
        )}
    </div>
  );
};
export default ConstructorInput;
