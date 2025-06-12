import {
  VscodeOption,
  VscodeSingleSelect,
} from "@vscode-elements/react-elements";
import { WalletData } from "../../utils/Types";
import { handleCopy } from "../../utils/stateHelper/HelperFunc";

type WalletsProps = {
  wallets: WalletData[];
  currentWallet: number;
  updateCurrentWallet: (index: number) => void;
};

const Wallets = ({
  wallets,
  currentWallet,
  updateCurrentWallet,
}: WalletsProps) => {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div className="heading">Wallets</div>
        <div
          className="icon "
          style={{ marginLeft: "4px", cursor: "pointer" }}
          onClick={() => handleCopy(wallets[currentWallet].publicKey)}
        >
          <i className="codicon codicon-copy icon"></i>
        </div>
      </div>
      <VscodeSingleSelect
        value={currentWallet.toString()}
        onChange={(event) => {
          updateCurrentWallet(
            parseInt((event.target as HTMLSelectElement).value)
          );
        }}
        style={{ marginBottom: "12px", width: "100%" }}
      >
        {wallets.map((account, index) => (
          <VscodeOption
            key={`${account.publicKey}-${account.balance}`}
            value={index.toString()}
            selected={index === currentWallet}
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
