import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as vscode from "vscode";

let anvilProcess: ChildProcessWithoutNullStreams | null = null;
const ANVIL_PORT = "9545";

export function startAnvil(port = ANVIL_PORT) {
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

export function restartAnvil(port = ANVIL_PORT) {
  stopAnvil();
  startAnvil(port);
}

export function stopAnvil() {
  if (anvilProcess) {
    anvilProcess.kill();
    vscode.window.showInformationMessage("Anvil stopped.");
    anvilProcess = null;
  } else {
    vscode.window.showInformationMessage("Anvil is not running.");
  }
}
