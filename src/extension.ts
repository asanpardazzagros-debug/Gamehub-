import * as vscode from "vscode";
import { MessageId } from "./MessageId";
import { getAllDeployableContracts } from "./utils/FileHelperFunc";
import { runBuildCommand } from "./utils/CommandHelperFunc";
import { showWelcomePage } from "./utils/webview-panel/WelcomePanel";
import { slotMatrixMainPanel } from "./utils/webview-panel/MainPanel";

let panel: vscode.WebviewPanel | undefined = undefined;
let welcomePanel: vscode.WebviewPanel | undefined = undefined;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("slotmatrix.panelView", () => {
      panel = slotMatrixMainPanel(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("slotmatrix.customSave", () => {
      if (panel === undefined) {
        vscode.window.showErrorMessage("Start SlotMatrix first!!");
        return;
      }
      runBuildCommand(panel);
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
      welcomePanel = showWelcomePage(context);
    })
  );

  const hasShownWelcome = context.globalState.get("hasShownWelcome", false);
  if (!hasShownWelcome) {
    // Show welcome page on first install
    welcomePanel = showWelcomePage(context);
    context.globalState.update("hasShownWelcome", true);
  }
}

export function deactivate() {
  if (welcomePanel) {
    welcomePanel.dispose();
  }
  if (panel) {
    panel.dispose();
  }
}
