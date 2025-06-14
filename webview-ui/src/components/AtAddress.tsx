import { VscodeTextfield, VscodeButton } from "@vscode-elements/react-elements";

VscodeTextfield;
const AtAddress = ({
  atAddress,
  updateAtAddress,
  handleAtAddressButton,
}: {
  atAddress: string;
  handleAtAddressButton: () => void;
  updateAtAddress: (value: string) => void;
}) => {
  return (
    <div style={{ marginBottom: "12px" }}>
      <VscodeTextfield
        value={atAddress}
        placeholder="Load contract from address"
        onChange={(event) => {
          updateAtAddress((event.target as HTMLInputElement).value);
        }}
        style={{ marginBottom: "12px", width: "100%" }}
      />
      <VscodeButton
        onClick={handleAtAddressButton}
        style={{ width: "100%", boxSizing: "border-box" }}
      >
        At Address
      </VscodeButton>
    </div>
  );
};

export default AtAddress;
