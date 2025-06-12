import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ContractInfo } from "../type";
import { ProjectType } from "../MessageId";

const visitedFiles = new Set<string>();

export function getAllDeployableContracts(): ContractInfo[] {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    vscode.window.showErrorMessage("No workspace folder open");
    return [];
  }

  const projectRoot = workspaceFolders[0].uri.fsPath;
  const projectType = isFoundryOrHardhatProject();

  // Determine source directory based on project type
  let srcPath: string;
  if (projectType === ProjectType.foundry) {
    srcPath = path.join(projectRoot, "src");
  } else if (projectType === ProjectType.hardhat) {
    srcPath = path.join(projectRoot, "contracts");
  } else {
    // Try both directories if project type is unknown
    const foundryPath = path.join(projectRoot, "src");
    const hardhatPath = path.join(projectRoot, "contracts");

    if (fs.existsSync(foundryPath)) {
      srcPath = foundryPath;
    } else if (fs.existsSync(hardhatPath)) {
      srcPath = hardhatPath;
    } else {
      vscode.window.showErrorMessage(
        "No contracts directory found (src or contracts)"
      );
      return [];
    }
  }

  console.log(`log : ${srcPath}`);
  if (!fs.existsSync(srcPath)) {
    vscode.window.showErrorMessage(`Contracts directory not found: ${srcPath}`);
    return [];
  }

  const remappings = getRemappings(projectRoot);
  const solFiles = getSolidityFiles(srcPath);
  visitedFiles.clear();

  return solFiles.flatMap((file) =>
    getContractsFromFile(file, projectRoot, remappings, projectType)
  );
}

function getSolidityFiles(dir: string): string[] {
  let files: string[] = [];

  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files = files.concat(getSolidityFiles(fullPath));
    } else if (stat.isFile() && file.endsWith(".sol")) {
      files.push(fullPath);
    }
  });

  return files;
}

function getRemappings(projectRoot: string): Record<string, string> {
  const remappingsPath = path.join(projectRoot, "remappings.txt");
  const remappings: Record<string, string> = {};

  if (!fs.existsSync(remappingsPath)) return remappings;

  const lines = fs
    .readFileSync(remappingsPath, "utf8")
    .split("\n")
    .filter(Boolean);
  for (const line of lines) {
    const [alias, target] = line.split("=");
    if (alias && target) {
      remappings[alias.replace(/\/+$/, "")] = target;
    }
  }

  return remappings;
}

function getContractsFromFile(
  filePath: string,
  projectRoot: string,
  remappings: Record<string, string>,
  projectType: string
): ContractInfo[] {
  const resolvedPath = path.resolve(filePath);
  if (visitedFiles.has(resolvedPath)) return [];
  visitedFiles.add(resolvedPath);

  const content = fs.readFileSync(resolvedPath, "utf8");
  const contracts: ContractInfo[] = [];

  try {
    // Match ONLY non-abstract, non-interface, non-library contracts
    const contractRegex = /^\s*contract\s+(\w+)/gm;
    let match: RegExpExecArray | null;

    while ((match = contractRegex.exec(content)) !== null) {
      const contractName = match[1];
      contracts.push({
        contractName,
        contractFilePath: resolvedPath,
        basename: path.basename(resolvedPath),
      });
    }

    // Recursively parse valid imports
    const importRegex =
      /^\s*import\s+(?:(?:\{[^}]+\})\s+from\s+)?["']([^"']+)["'];/gm;
    let importMatch: RegExpExecArray | null;
    while ((importMatch = importRegex.exec(content)) !== null) {
      const importPath = importMatch[1];
      const resolvedImport = resolveImportPath(
        importPath,
        path.dirname(resolvedPath),
        projectRoot,
        remappings,
        projectType
      );

      if (resolvedImport && fs.existsSync(resolvedImport)) {
        contracts.push(
          ...getContractsFromFile(
            resolvedImport,
            projectRoot,
            remappings,
            projectType
          )
        );
      }
    }
  } catch (err) {
    console.warn(`Error parsing file ${filePath}:`, err);
  }

  return contracts;
}

