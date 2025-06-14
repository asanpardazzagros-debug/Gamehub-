import { VscodeTextfield } from "@vscode-elements/react-elements";
import { FuncState } from "../../utils/Types";

const ConstructorInput = ({
  inputState,
  setConstructorInput,
}: {
  inputState: FuncState;
  setConstructorInput: React.Dispatch<
    React.SetStateAction<FuncState | undefined>
  >;
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
                    const value = (event.target as HTMLInputElement).value;
                    setConstructorInput((prevState: FuncState | undefined) => {
                      if (!prevState) return prevState;
                      const updatedInputs = prevState.inputs.map((input, idx) =>
                        idx === index ? { ...input, value } : input
                      );
                      return {
                        ...prevState,
                        inputs: updatedInputs,
                      };
                    });
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
