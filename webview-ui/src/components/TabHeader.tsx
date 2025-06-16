import { VscodeTabHeader } from "@vscode-elements/react-elements";
import { IoCloseSharp } from "react-icons/io5";

export const TabHeader = ({
  title,
  handleClose,
}: {
  title: string;
  handleClose: () => void;
}) => {
  return (
    <VscodeTabHeader
      style={{
        borderRight: "1px solid gray",
        borderLeft: "1px solid gray",
        paddingRight: "8px",
        paddingLeft: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <div
          style={{
            fontWeight: "bold",
          }}
        >
          {title}
        </div>
        <IoCloseSharp className="icon" onClick={handleClose} />
      </div>
    </VscodeTabHeader>
  );
};