function resolveImportPath(
  importPath: string,
  currentDir: string,
  projectRoot: string,
  remappings: Record<string, string>,
  projectType: string
): string | null {
  // Handle relative imports
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    return path.resolve(currentDir, importPath);
  }

  // Handle remappings (for Foundry projects)
  for (const alias in remappings) {
    if (importPath.startsWith(alias)) {
      const resolved = importPath.replace(alias, remappings[alias]);
      return path.resolve(projectRoot, resolved);
    }
  }

  // Handle node_modules imports (especially for Hardhat projects)
  if (!importPath.startsWith("./") && !importPath.startsWith("../")) {
    // Try node_modules first
    const nodeModulesPath = path.resolve(
      projectRoot,
      "node_modules",
      importPath
    );
    if (fs.existsSync(nodeModulesPath)) {
      return nodeModulesPath;
    }

    // For Hardhat projects, also try common library paths
    if (projectType === ProjectType.hardhat) {
      // Try @openzeppelin, @chainlink, etc. in node_modules
      const commonPaths = [
        path.resolve(projectRoot, "node_modules", importPath),
        path.resolve(
          projectRoot,
          "node_modules",
          "@openzeppelin",
          "contracts",
          importPath.replace("@openzeppelin/contracts/", "")
        ),
        path.resolve(
          projectRoot,
          "node_modules",
          "@chainlink",
          "contracts",
          importPath.replace("@chainlink/contracts/", "")
        ),
      ];

      for (const commonPath of commonPaths) {
        if (fs.existsSync(commonPath)) {
          return commonPath;
        }
      }
    }

    // Try lib directory (for Foundry forge-std and other libs)
    const libPath = path.resolve(projectRoot, "lib", importPath);
    if (fs.existsSync(libPath)) {
      return libPath;
    }
  }

  return null;
}

export function isFoundryOrHardhatProject(): string {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
      vscode.window.showErrorMessage("No workspace folder open");
      return ProjectType.none;
    }
    const projectRoot = workspaceFolders[0].uri.fsPath;

    // Check for Hardhat config files FIRST (priority over foundry.toml)
    const hardhatConfigJsPath = path.join(projectRoot, "hardhat.config.js");
    const hardhatConfigTsPath = path.join(projectRoot, "hardhat.config.ts");

    if (
      fs.existsSync(hardhatConfigJsPath) ||
      fs.existsSync(hardhatConfigTsPath)
    ) {
      return ProjectType.hardhat;
    }

    // Check for package.json with hardhat dependency
    const packageJsonPath = path.join(projectRoot, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf8")
        );
        const dependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };
        if (dependencies.hardhat || dependencies["@nomiclabs/hardhat-ethers"]) {
          return ProjectType.hardhat;
        }
      } catch (err) {
        console.warn("Error parsing package.json:", err);
      }
    }

    // Only check for foundry.toml if no Hardhat indicators were found
    const foundryConfigPath = path.join(projectRoot, "foundry.toml");
    if (fs.existsSync(foundryConfigPath)) {
      return ProjectType.foundry;
    }

    return ProjectType.none;
  } catch (error) {
    console.log(`isFoundryOrHardhatProject error : ${error}`);
    return ProjectType.none;
  }
}

export function createFoundryConfig(): void {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const projectRoot = workspaceFolders[0].uri.fsPath;
  const projectType = isFoundryOrHardhatProject();

  // Use 'contracts' for Hardhat projects, 'src' for Foundry projects
  const srcFolder = projectType === ProjectType.hardhat ? "contracts" : "src";

  const foundryConfig = `[profile.default]
src = '${srcFolder}'
out = 'out'
libs = ['node_modules', 'lib']
`;

  const configPath = path.join(projectRoot, "foundry.toml");
  const gitignorePath = path.join(projectRoot, ".gitignore");

  try {
    // Create foundry.toml
    fs.writeFileSync(configPath, foundryConfig, "utf8");
    console.log("foundry.toml created successfully");

    // Add foundry.toml to .gitignore
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
      if (!gitignoreContent.includes("foundry.toml")) {
        fs.appendFileSync(gitignorePath, "\nfoundry.toml\n", "utf8");
        console.log("foundry.toml added to .gitignore");
      } else {
        console.log("foundry.toml already exists in .gitignore");
      }
    } else {
      fs.writeFileSync(gitignorePath, "foundry.toml\n", "utf8");
      console.log(".gitignore created with foundry.toml entry");
    }
  } catch (error) {
    console.error("Error creating files:", error);
    throw error;
  }
}
