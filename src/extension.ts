import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { MessageId, Terminals, VSCodeMessage } from "./MessageId";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";

type ContractInfo = {
  contractName: string;
  contractFilePath: string;
  basename: string;
};

let commandTerminal: vscode.Terminal | undefined;
let anvilProcess: ChildProcessWithoutNullStreams | null = null;
let panel: vscode.WebviewPanel;
const ANVIL_PORT = "9545";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("slotmatrix.panelView", () => {
      panel = vscode.window.createWebviewPanel(
        "slotmatrix",
        "SlotMatrix",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "media")),
          ],
        }
      );

      // getWebViewContent
      const htmlPath = path.join(context.extensionPath, "media", "index.html");
      let html = fs.readFileSync(htmlPath, "utf8");
      // Replace paths with Webview-compatible URIs
      html = html.replace(/(src|href)="(.+?)"/g, (_, attr, file) => {
        const filePath = vscode.Uri.file(
          path.join(context.extensionPath, "media", file)
        );
        const webviewUri = panel.webview.asWebviewUri(filePath);
        return `${attr}="${webviewUri}"`;
      });

      vscode.commands.executeCommand("setContext", "slotmatrixPanelOpen", true);

      panel.webview.html = html;
      panel.webview.onDidReceiveMessage(
        (message) => {
          switch (message.id) {
            // ---- LOGS ----
            // developer logs
            case MessageId.log:
              console.log("log : ", message.data);
              break;
            // user message logs
            // structure -> {id, data{id, data}}
            case MessageId.showMessage:
              if (message.data.id === VSCodeMessage.error) {
                vscode.window.showErrorMessage(message.data.data);
              } else if (message.data.id === VSCodeMessage.info) {
                vscode.window.showInformationMessage(message.data.data);
              } else if (message.data.id === VSCodeMessage.warning) {
                vscode.window.showWarningMessage(message.data.data);
              }
              break;
            // ---- TERMINAL ----
            case MessageId.runBuildCommand:
              runBuildCommand();
              break;
            case MessageId.createTerminal:
              if (message.data === Terminals.anvilTerminal) {
                startAnvil(ANVIL_PORT);
              } else if (
                message.data === Terminals.commandTerminal &&
                commandTerminal === undefined
              ) {
                commandTerminal = vscode.window.createTerminal({
                  name: "SlotMatrix Command Terminal",
                });
              }
              break;
            case MessageId.restartAnvil:
              restartAnvil();
              break;

            // ---- FILES ----
            case MessageId.getSolFiles:
              const data = getAllDeployableContracts();

              panel.webview.postMessage({
                id: MessageId.getSolFiles,
                data: data,
              });
              break;
            case MessageId.getAbi:
              try {
                const jsonContent = fs.readFileSync(message.data, "utf8");
                const parsed = JSON.parse(jsonContent);

                panel.webview.postMessage({
                  id: MessageId.getAbi,
                  data: parsed,
                });
              } catch (err) {
                vscode.window.showErrorMessage("Compile the contract first");
              }
              break;

            case MessageId.getCurrentWorkingDirectory:
              const workspaceFolders = vscode.workspace.workspaceFolders;
              if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage("No workspace folder open");
                return;
              }
              const currentWorkingDirectory = workspaceFolders[0].uri.fsPath;
              panel.webview.postMessage({
                id: MessageId.getCurrentWorkingDirectory,
                data: currentWorkingDirectory,
              });
              break;
          }
        },
        undefined,
        context.subscriptions
      );
      panel.onDidDispose(() => {
        vscode.commands.executeCommand(
          "setContext",
          "slotmatrixPanelOpen",
          false
        );
        stopAnvil();

        commandTerminal?.dispose();
        commandTerminal = undefined;
      });
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("slotmatrix.customSave", () => {
      runBuildCommand();

      const data = getAllDeployableContracts();

      panel.webview.postMessage({
        id: MessageId.getSolFiles,
        data: data,
      });
    })
  );
  //welcome command
  context.subscriptions.push(
    vscode.commands.registerCommand("slotmatrix.welcome", () => {
      const hasCreated = context.globalState.get("slotmatrix.welcome.create");

      if (!hasCreated) {
        context.globalState.update("slotmatrix.welcome.create", true);
        const welcomePanel = vscode.window.createWebviewPanel(
          "welcomePage",
          "Welcome",
          vscode.ViewColumn.One,
          {
            enableScripts: true,
          }
        );
        const htmlPath = path.join(
          context.extensionPath,
          "out",
          "welcome.html"
        );
        let html = fs.readFileSync(htmlPath, "utf8");
        welcomePanel.webview.html = html;
        welcomePanel.onDidDispose(() => {
          context.globalState.update("slotmatrix.welcome.create", false);
        });
      }
    })
  );

  const hasShownWelcome = context.globalState.get("slotmatrix.hasShownWelcome");
  console.log("hasShownWelcome : ", hasShownWelcome);
  if (!hasShownWelcome) {
    context.globalState.update("slotmatrix.hasShownWelcome", true);
    vscode.commands.executeCommand("slotmatrix.welcome");
  }
}

function startAnvil(port = ANVIL_PORT) {
  if (anvilProcess) {
    vscode.window.showInformationMessage("Anvil is already running.");
    return;
  }

  anvilProcess = spawn("anvil", ["--port", `${port}`, "--steps-tracing"]);

  anvilProcess.stdout.on("data", (data) => {
    const output = data.toString();
    if (output.includes("Listening on")) {
      vscode.window.showInformationMessage(
        `Anvil started successfully on port ${port}`
      );
    }
  });

  anvilProcess.stderr.on("data", (data) => {
    console.error("Anvil stderr:", data.toString());
  });

  anvilProcess.on("error", (err) => {
    vscode.window.showErrorMessage(`Failed to start Anvil: ${err.message}`);
    anvilProcess = null;
  });

  anvilProcess.on("exit", (code) => {
    console.log(`Anvil exited with code ${code}`);
    anvilProcess = null;
  });
}

