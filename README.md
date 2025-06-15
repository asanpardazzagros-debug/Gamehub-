# Slot Matrix

**Code. Deploy. Inspect. All in One Matrix.**
<br/>
![Slot Matrix Version](https://img.shields.io/badge/SlotMatrix-0.2.0-blue?logo=visualstudiocode&logoColor=white&style=flat)

<p align="center">
  <img src="./assets/slotmatrix-logo.png" alt="Slot Matrix Logo" height="250"/>
</p>

**Slot Matrix** is a powerful Visual Studio Code extension designed for smart contract developers and auditors. It provides a seamless and visual interface for testing, inspecting, and understanding Ethereum contracts—right from your IDE. With version 0.2.0, Slot Matrix delivers its first stable release, bringing robust compatibility with both Foundry and Hardhat, a Remix-like experience, and enhanced debugging tools.

## 🎥 Demo

See Slot Matrix in action:

<p align="center">
  <a href="https://www.youtube.com/watch?v=c3Jfdv1Szv0" target="_blank">
    <img src="./assets/demo1.gif" alt="Slot Matrix Demo 1" />
  </a>
  <br/>
  <strong><a href="https://www.youtube.com/watch?v=c3Jfdv1Szv0" target="_blank">▶ Watch Demo 1 on YouTube</a></strong>
</p>

<p align="center">
  <a href="https://www.youtube.com/watch?v=s29JBp9ZCjc" target="_blank">
    <img src="./assets/demo2.gif" alt="Slot Matrix Demo 2" />
  </a>
  <br/>
  <strong><a href="https://www.youtube.com/watch?v=s29JBp9ZCjc" target="_blank">▶ Watch Demo 2 on YouTube</a></strong>
</p>

## ✨ Key Features

- 🧪 **Interact** with smart contracts using a clean, Remix-like UI integrated into VS Code.
- 🧠 **Storage Layout Visualization**: View contract storage layouts in JSON format for easy inspection.
- ⚙️ **Foundry & Hardhat Compatibility**: Seamlessly works with both Foundry and Hardhat-based projects.
- 💾 **Complete Terminal Abstraction**: Manage your workflow without leaving VS Code—no terminal required.
- 📜 **Well-Formatted Log Data**: Debug efficiently with clear, structured log outputs.
- 🚀 **Automated Build Workflow**: Automatically runs `forge clean` and `forge build --extra-output storageLayout` or equivalent Hardhat commands on file save.

## 📦 Requirements

To use Slot Matrix, ensure you have:

- **Visual Studio Code** `v1.85.0` or higher.
- **Foundry** installed with `forge` and `anvil` accessible from your terminal.
- **Hardhat** installed for Hardhat-based projects (optional).
- A valid **Foundry-compatible** or **Hardhat-compatible** project structure (Solidity files in `src` for Foundry or `contracts` for Hardhat).

### Install Foundry

Run the following commands to install Foundry:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

> **Note for Windows Users**: Run the above commands using [Git Bash](https://gitforwindows.org/) or [Windows Subsystem for Linux (WSL)](https://learn.microsoft.com/en-us/windows/wsl/install).

## 🚀 Usage & Commands

Slot Matrix simplifies your smart contract development workflow. Below is a table of available commands:

| Command                                               | Description                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `SlotMatrix: Welcome`                                 | Opens the Slot Matrix welcome page.                                                                                       |
| `SlotMatrix: Start`                                   | Launches the Slot Matrix dashboard.                                                                                       |
| `SlotMatrix: Save Contracts` (`Cmd/Ctrl + Shift + S`) | Triggers `forge clean` and `forge build --extra-output storageLayout` (or equivalent Hardhat commands) in the background. |

To access commands:

- Press `Cmd+Shift+P` (or `Ctrl+Shift+P` on Windows) and search for `SlotMatrix`.

## 💻 Use Cases

- **Prototyping**: Rapidly interact with and test smart contracts within VS Code.
- **Debugging**: Inspect storage layouts and debug proxy patterns with ease.
- **Auditing**: Visualize contract storage and log data for thorough analysis.
- **Development**: Streamline Foundry and Hardhat workflows with automated builds and terminal abstraction.

## 🙌 Contributing

We welcome contributions, suggestions, and bug reports!

- 🐞 [Report Issues](https://github.com/Anmol-Dhiman/SlotMatrix/issues)
- 🌱 Submit a PR to improve the extension
- ⭐ Star the [GitHub repo](https://github.com/Anmol-Dhiman/SlotMatrix) if you find this useful!

## 💬 Support & Contact

Need help or want to connect?

- 🗂 [GitHub Issues](https://github.com/Anmol-Dhiman/SlotMatrix/issues)
- 🐦 [@sherlockvarm](https://x.com/sherlockvarm) on X

## 📄 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

<p align="center">
  Built with ❤️ by <strong><a href="https://github.com/Anmol-Dhiman">Anmol Dhiman</a></strong>
</p>
