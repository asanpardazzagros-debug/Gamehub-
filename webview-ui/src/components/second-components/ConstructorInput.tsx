import { VscodeTextfield } from "@vscode-elements/react-elements";
import { FuncState } from "../../../utils/Types";

const ConstructorInput = ({
  inputState,
  handleInputChange,
}: {
  inputState: FuncState;
  handleInputChange: (index: number, value: string) => void;
}) => {
  return (
    <div>
      {inputState.inputs.length > 0 && (
        <div>
          <div className="heading">Constructor Input</div>
          {inputState.inputs.map((input, index) => {
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
