import { MessageId, VSCodeMessage } from "../../src/MessageId";
import {
  isAddress,
  formatEther,
  parseUnits,
  decodeEventLog,
  decodeErrorResult,
  decodeFunctionResult,
} from "viem";
import { Input, LogData } from "./Types";
import { vscode } from "../src/App";

export function consoleLog(message: string) {
  vscode.postMessage({
    id: MessageId.log,
    data: `from frontend : ${message}`,
  });
}

export function showError(message: string) {
  vscode.postMessage({
    id: MessageId.showMessage,
    data: {
      id: VSCodeMessage.error,
      data: message,
    },
  });
}

export function parseArgs(inputs: Input[]): any[] {
  const result: any[] = [];

  for (const input of inputs) {
    const { type, value, name } = input;

    try {
      if (
        (type.startsWith("uint") || type.startsWith("int")) &&
        !type.endsWith("[]")
      ) {
        const bits = parseInt(type.replace(/\D/g, "")) || 256;
        const inputValue = BigInt(value);

        if (type.startsWith("uint")) {
          const max = (1n << BigInt(bits)) - 1n;
          if (inputValue < 0n || inputValue > max) {
            showError(`Value ${inputValue} is out of range for ${type}`);
            return [];
          }
        } else {
          const min = -(1n << (BigInt(bits) - 1n));
          const max = (1n << (BigInt(bits) - 1n)) - 1n;
          if (inputValue < min || inputValue > max) {
            showError(`Value ${inputValue} is out of range for ${type}`);
            return [];
          }
        }
        result.push(inputValue.toString());
      } else if (type === "address") {
        if (isAddress(value)) {
          result.push(value);
        } else {
          showError(`${name} is not a valid address`);
        }
      } else if (type === "bytes32") {
        const isHex =
          value.startsWith("0x") && /^[0-9a-fA-F]*$/.test(value.slice(2));
        const isCorrectLength = value.length === 66;

        if (isHex && isCorrectLength) {
          result.push(value);
        } else {
          showError(
            `${name} is not a valid bytes32. Expected a 0x-prefixed hex string of 32 bytes (64 hex characters)`
          );
        }
      } else if (type === "bool") {
        const boolValue = BigInt(value);
        if (boolValue === 0n || boolValue === 1n) {
          result.push(Boolean(boolValue));
        } else {
          showError(`Invalid bool value for ${name}`);
        }
      } else if (type === "string") {
        result.push(value);
      } else if (type.startsWith("bytes")) {
        const isHex = /^0x[0-9a-fA-F]*$/.test(value);
        const isEvenLength = value.length % 2 === 0;

        // Special case for empty bytes
        if (value === "0x" || value === "" || (isHex && isEvenLength)) {
          result.push(value === "" ? "0x" : value);
        } else {
          showError(`Invalid bytes value for ${name}`);
        }
      } else if (type.endsWith("[]")) {
        const elementType = type.slice(0, -2);

        const parsedArray = JSON.parse(value);
        if (!Array.isArray(parsedArray)) {
          showError(`Value for ${name} is not a valid array`);
          return [];
        }

        const parsedArrayValue = parsedArray.map(
          (item) =>
            parseArgs([
              {
                name: "",
                type: elementType,
                value: JSON.stringify(item),
                components: input.components,
              },
            ])[0]
        );

        result.push(parsedArrayValue);
      } else if (type === "tuple") {
        const parsedArray = JSON.parse(value);

        if (parsedArray === null || !Array.isArray(parsedArray)) {
          showError(`Invalid tuple value for ${name}, must be an object`);
          return [];
        }

        if (!input.components) {
          showError(
            `Missing components definition for tuple ${name} : code error`
          );
          return [];
        }

        if (parsedArray.length !== input.components.length) {
          showError(
            `Tuple ${name} expects ${input.components.length} values but got ${value.length}`
          );
          return [];
        }

        const tupleValue: any = {};

        for (let i = 0; i < input.components.length; i++) {
          const component = input.components[i];
          const componentValue = parsedArray[i];

          const parsed = parseArgs([
            {
              name: component.name,
              type: component.type,
              value: componentValue,
              components: component.components,
            },
          ]);

          tupleValue[component.name] = parsed[0];
        }

        result.push(tupleValue);
      } else {
        consoleLog("invalid args type");
      }
    } catch (err) {
      showError(`Error parsing input ${name}: ${(err as Error).message}`);
    }
  }

  return result;
}

