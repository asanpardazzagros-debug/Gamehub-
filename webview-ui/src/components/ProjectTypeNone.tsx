const ProjectTypeNone = () => {
  return (
    <div className="project-type-none">
      <div className="emoji">🚀</div>
      <div className="title">
        <strong>No compatible project found</strong>
      </div>
      <div className="subtitle">
        Please open a <strong>Foundry</strong> or <strong>Hardhat</strong>{" "}
        project:
      </div>
      <div className="instructions">
        <div className="instruction-item">
          - For <strong>Foundry</strong>, ensure a <code>foundry.toml</code>{" "}
          file exists and contracts are in the <code>src/</code> folder.
        </div>
        <div className="instruction-item">
          - For <strong>Hardhat</strong>, ensure a <code>contracts/</code>{" "}
          folder exists in the root directory.
        </div>
      </div>
    </div>
  );
};

export default ProjectTypeNone;
