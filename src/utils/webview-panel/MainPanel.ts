import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  MessageId,
  Terminals,
  VSCodeMessage,
  ProjectType,
} from "../../MessageId";
import { restartAnvil, startAnvil, stopAnvil } from "../AnvilHelperFunc";
import { disposeCommandTerminal, runBuildCommand } from "../CommandHelperFunc";
import {
  getAllDeployableContracts,
  isFoundryOrHardhatProject,
  createFoundryConfig,
} from "../FileHelperFunc";

export const slotMatrixMainPanel = (
  context: vscode.ExtensionContext
): vscode.WebviewPanel => {
  const panel = vscode.window.createWebviewPanel(
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
          // Check if this is a Hardhat project without foundry.toml
          const currentProjectType = isFoundryOrHardhatProject();
          const pwd = vscode.workspace.workspaceFolders;

          if (currentProjectType === ProjectType.hardhat && pwd?.length) {
            const projectRoot = pwd[0].uri.fsPath;
            const foundryConfigPath = path.join(projectRoot, "foundry.toml");

            // If foundry.toml doesn't exist, create it for Hardhat projects
            if (!fs.existsSync(foundryConfigPath)) {
              try {
                createFoundryConfig();
                vscode.window.showInformationMessage(
                  "Created foundry.toml for Hardhat project"
                );
              } catch (error) {
                vscode.window.showErrorMessage(
                  `Failed to create foundry.toml: ${error}`
                );
                break;
              }
            }
          }

          runBuildCommand(panel);
          break;
        case MessageId.createTerminal:
          if (message.data.type === Terminals.anvilTerminal) {
            startAnvil(message.data.command);
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

        case MessageId.getProjectType:
          const projectType = isFoundryOrHardhatProject();
          panel.webview.postMessage({
            id: MessageId.getProjectType,
            data: projectType,
          });
          break;
      }
    },
    undefined,
    context.subscriptions
  );
  panel.onDidDispose(() => {
    vscode.commands.executeCommand("setContext", "slotmatrixPanelOpen", false);
    stopAnvil();
    disposeCommandTerminal();
  });
  return panel;
};
