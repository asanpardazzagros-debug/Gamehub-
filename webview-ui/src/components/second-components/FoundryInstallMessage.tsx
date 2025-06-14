const FoundryInstallMessage = () => {
  return (
    <div className="foundry-install">
      <div className="emoji">⚒️</div>
      <div className="title">
        <strong>Foundry not installed</strong>
      </div>
      <div className="subtitle">
        Please install <strong>Foundry</strong> to continue:
      </div>
      <div className="instructions">
        <div className="instruction-item">
          Run the following commands in your terminal:
        </div>
        <div className="command-block">
          <code>curl -L https://foundry.paradigm.xyz | bash</code>
        </div>
        <div className="command-block">
          <code>foundryup</code>
        </div>
        <div className="quote">
          <em>
            For Windows users, use
            <a
              href="https://gitforwindows.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              <strong> Git Bash </strong>
            </a>
            or
            <a
              href="https://learn.microsoft.com/en-us/windows/wsl/install"
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              <strong> WSL </strong>
            </a>
            to run the above commands.
          </em>
        </div>
      </div>
    </div>
  );
};

export default FoundryInstallMessage;
