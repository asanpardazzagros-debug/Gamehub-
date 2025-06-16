import { spawn, exec, ChildProcessWithoutNullStreams } from "child_process";
import { promisify } from "util";
import * as net from "net";
import * as vscode from "vscode";
import * as os from "os";

const execAsync = promisify(exec);

let anvilProcess: ChildProcessWithoutNullStreams | null = null;
const ANVIL_PORT = 9545;

// Helper function to get the correct anvil command for the platform
function getAnvilCommand(): string {
  return os.platform() === "win32" ? "anvil.exe" : "anvil";
}

// Cross-platform process killing
async function killProcessWithRetry(
  pid: string,
  maxRetries: number = 3
): Promise<void> {
  const isWindows = os.platform() === "win32";

  for (let i = 0; i < maxRetries; i++) {
    try {
      if (isWindows) {
        // Windows: Use taskkill
        try {
          // First try graceful termination
          await execAsync(`taskkill /PID ${pid} /T`);
          console.log(`Sent termination signal to PID ${pid}`);
        } catch {
          // If graceful fails, force kill
          await execAsync(`taskkill /F /PID ${pid} /T`);
          console.log(`Force killed PID ${pid}`);
        }
      } else {
        // Unix: Use kill command
        await execAsync(`kill -TERM ${pid}`);
        console.log(`Sent SIGTERM to PID ${pid}`);

        // Wait and check if process is still alive
        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
          await execAsync(`kill -0 ${pid}`); // Check if process exists
          console.log(`PID ${pid} still alive, trying SIGKILL`);
          await execAsync(`kill -KILL ${pid}`);
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch {
          // Process is dead
          console.log(`PID ${pid} successfully killed`);
          return;
        }
      }

      // Wait a bit and verify process is gone
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    } catch (err) {
      console.log(`Attempt ${i + 1} to kill PID ${pid} failed:`, err);
      if (i === maxRetries - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

// Cross-platform port process detection and cleanup
async function forceKillPortProcesses(): Promise<void> {
  console.log(`Checking for processes on port ${ANVIL_PORT}...`);
  const isWindows = os.platform() === "win32";

  try {
    let commands: string[] = [];

    if (isWindows) {
      // Windows commands to find processes using the port
      commands = [
        `netstat -ano | findstr :${ANVIL_PORT}`,
        `Get-Process | Where-Object {$_.ProcessName -eq "anvil"} | Select-Object -ExpandProperty Id`, // PowerShell fallback
      ];
    } else {
      // Unix commands
      commands = [
        `lsof -ti:${ANVIL_PORT}`,
        `netstat -tlnp 2>/dev/null | grep :${ANVIL_PORT} | awk '{print $7}' | cut -d'/' -f1`,
        `ss -tlnp | grep :${ANVIL_PORT} | grep -oP 'pid=\\K[0-9]+'`,
      ];
    }

    const allPids = new Set<string>();

    for (const cmd of commands) {
      try {
        const { stdout } = await execAsync(cmd, {
          shell: isWindows ? "cmd.exe" : "/bin/sh",
        });

        if (isWindows && cmd.includes("netstat")) {
          // Parse Windows netstat output
          const lines = stdout.trim().split("\n");
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== "0" && /^\d+$/.test(pid)) {
              allPids.add(pid);
            }
          }
        } else {
          // Parse Unix output or PowerShell output
          const pids = stdout
            .trim()
            .split("\n")
            .filter((pid) => pid && pid !== "" && /^\d+$/.test(pid.trim()));
          pids.forEach((pid) => allPids.add(pid.trim()));
        }
      } catch (err: any) {
        // Command failed, try next one
        console.log(`Command "${cmd}" failed:`, err.message);
      }
    }

    // Additional check for anvil processes by name
    try {
      const anvilCmd = isWindows
        ? `tasklist /FI "IMAGENAME eq anvil.exe" /FO CSV | findstr anvil`
        : `pgrep -f anvil`;

      const { stdout } = await execAsync(anvilCmd, {
        shell: isWindows ? "cmd.exe" : "/bin/sh",
      });

      if (isWindows) {
        // Parse CSV output from tasklist
        const lines = stdout.trim().split("\n");
        for (const line of lines) {
          if (line.includes("anvil")) {
            const parts = line.split(",");
            if (parts.length >= 2) {
              const pid = parts[1].replace(/"/g, "").trim();
              if (/^\d+$/.test(pid)) {
                allPids.add(pid);
              }
            }
          }
        }
      } else {
        const pids = stdout
          .trim()
          .split("\n")
          .filter((pid) => pid && /^\d+$/.test(pid));
        pids.forEach((pid) => allPids.add(pid));
      }
    } catch (err: any) {
      console.log("Failed to find anvil processes by name:", err.message);
    }

    if (allPids.size > 0) {
      console.log(
        `Found processes on port ${ANVIL_PORT}:`,
        Array.from(allPids)
      );

      // Kill all found processes
      for (const pid of allPids) {
        try {
          await killProcessWithRetry(pid);
        } catch (err) {
          console.error(`Failed to kill PID ${pid}:`, err);
        }
      }

      // Wait for processes to fully die
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else {
      console.log(`No processes found on port ${ANVIL_PORT}`);
    }
  } catch (err) {
    console.error("Error in forceKillPortProcesses:", err);
  }
}

// Test if port is actually free by trying to bind to it
function testPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.on("error", (err) => {
      console.log(`Port ${port} test failed:`, err.message);
      resolve(false);
    });

    server.listen(port, "127.0.0.1", () => {
      console.log(`Port ${port} is free`);
      server.close(() => resolve(true));
    });
  });
}

// Wait for port with exponential backoff
async function waitForPortWithBackoff(port: number): Promise<void> {
  const maxAttempts = 10;
  let attempt = 0;

  while (attempt < maxAttempts) {
    if (await testPortFree(port)) {
      return;
    }

    attempt++;
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
    console.log(
      `Port ${port} still in use, waiting ${delay}ms (attempt ${attempt}/${maxAttempts})`
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error(`Port ${port} is still in use after ${maxAttempts} attempts`);
}

export async function startAnvil(command: string): Promise<void> {
  console.log(`=== Starting Anvil with command: ${command} ===`);

  try {
    // Step 1: Stop our tracked process
    if (anvilProcess !== null) {
      console.log("Stopping existing tracked process...");
      await stopAnvil();
    }

    // Step 2: Force kill any processes on the port
    await forceKillPortProcesses();

    // Step 3: Wait for port to be free with backoff
    await waitForPortWithBackoff(ANVIL_PORT);

    // Step 4: Parse and prepare command
    const args = command
      .replace(/^anvil\s+/, "")
      .trim()
      .split(/\s+/);

    if (!args.includes("--steps-tracing")) {
      args.push("--steps-tracing");
    }

    console.log(`Starting Anvil with args:`, args);

    const anvilCmd = getAnvilCommand();
    const isWindows = os.platform() === "win32";

    // Step 5: Start the process with proper error handling
    return new Promise((resolve, reject) => {
      const spawnOptions: any = {
        stdio: ["pipe", "pipe", "pipe"],
        shell: isWindows,
      };

      if (isWindows) {
        spawnOptions.windowsHide = true;
      }

      anvilProcess = spawn(anvilCmd, args, spawnOptions);

      let resolved = false;
      let startupTimer: NodeJS.Timeout;

      const resolveOnce = () => {
        if (!resolved) {
          resolved = true;
          if (startupTimer) clearTimeout(startupTimer);
          resolve();
        }
      };

      const rejectOnce = (error: Error) => {
        if (!resolved) {
          resolved = true;
          if (startupTimer) clearTimeout(startupTimer);
          // Clean up the process
          if (anvilProcess) {
            try {
              if (isWindows) {
                anvilProcess.kill();
              } else {
                anvilProcess.kill("SIGKILL");
              }
            } catch (e) {
              console.error("Error killing failed process:", e);
            }
            anvilProcess = null;
          }
          reject(error);
        }
      };

      // Success detection
      anvilProcess.stdout.on("data", (data) => {
        const output = data.toString();
        console.log("Anvil stdout:", output.trim());

        if (output.includes("Listening on")) {
          console.log("✅ Anvil started successfully!");
          vscode.window.showInformationMessage(
            `Anvil started successfully on port ${ANVIL_PORT}`
          );
          resolveOnce();
        }
      });

      // Error detection
      anvilProcess.stderr.on("data", (data) => {
        const errorOutput = data.toString();
        console.error("Anvil stderr:", errorOutput.trim());

        if (
          errorOutput.includes("Address already in use") ||
          errorOutput.includes("bind: An attempt was made to access a socket")
        ) {
          rejectOnce(
            new Error(
              `Port ${ANVIL_PORT} is still in use. Try again in a few seconds.`
            )
          );
        } else if (
          errorOutput.includes("invalid") ||
          errorOutput.includes("failed") ||
          errorOutput.includes("error")
        ) {
          rejectOnce(new Error(`Anvil error: ${errorOutput.trim()}`));
        }
      });

      // Process spawn errors
      anvilProcess.on("error", (err) => {
        console.error("Anvil spawn error:", err);
        rejectOnce(new Error(`Failed to spawn Anvil: ${err.message}`));
      });

      // Unexpected exit
      anvilProcess.on("exit", (code, signal) => {
        console.log(`Anvil exited with code ${code}, signal ${signal}`);
        anvilProcess = null;

        if (code !== 0 && !resolved) {
          rejectOnce(new Error(`Anvil exited with code ${code}`));
        }
      });

      // Startup timeout
      startupTimer = setTimeout(() => {
        rejectOnce(new Error("Anvil startup timeout (20 seconds)"));
      }, 20000);
    });
  } catch (error) {
    console.error("Error in startAnvil:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to start Anvil: ${errorMsg}`);
    throw error;
  }
}

export async function restartAnvil(command: string): Promise<void> {
  console.log("=== Restarting Anvil ===");
  try {
    await startAnvil(command);
  } catch (error) {
    console.error("Restart failed:", error);
    throw error;
  }
}

export function stopAnvil(): Promise<void> {
  return new Promise((resolve) => {
    if (anvilProcess === null) {
      console.log("No Anvil process to stop");
      resolve();
      return;
    }

    console.log("Stopping Anvil process...");
    let resolved = false;
    const isWindows = os.platform() === "win32";

    const resolveOnce = () => {
      if (!resolved) {
        resolved = true;
        anvilProcess = null;
        console.log("✅ Anvil stopped");
        resolve();
      }
    };

    // Listen for exit
    anvilProcess.once("exit", (code, signal) => {
      console.log(`Anvil stopped with code ${code}, signal ${signal}`);
      resolveOnce();
    });

    // Force kill after timeout
    const killTimer = setTimeout(() => {
      if (anvilProcess && !resolved) {
        console.log("Force killing Anvil...");
        try {
          if (isWindows) {
            anvilProcess.kill(); // Windows doesn't support signal parameter
          } else {
            anvilProcess.kill("SIGKILL");
          }
        } catch (err) {
          console.error("Error force killing:", err);
        }
        setTimeout(resolveOnce, 1000);
      }
    }, 3000);

    anvilProcess.once("exit", () => {
      clearTimeout(killTimer);
    });

    // Try graceful shutdown
    try {
      if (isWindows) {
        anvilProcess.kill(); // Windows: just kill()
      } else {
        anvilProcess.kill("SIGTERM"); // Unix: SIGTERM first
      }
    } catch (err) {
      console.error("Error sending termination signal:", err);
      try {
        anvilProcess.kill(); // Fallback to basic kill
        setTimeout(resolveOnce, 1000);
      } catch (killErr) {
        console.error("Error sending kill signal:", killErr);
        resolveOnce();
      }
    }
  });
}
