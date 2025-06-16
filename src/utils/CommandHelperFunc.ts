import * as vscode from "vscode";
import { spawn, spawnSync } from "child_process";
import { MessageId } from "../MessageId";
import * as os from "os";

let commandTerminal: vscode.Terminal | undefined = undefined;

// Helper function to get the correct command for the platform
function getForgeCommand(): string {
  return os.platform() === "win32" ? "forge.exe" : "forge";
}

// Helper function to create spawn options with proper shell configuration
function getSpawnOptions(cwd: string) {
  return {
    cwd,
    shell: true,
    // On Windows, we might need to use cmd.exe explicitly
    ...(os.platform() === "win32" && {
      shell: process.env.COMSPEC || "cmd.exe",
    }),
  };
}

export function runBuildCommand(panel: vscode.WebviewPanel) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const pathCwd = workspaceFolders[0].uri.fsPath;
  console.log("pathCwd : ", pathCwd);

  const forgeCmd = getForgeCommand();
  const spawnOptions = getSpawnOptions(pathCwd);

  // Step 1: Run `forge clean`
  const clean = spawn(forgeCmd, ["clean"], spawnOptions);

  clean.stderr.on("data", (data) => {
    console.log(`forge clean stderr: ${data}`);
  });

  clean.on("error", (error) => {
    console.error("Error spawning forge clean:", error);
    vscode.window.showErrorMessage(
      `Failed to run forge clean: ${error.message}`
    );
    panel.webview.postMessage({
      id: MessageId.buildCommandFailed,
    });
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
    const build = spawn(
      forgeCmd,
      ["build", "--extra-output", "storageLayout"],
      spawnOptions
    );

    let output = "";
    let errorOutput = "";

    build.stdout.on("data", (data) => {
      output += data.toString();
    });

    build.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    build.on("error", (error) => {
      console.error("Error spawning forge build:", error);
      vscode.window.showErrorMessage(
        `Failed to run forge build: ${error.message}`
      );
      panel.webview.postMessage({
        id: MessageId.buildCommandFailed,
      });
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

export function isFoundryInstalledSync(): boolean {
  try {
    const forgeCmd = getForgeCommand();
    const result = spawnSync(forgeCmd, ["--version"], {
      encoding: "utf8",
      timeout: 5000,
      stdio: "pipe",
      shell: true,
      // On Windows, specify the shell explicitly if needed
      ...(os.platform() === "win32" && {
        shell: process.env.COMSPEC || "cmd.exe",
      }),
    });

    return (
      result.status === 0 && !!result.stdout && result.stdout.trim().length > 0
    );
  } catch (error) {
    console.error("Error checking Foundry installation:", error);
    return false;
  }
}

// Alternative version that tries multiple approaches for better Windows compatibility
export function isFoundryInstalledSyncRobust(): boolean {
  const attempts = [
    // Try with .exe extension
    () =>
      spawnSync("forge.exe", ["--version"], {
        encoding: "utf8",
        timeout: 5000,
        stdio: "pipe",
        shell: true,
      }),
    // Try without extension but with shell
    () =>
      spawnSync("forge", ["--version"], {
        encoding: "utf8",
        timeout: 5000,
        stdio: "pipe",
        shell: true,
      }),
    // Try with explicit cmd.exe on Windows
    ...(os.platform() === "win32"
      ? [
          () =>
            spawnSync("forge", ["--version"], {
              encoding: "utf8",
              timeout: 5000,
              stdio: "pipe",
              shell: "cmd.exe",
            }),
        ]
      : []),
  ];

  for (const attempt of attempts) {
    try {
      const result = attempt();
      if (
        result.status === 0 &&
        !!result.stdout &&
        result.stdout.trim().length > 0
      ) {
        return true;
      }
    } catch (error) {
      console.log("Attempt failed:", error);
      continue;
    }
  }

  return false;
}
