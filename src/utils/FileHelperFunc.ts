import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ContractInfo } from "../type";
const visitedFiles = new Set<string>();
export function getAllDeployableContracts(): ContractInfo[] {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    vscode.window.showErrorMessage("No workspace folder open");
    return [];
  }

  const projectRoot = workspaceFolders[0].uri.fsPath;
  const srcPath = path.join(projectRoot, "src");
  const remappings = getRemappings(projectRoot);

  const solFiles = getSolidityFiles(srcPath);
  visitedFiles.clear();

  return solFiles.flatMap((file) =>
    getContractsFromFile(file, projectRoot, remappings)
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
  remappings: Record<string, string>
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
        remappings
      );

      if (resolvedImport && fs.existsSync(resolvedImport)) {
        contracts.push(
          ...getContractsFromFile(resolvedImport, projectRoot, remappings)
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
  remappings: Record<string, string>
): string | null {
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    return path.resolve(currentDir, importPath);
  }

  for (const alias in remappings) {
    if (importPath.startsWith(alias)) {
      const resolved = importPath.replace(alias, remappings[alias]);
      return path.resolve(projectRoot, resolved);
    }
  }

  return null;
}