function restartAnvil(port = ANVIL_PORT) {
  stopAnvil();
  startAnvil(port);
}

function stopAnvil() {
  if (anvilProcess) {
    anvilProcess.kill();
    vscode.window.showInformationMessage("Anvil stopped.");
    anvilProcess = null;
  } else {
    vscode.window.showInformationMessage("Anvil is not running.");
  }
}

function runBuildCommand() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const pathCwd = workspaceFolders[0].uri.fsPath;
  console.log("pathCwd : ", pathCwd);

  // Step 1: Run `forge clean`
  const clean = spawn("forge", ["clean"], { cwd: pathCwd });

  clean.stderr.on("data", (data) => {
    console.log(`forge clean stderr: ${data}`);
  });

  clean.on("close", (code) => {
    if (code !== 0) {
      vscode.window.showErrorMessage("forge clean failed");
      panel.webview.postMessage({
        id: MessageId.buildCommandFailed,
      });
      console.log("forge clean failed");
      return;
    }

    console.log("forge clean success");

    // Step 2: Run `forge build --extra-output storageLayout`
    const build = spawn("forge", ["build", "--extra-output", "storageLayout"], {
      cwd: pathCwd,
    });

    let output = "";
    let errorOutput = "";

    build.stdout.on("data", (data) => {
      output += data.toString();
    });

    build.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    build.on("close", (buildCode) => {
      if (buildCode !== 0) {
        console.log("forge build failed: ", errorOutput);
        vscode.window.showErrorMessage(
          `Contract build failed makes required changes and press Cmd + S`
        );
        commandTerminal = vscode.window.createTerminal({
          name: "SlotMatrix Command Terminal",
        });
        commandTerminal.show();
        commandTerminal.sendText("forge build --extra-output storageLayout");
        panel.webview.postMessage({
          id: MessageId.buildCommandFailed,
        });
        console.log("forge build failed");
        return;
      }

      console.log("forge build success");
      vscode.window.showInformationMessage("Contract build successful");
      panel.webview.postMessage({
        id: MessageId.buildCommandRunSuccess,
      });
    });
  });
}

const visitedFiles = new Set<string>();

function getRemappings(projectRoot: string): Record<string, string> {
  const remappingsPath = path.join(projectRoot, "remappings.txt");
  const remappings: Record<string, string> = {};

  if (!fs.existsSync(remappingsPath)) return remappings;

  const lines = fs
    .readFileSync(remappingsPath, "utf8")
    .split("\n")
    .filter(Boolean);
  for (const line of lines) {
    const [alias, target] = line.split("=");
    if (alias && target) {
      remappings[alias.replace(/\/+$/, "")] = target;
    }
  }

  return remappings;
}

function resolveImportPath(
  importPath: string,
  currentDir: string,
  projectRoot: string,
  remappings: Record<string, string>
): string | null {
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    return path.resolve(currentDir, importPath);
  }

  for (const alias in remappings) {
    if (importPath.startsWith(alias)) {
      const resolved = importPath.replace(alias, remappings[alias]);
      return path.resolve(projectRoot, resolved);
    }
  }

  return null;
}

function getContractsFromFile(
  filePath: string,
  projectRoot: string,
  remappings: Record<string, string>
): ContractInfo[] {
  const resolvedPath = path.resolve(filePath);
  if (visitedFiles.has(resolvedPath)) return [];
  visitedFiles.add(resolvedPath);

  const content = fs.readFileSync(resolvedPath, "utf8");
  const contracts: ContractInfo[] = [];

  try {
    // Match ONLY non-abstract, non-interface, non-library contracts
    const contractRegex = /^\s*contract\s+(\w+)/gm;
    let match: RegExpExecArray | null;

    while ((match = contractRegex.exec(content)) !== null) {
      const contractName = match[1];
      contracts.push({
        contractName,
        contractFilePath: resolvedPath,
        basename: path.basename(resolvedPath),
      });
    }

    // Recursively parse valid imports
    const importRegex =
      /^\s*import\s+(?:(?:\{[^}]+\})\s+from\s+)?["']([^"']+)["'];/gm;
    let importMatch: RegExpExecArray | null;
    while ((importMatch = importRegex.exec(content)) !== null) {
      const importPath = importMatch[1];
      const resolvedImport = resolveImportPath(
        importPath,
        path.dirname(resolvedPath),
        projectRoot,
        remappings
      );

      if (resolvedImport && fs.existsSync(resolvedImport)) {
        contracts.push(
          ...getContractsFromFile(resolvedImport, projectRoot, remappings)
        );
      }
    }
  } catch (err) {
    console.warn(`Error parsing file ${filePath}:`, err);
  }

  return contracts;
}

function getAllDeployableContracts(): ContractInfo[] {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    vscode.window.showErrorMessage("No workspace folder open");
    return [];
  }

  const projectRoot = workspaceFolders[0].uri.fsPath;
  const srcPath = path.join(projectRoot, "src");
  const remappings = getRemappings(projectRoot);

  const solFiles = getSolidityFiles(srcPath);
  visitedFiles.clear();

  return solFiles.flatMap((file) =>
    getContractsFromFile(file, projectRoot, remappings)
  );
}

function getSolidityFiles(dir: string): string[] {
  let files: string[] = [];

  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files = files.concat(getSolidityFiles(fullPath));
    } else if (stat.isFile() && file.endsWith(".sol")) {
      files.push(fullPath);
    }
  });

  return files;
}
