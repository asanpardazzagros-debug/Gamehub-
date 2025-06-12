export const MessageId = {
  // log and messages
  log: "log",
  showMessage: "showMessage",

  // terminal messages
  runCommand: "command",
  createTerminal: "createTerminal",

  terminalOutput: "terminalOutput",
  runBuildCommand: "runBuildCommand",
  buildCommandRunSuccess: "buildCommandRunSuccess",
  buildCommandFailed: "buildCommandFailed",
  restartAnvil: "restartAnvil",

  // file data
  getSolFiles: "getSolFiles",
  getAbi: "getAbi",
  getCurrentWorkingDirectory: "getCurrentWorkingDirectory",
  getProjectType: "getProjectType",
  createFoundryTomlFile: "createFoundryTomlFile",

  test: "test",
};

export const Terminals = {
  anvilTerminal: "anvilTerminal",
  commandTerminal: "commandTerminal",
};

export const VSCodeMessage = {
  error: "error",
  info: "info",
  warning: "warning",
};

export const ProjectType = {
  foundry: "foundry",
  hardhat: "hardhat",
  none: "none",
};
