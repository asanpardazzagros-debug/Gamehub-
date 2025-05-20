<p align="center">
  <img src="./assets/slotmatrix-logo.png" alt="Slot Matrix Logo" width="250"/>
</p>

# Slot Matrix

> Code. Deploy. Inspect. All in One Matrix.

Slot Matrix is a powerful Visual Studio Code extension that lets you interact with smart contracts easily and visually. Whether you’re a developer or auditor, Slot Matrix provides a seamless experience for testing, inspecting, and understanding Ethereum contracts—right inside your IDE.

## 📽️ Demo

Experience **Slot Matrix** in action:

<p align="center">
  <a href="https://www.youtube.com/watch?v=c3Jfdv1Szv0" target="_blank">
    <img src="./assets/demo1.gif" alt="Slot Matrix Demo 1"  />
  </a>
  <br/>
  <strong><a href="https://www.youtube.com/watch?v=c3Jfdv1Szv0" target="_blank">▶️ Watch Demo 1 on YouTube</a></strong>
</p>

<br/>

<p align="center">
  <a href="https://www.youtube.com/watch?v=s29JBp9ZCjc" target="_blank">
    <img src="./assets/demo2.gif" alt="Slot Matrix Demo 2"  />
  </a>
  <br/>
  <strong><a href="https://www.youtube.com/watch?v=s29JBp9ZCjc" target="_blank">▶️ Watch Demo 2 on YouTube</a></strong>
</p>

## ✨ Features

- 🧪 Interact with smart contracts (like in Remix) using an intuitive UI.

- 🧠 View the **storage layout** of your contracts in a clean, formatted manner.

- ⚙️ Automatically starts a local **Anvil** node on port `9545` and manages it dynamically.

- 💾 Automatically runs:
  - `forge clean`
  - `forge build --extra-output storageLayout`
    on file save (`Cmd+S` or `Ctrl+S`).

## 🚀 Commands

- `Cmd+Shift+P` → type `SlotMatrix: Open` to launch the extension panel.
- `Cmd+S` / `Ctrl+S` → automatically builds and updates storage layout view.

## 📦 Requirements

- Visual Studio Code `v1.85.0+`
- [Foundry](https://book.getfoundry.sh/) installed and accessible via `forge` and `anvil` in your terminal
- A **Foundry-compatible project** structure

## 💻 Use Cases

- Interact with smart contracts during development and testing.
- View and debug **storage layouts** for upgradeable contracts.
- Test and debug **proxy patterns** visually.
- Rapid prototyping with Anvil running in the background.

## 🙌 Contribute

Got feedback, ideas, or bugs? [Open an issue](https://github.com/Anmol-Dhiman/SlotMatrix)!

## 🛠️ Version

Current release: **v0.0.3** (Beta)


## 💬 Support

Need help or have questions? Feel free to:

- Open an issue on the [GitHub repository](https://github.com/Anmol-Dhiman/SlotMatrix/issues)
- Reach out via Twitter: [@sherlockvarm](https://x.com/sherlockvarm)

We welcome your feedback and are happy to assist!
