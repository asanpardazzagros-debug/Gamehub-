import { ABIEntry, FuncState, DeployedContract, Output } from "../Types.ts";

export const handleCopy = async (address: string) => {
  try {
    await navigator.clipboard.writeText(address);
  } catch (err) {}
};

export function buildInitialConstructorState(
  abi: ABIEntry
): FuncState | undefined {
  if (abi.type !== "constructor") return undefined;
  return {
    name: "constructor",
    stateMutability: abi.stateMutability,
    inputs: (abi.inputs || []).map((input) => ({
      name: input.name,
      type: input.type,
      value: "",
    })),
  };
}

export function buildFunctionStatesFromABI(abi: any[]): FuncState[] {
  let result = abi
    .filter((item) => item.type === "function")
    .map(
      (func): FuncState => ({
        name: func.name,
        stateMutability: func.stateMutability,
        inputs: func.inputs.map((input: any) => {
          const base: any = {
            name: input.name,
            type: input.type,
            value: "",
          };

          if (input.type === "tuple" || input.type === "tuple[]") {
            base.components = input.components.map((c: any) => ({
              name: c.name,
              type: c.type,
              value: "",
            }));
          }

          return base;
        }),
        outputs: func.outputs.map((output: any) => ({
          name: output.name,
          type: output.type,
          value: "",
        })),
      })
    );

  const priority: {
    [key in "nonpayable" | "payable" | "view" | "pure"]: number;
  } = {
    nonpayable: 0,
    payable: 1,
    view: 2,
    pure: 3,
  };

  result.sort(
    (a: FuncState, b: FuncState) =>
      (priority[a.stateMutability as keyof typeof priority] ?? 99) -
      (priority[b.stateMutability as keyof typeof priority] ?? 99)
  );

  const hasFallback = abi.some((item) => item.type === "fallback");
  const hasReceive = abi.some((item) => item.type === "receive");

  if (hasFallback || hasReceive) {
    result.push({
      name: "low-level",
      stateMutability: "payable",
      inputs: [
        {
          name: "calldata",
          type: "bytes",
          value: "",
        },
      ],
      outputs: [],
    });
  }

  return result;
}

export function updateInputValue(
  prev: DeployedContract[],
  contractIndex: number,
  functionIndex: number,
  inputIndex: number,
  newValue: string
): DeployedContract[] {
  const updated = [...prev];
  updated[contractIndex] = { ...updated[contractIndex] };
  updated[contractIndex].functions = [...updated[contractIndex].functions];
  updated[contractIndex].functions[functionIndex] = {
    ...updated[contractIndex].functions[functionIndex],
  };
  updated[contractIndex].functions[functionIndex].inputs = [
    ...updated[contractIndex].functions[functionIndex].inputs,
  ];
  updated[contractIndex].functions[functionIndex].inputs[inputIndex] = {
    ...updated[contractIndex].functions[functionIndex].inputs[inputIndex],
    value: newValue,
  };

  return updated;
}

export function updateOutputValue(
  prev: DeployedContract[],
  contractIndex: number,
  functionIndex: number,
  newValue: Output[]
): DeployedContract[] {
  const updated = [...prev];
  updated[contractIndex] = { ...updated[contractIndex] };
  updated[contractIndex].functions = [...updated[contractIndex].functions];
  updated[contractIndex].functions[functionIndex] = {
    ...updated[contractIndex].functions[functionIndex],
    outputs: newValue,
  };

  return updated;
}

export function stringifyWithBigInt(obj: any) {
  return JSON.stringify(
    obj,
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2 // pretty-print with 2-space indent
  );
}

