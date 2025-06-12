import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as vscode from "vscode";

let anvilProcess: ChildProcessWithoutNullStreams | null = null;
const ANVIL_PORT = "9545";

export function startAnvil(command: string) {
  console.log(`log : ${command}`);
  if (anvilProcess) {
    stopAnvil();
  }

  // Parse command to get arguments
  const args = command
    .replace(/^anvil\s+/, "")
    .trim()
    .split(/\s+/);

  // Add steps-tracing if not already present
  if (!args.includes("--steps-tracing")) {
    args.push("--steps-tracing");
  }
  console.log(`log : ${args}`);
  anvilProcess = spawn("anvil", args);

  anvilProcess.stdout.on("data", (data) => {
    const output = data.toString();
    if (output.includes("Listening on")) {
      vscode.window.showInformationMessage(
        `Anvil started successfully on port ${ANVIL_PORT}`
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
  });
}

export function restartAnvil() {
  stopAnvil();
  // startAnvil(port);
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
