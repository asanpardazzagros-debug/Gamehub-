import {
  VscodeOption,
  VscodeSingleSelect,
} from "@vscode-elements/react-elements";

import { WalletData } from "../../../utils/Types";
import { handleCopy } from "../../../utils/stateHelper/HelperFunc";
const Wallets = ({
  wallets,
  selectedWallet,
  updateSelectedWallet,
}: {
  wallets: WalletData[];
  selectedWallet: number;
  updateSelectedWallet: (index: number) => void;
}) => {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div className="heading">Wallets</div>
        <div
          className="icon "
          style={{ marginLeft: "4px", cursor: "pointer" }}
          onClick={() => handleCopy(wallets[selectedWallet].publicKey)}
        >
          <i className="codicon codicon-copy icon"></i>
        </div>
      </div>
      <VscodeSingleSelect
        value={selectedWallet.toString()}
        onChange={(event) => {
          updateSelectedWallet(
            parseInt((event.target as HTMLSelectElement).value)
          );
        }}
        style={{ marginBottom: "12px", width: "100%" }}
      >
        {wallets.map((account, index) => (
          <VscodeOption
            key={`${account.publicKey}-${account.balance}`}
            value={index.toString()}
            selected={index === selectedWallet}
          >
            {`${account.publicKey.slice(0, 6)}...${account.publicKey.slice(
              -6
            )}  (${account.balance} ETH)`}
          </VscodeOption>
        ))}
      </VscodeSingleSelect>
    </div>
  );
};
export default Wallets;
