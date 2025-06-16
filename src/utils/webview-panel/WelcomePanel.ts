import * as vscode from "vscode";

export const showWelcomePage = (
  context: vscode.ExtensionContext
): vscode.WebviewPanel => {
  const welcomePanel = vscode.window.createWebviewPanel(
    "welcomePage",
    "Welcome to SlotMatrix",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
    }
  );

  welcomePanel.webview.html = getWelcomePageContent(
    context,
    welcomePanel.webview
  );

  return welcomePanel;
};

function getWelcomePageContent(
  context: vscode.ExtensionContext,
  webview: vscode.Webview
): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        font-family: monospace;
        margin: 32px auto;
        color: #cccccc;
        background-color: #1e1e1e;
        line-height: 1.5;
        max-width: 800px;
      }

      .header {
        text-align: center;
        margin-bottom: 40px;
      }

      .title {
        font-size: 24px;
        color: #ffffff;
        margin-bottom: 8px;
      }

      .subtitle {
        color: #9cdcfe;
        margin-bottom: 24px;
      }

      .logo {
        height: 250px;
        margin: 24px 0;
      }

      .quick-access {
        background-color: #252526;
        padding: 12px;
        border-radius: 4px;
        margin: 20px 0;
        font-size: 14px;
      }

      .section {
        margin: 32px 0;
      }

      .section-title {
        font-size: 18px;
        color: #ffffff;
        margin-bottom: 16px;
        border-bottom: 1px solid #3e3e42;
        padding-bottom: 4px;
      }

      .code-container {
        position: relative;
        margin: 8px 0;
      }

      .code {
        background-color: #252526;
        padding: 8px 12px;
        border-radius: 3px;
        font-family: monospace;
        color: #d4d4d4;
        display: block;
        padding-right: 45px;
      }

      .copy-btn {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: #3c3c3c;
        border: none;
        color: #cccccc;
        width: 32px;
        height: 24px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .copy-btn:hover {
        background: #4a4a4a;
        color: #ffffff;
      }

      .copy-btn:active {
        background: #007acc;
        transform: translateY(-50%) scale(0.95);
      }

      .copy-btn.copied {
        background: #22bb22;
        color: #ffffff;
      }

      .kbd {
        background-color: #3c3c3c;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
        color: #ffffff;
      }

      .feature {
        margin: 16px 0;
        padding: 12px;
        background-color: #252526;
        border-radius: 4px;
        border-left: 3px solid #007acc;
        line-height: 1.6;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        cursor: default;
      }

      .feature:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        background-color: #2a2a2b;
      }

      .command {
        margin: 12px 0;
        padding: 8px 0;
        border-bottom: 1px solid #3e3e42;
      }

      .command:last-child {
        border-bottom: none;
      }

      .command-name {
        color: #9cdcfe;
        font-weight: bold;
      }

      .note {
        background-color: #2d2d30;
        padding: 12px;
        border-left: 3px solid #ffa726;
        margin: 16px 0;
      }

      .footer {
        text-align: center;
        margin-top: 48px;
        padding-top: 16px;
        border-top: 1px solid #3e3e42;
        color: #969696;
      }

      a {
        color: #4fc3f7;
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">Welcome to SlotMatrix</div>
      <div class="subtitle">Code. Deploy. Inspect. All in One Matrix!</div>
      <img
        src="https://videos.openai.com/vg-assets/assets%2Ftask_01jvp221eeftvbmeqdbh0kn672%2F1747718376_img_3.webp?st=2025-06-09T10%3A32%3A38Z&se=2025-06-15T11%3A32%3A38Z&sks=b&skt=2025-06-09T10%3A32%3A38Z&ske=2025-06-15T11%3A32%3A38Z&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skoid=aa5ddad1-c91a-4f0a-9aca-e20682cc8969&skv=2019-02-02&sv=2018-11-09&sr=b&sp=r&spr=https%2Chttp&sig=l%2B1gttj%2F%2FDkzML1l2jDggoxzGvio1vJNIBeOQteCVUk%3D&az=oaivgprodscus"
        alt="SlotMatrix Logo"
        class="logo"
      />

      <div>
        Press <span class="kbd">Cmd</span>/<span class="kbd">Ctrl</span> +
        <span class="kbd">Shift</span> + <span class="kbd">P</span>
        and choose "SlotMatrix: Welcome" to return to this guide.
      </div>
    </div>

    <div class="section">
      <div class="section-title">Initial Setup</div>
      <p>
        This extension requires
        <a href="https://getfoundry.sh/" target="_blank"
          ><strong>Foundry (Anvil)</strong></a
        >
        as the local blockchain environment.
      </p>

      <p>Install Foundry:</p>
      <div class="code-container">
        <div class="code">curl -L https://foundry.paradigm.xyz | bash</div>
        <button
          class="copy-btn"
          onclick="copyToClipboard('curl -L https://foundry.paradigm.xyz | bash', this)"
        >
          📋
        </button>
      </div>
      <div class="code-container">
        <div class="code">foundryup</div>
        <button class="copy-btn" onclick="copyToClipboard('foundryup', this)">
          📋
        </button>
      </div>

      <div class="note">
        <strong>Note:</strong> On Windows, run these commands using
        <a target="_blank" href="https://gitforwindows.org/">Git Bash</a> or
        <a
          target="_blank"
          href="https://learn.microsoft.com/en-us/windows/wsl/install"
          >WSL</a
        >.
      </div>
    </div>

    <div class="section">
      <div class="section-title">Features</div>
      <div class="feature">
        Interact with your smart contracts using an intuitive interface, similar
        to Remix but integrated directly into VS Code.
      </div>
      <div class="feature">
        Visualize and understand your contract's storage layout with clear, json
        view.
      </div>
      <div class="feature">
        View formatted log outputs that make debugging easier and more
        efficient.
      </div>
      <div class="feature">
        Complete abstraction from terminal-based interactions - everything you
        need is accessible through the VS Code interface.
      </div>
    </div>

    <div class="section">
      <div class="section-title">Commands</div>
      <div class="command">
        <div class="command-name">SlotMatrix : Welcome</div>
        <div>Open this welcome page</div>
      </div>
      <div class="command">
        <div class="command-name">SlotMatrix : Start</div>
        <div>Start SlotMatrix dashboard</div>
      </div>
      <div class="command">
        <div class="command-name">SlotMatrix : Save Contracts (Cmd/Ctrl + Shift + S)</div>
        <div>
          Run <span class="kbd">forge clean</span> and
          <span class="kbd">forge build --extra-output storageLayout</span> in
          background
        </div>
      </div>
      <p style="text-align: center">
        Press <span class="kbd">Cmd</span>/<span class="kbd">Ctrl</span> +
        <span class="kbd">Shift</span> + <span class="kbd">P</span> to access
        these commands.
      </p>
    </div>

    <div class="footer">
      Found an issue? We'd love to hear about it! Please consider opening an
      issue on
      <a
        href="https://github.com/Anmol-Dhiman/SlotMatrix"
        style="
          color: #4fc3f7;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        "
        target="_blank"
      >
        GitHub
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#4fc3f7">
          <path
            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
          />
        </svg> </a
      >.
    </div>

    <script>
      function copyToClipboard(text, button) {
        navigator.clipboard
          .writeText(text)
          .then(function () {
            // Show success feedback
            button.classList.add("copied");
            button.innerHTML = "✓";

            // Reset button after 2 seconds
            setTimeout(function () {
              button.classList.remove("copied");
              button.innerHTML = "📋";
            }, 1000);
          })
          .catch(function (err) {
            console.error("Failed to copy text: ", err);
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);

            button.classList.add("copied");
            button.innerHTML = "✓";

            setTimeout(function () {
              button.classList.remove("copied");
              button.innerHTML = "📋";
            }, 1000);
          });
      }
    </script>
  </body>
</html>
`;
}