export function parseEthValue(inputValue: string, unit: string): bigint {
  const exponents: Record<string, number> = {
    wei: 0,
    gwei: 9,
    finney: 15,
    ether: 18,
  };

  const decimals = exponents[unit.toLowerCase()] ?? 18;

  try {
    const value = parseUnits(inputValue, decimals);
    consoleLog(`eth parsed value is ${value}`);
    return value;
  } catch (err) {
    console.error("Invalid ETH value or unit:", err);
    return 0n;
  }
}

export function short(val: string): string {
  return val.length > 10 ? `${val.slice(0, 5)}...${val.slice(-5)}` : val;
}

export function stringifyWithBigInt(obj: any) {
  return JSON.stringify(
    obj,
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2
  );
}

export function decodeEventLogs(
  rawLogs: any[],
  abi: any
): Record<string, Record<string, string>> {
  const decodedLogs: Record<string, Record<string, string>> = {};
  for (const log of rawLogs) {
    try {
      const eventData: any = decodeEventLog({
        abi: abi,
        data: log.data,
        topics: log.topics,
      });

      if (!eventData || !eventData.eventName) continue;
      const eventFragment = abi.find(
        (item: any) =>
          item.type === "event" && item.name === eventData.eventName
      );

      if (!eventFragment || !("inputs" in eventFragment)) continue;
      const logData: Record<string, string> = {};
      eventFragment.inputs.forEach((input: any) => {
        const value = (eventData.args as any)[input.name];
        logData[`${input.type} ${input.name}`] = value?.toString();
      });

      decodedLogs[eventData.eventName] = logData;
    } catch {}
  }

  return decodedLogs;
}

export function decodeCustomError(
  errorData: string,
  abi: any
): Record<string, Record<string, string>> | undefined {
  consoleLog("inside custom error");

  try {
    const data = decodeErrorResult({
      abi: abi,
      data: errorData as `0x${string}`,
    });

    const errorArgs: Record<string, string> = {};
    if ("inputs" in data.abiItem) {
      data.abiItem.inputs.forEach((input: any, idx: number) => {
        errorArgs[`${input.type} ${input.name}`] = data.args[idx].toString();
      });
    }

    return { [data.errorName]: errorArgs };
  } catch {
    return undefined;
  }
}


export function buildDeploymentLog(
  isDeployedSuccess: boolean,
  from: string,
  to: string,
  value: string,
  input: string,
  args: any[],
  abi: any,
  receipt?: any
): LogData | undefined {
  try {
    consoleLog("inside build log");

    const constructorAbi = abi.find((item: any) => item.type === "constructor");
    const decodedInputFormatted = constructorAbi
      ? Object.fromEntries(
          args.map((v: any, i: number) => [
            `${constructorAbi.inputs[i].type} ${constructorAbi.inputs[i].name}`,
            `${v}`,
          ])
        )
      : {};

    consoleLog(
      `decodedInputFormatted : ${JSON.stringify(decodedInputFormatted)}`
    );
    consoleLog(`constructorAbi : ${JSON.stringify(constructorAbi)}`);
    if (isDeployedSuccess && receipt) {
      consoleLog;
      return {
        heading: `✅ [anvil] from : ${short(
          from
        )} to : ${to} value : ${value} wei data : ${short(
          input
        )} hash : ${short(receipt.transactionHash)}`,
        status: "0x1 Transaction mined and execution succeed",
        from,
        to,
        value: `${formatEther(BigInt(value))} ETH`,
        input: input,
        decodedInput: decodedInputFormatted,
        blockHash: receipt.blockHash,
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.transactionHash,
        gas: receipt.gasUsed,
        contractAddress: receipt.contractAddress,
        eventLogs: receipt.logs.length
          ? decodeEventLogs(receipt.logs, abi)
          : undefined,
      };
    } else {
      return {
        heading: `❌ [anvil] from : ${short(
          from
        )} to : ${to} value : ${value} wei data : ${short(input)}`,
        status: "0x0 Transaction failed",
        from: from,
        to: to,
        value: `${formatEther(BigInt(value))} ETH`,
        input: input,
        decodedInput: decodedInputFormatted,
      };
    }
  } catch (err) {
    consoleLog(`error in deployment log : ${JSON.stringify(err, null, 2)}`);
    return undefined;
  }
}

