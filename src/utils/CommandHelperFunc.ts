import * as vscode from "vscode";
import { spawn } from "child_process";
import { MessageId } from "../MessageId";

let commandTerminal: vscode.Terminal | undefined = undefined;

export function runBuildCommand(panel: vscode.WebviewPanel) {
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

export function disposeCommandTerminal() {
  if (commandTerminal !== undefined) {
    commandTerminal.dispose();
    commandTerminal = undefined;
  }
}
