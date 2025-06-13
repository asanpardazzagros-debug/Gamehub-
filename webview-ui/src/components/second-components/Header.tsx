const Header = ({ showCheck }: { showCheck: boolean }) => {
  return (
    <div>
      <div
        style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
      >
        <h1>SlotMatrix</h1>
        {showCheck && (
          <div className="green-check">
            <i
              className="codicon codicon-check-all"
              style={{
                color: "white",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            ></i>
          </div>
        )}
      </div>
      <p>Code. Deploy. Inspect. All in One Matrix.</p>
    </div>
  );
};

export default Header;