function formatInput(value: any, input: any): any {
  if (input.type === "tuple") {
    const components = input.components || [];
    const formatted: Record<string, any> = {};
    components.forEach((comp: any, idx: number) => {
      const compValue = value[comp.name] ?? value[idx];
      formatted[`${comp.type} ${comp.name}`] = compValue;
    });

    return formatted;
  } else if (input.type === "tuple[]") {
    const components = input.arrayChildren.components || [];
    const formatted: any[] = [];
    value.forEach((v: any) => {
      formatted.push(formatInput(v, { type: "tuple", components: components }));
    });

    return formatted;
  } else {
    return value;
  }
}

function getFunctionFragment(abi: any, functionName: string) {
  return abi.find(
    (item: any) => item.type === "function" && item.name === functionName
  );
}

export function buildFunctionCallLogs(
  isCallSuccess: boolean,
  from: string,
  to: string,
  functionName: string,
  inputBytes: string,
  args: any[],
  abi: any,
  value: string,
  contractAddress: string,
  outputBytes?: string,
  receipt?: any,
  error?: any
): LogData | undefined {
  try {
    consoleLog("inside function log building");
    consoleLog(`output bytes : ${outputBytes}`);
    const isFallbackOrReceive =
      functionName === "fallback" || functionName === "receive";

    let decodedInputFormatted: Record<string, any> | undefined = undefined;
    let decodedOutputFormatted: Record<string, any> | undefined = undefined;

    if (!isFallbackOrReceive) {
      const functionFragment = getFunctionFragment(abi, functionName);
      if (!functionFragment || !("inputs" in functionFragment))
        return undefined;

      decodedInputFormatted = Object.fromEntries(
        functionFragment.inputs.map((input: any, i: number) => {
          const key = `${input.type} ${input.name}`;
          const value = formatInput(args[i], input);
          return [key, value];
        })
      );

      if (isCallSuccess && outputBytes !== undefined) {
        const decodedOutput: any = decodeFunctionResult({
          abi: abi,
          functionName: functionName,
          data: outputBytes as `0x${string}`,
        });
        if (decodedOutput.length > 0) {
          decodedOutputFormatted = Object.fromEntries(
            decodedOutput.map((v: any, i: number) => {
              const output = functionFragment.outputs[i];
              return [`${output.type} ${output.name}`, `${v}`];
            })
          );
        }
      }
    }
    consoleLog(`here in logs 1`);

    let log: LogData;

    if (isCallSuccess && receipt) {
      log = {
        heading: `✅ [anvil] from : ${short(
          receipt.from
        )} to : ${to} value : ${value} wei data : ${short(
          inputBytes
        )} hash : ${short(receipt.transactionHash)}`,
        status: "0x1 Transaction mined and execution succeed",
        from: receipt.from,
        to,
        value: `${formatEther(BigInt(value))} ETH`,
        blockHash: receipt.blockHash,
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.transactionHash,
        gas: receipt.gasUsed,
        contractAddress,
        input: inputBytes,
        decodedInput: decodedInputFormatted,
        output: outputBytes,
        decodedOutput: decodedOutputFormatted,
        eventLogs: receipt.logs.length
          ? decodeEventLogs(receipt.logs, abi)
          : undefined,
      };
    } else {
      consoleLog(`error message : ${error?.info?.error?.message}`);
      log = {
        heading: `❌ [anvil] from : ${short(
          from
        )} to : ${to} value : ${value} wei data : ${short(inputBytes)}`,
        status: "0x0 Transaction failed.",
        contractAddress,
        from,
        to,
        value: `${formatEther(BigInt(value))} ETH`,
        input: inputBytes,
        decodedInput: decodedInputFormatted,
        output: outputBytes,
        reason: error?.shortMessage,
        error: decodeCustomError(error.cause.raw, abi),
      };
    }

    return log;
  } catch (err) {
    consoleLog(`error in logs : ${JSON.stringify(err, null, 2)}`);
    return undefined;
  }
}

export async function isAnvilRunning(port: string): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1,
      }),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}
