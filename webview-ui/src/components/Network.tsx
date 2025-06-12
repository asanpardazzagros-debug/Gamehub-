import {
  VscodeOption,
  VscodeSingleSelect,
  VscodeTextfield,
} from "@vscode-elements/react-elements";
import "../App.css";
import { consoleLog, showError } from "../../utils/HelperFunc";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useDispatch } from "react-redux";
import {
  updateCustomNetwork,
  updateSelectedNetwork,
} from "../store/slice/network";
import { useEffect } from "react";

const Network = () => {
  const network = useSelector((state: RootState) => state.network);
  useEffect(() => {
    consoleLog(`network details : ${JSON.stringify(network)}`);
  }, [network]);
  const dispatch = useDispatch();
  const handleCustomUrlInput = (inputUrl: string) => {
    try {
      const url = new URL(inputUrl);
      consoleLog(`${JSON.stringify(url)}`);
      if (url.protocol === "http:" || url.protocol === "https:") {
        dispatch(updateCustomNetwork(inputUrl));
        consoleLog("good");
      } else {
        consoleLog("in else ");
        showError("Only http and https URLs are allowed.");
      }
    } catch {
      consoleLog("inside catch");
      showError("Invalid URL format");
    }
  };

  return (
    <div style={{ marginBottom: "12px" }}>
      <div className="heading">Network</div>
      <VscodeSingleSelect
        onChange={(event) => {
          const urlIndex = parseInt((event.target as HTMLInputElement).value);

          dispatch(updateSelectedNetwork(urlIndex));
        }}
      >
        {network.rpcUrls.map((url, index) => (
          <VscodeOption key={`${url}-${index}`} value={index.toString()}>
            {url}
          </VscodeOption>
        ))}
      </VscodeSingleSelect>

      {network.rpcUrls[network.selectedNetwork] === "custom" && (
        <VscodeTextfield
          style={{ marginTop: "12px" }}
          value={network.customNetwork}
          placeholder="Custom rpc url."
          onChange={(event) => {
            handleCustomUrlInput((event.target as HTMLInputElement).value);
          }}
        />
      )}
    </div>
  );
};

export default Network;
