import { LogBox } from "react-native";

const renderHtmlWarningComponents = [
  "TRenderEngineProvider",
  "MemoizedTNodeRenderer",
  "TNodeChildrenRenderer",
  "TChildrenRenderer",
  "TNodeRenderer",
];

function consoleMessage(args: Parameters<typeof console.error>) {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      return String(arg);
    })
    .join(" ");
}

function isRenderHtmlDefaultPropsWarning(args: Parameters<typeof console.error>) {
  const message = consoleMessage(args);

  return (
    message.includes("Support for defaultProps will be removed") &&
    renderHtmlWarningComponents.some((componentName) =>
      message.includes(componentName)
    )
  );
}

LogBox.ignoreLogs([
  "Warning: TRenderEngineProvider: Support for defaultProps",
  "Warning: MemoizedTNodeRenderer: Support for defaultProps",
  "Warning: TNodeChildrenRenderer: Support for defaultProps",
  "Warning: TChildrenRenderer: Support for defaultProps",
  "Warning: TNodeRenderer: Support for defaultProps",
]);

const globalScope = globalThis as typeof globalThis & {
  __chattatutorRenderHtmlWarningPatch?: boolean;
};

if (!globalScope.__chattatutorRenderHtmlWarningPatch) {
  const originalConsoleError = console.error.bind(console);

  console.error = (...args: Parameters<typeof console.error>) => {
    if (isRenderHtmlDefaultPropsWarning(args)) return;
    originalConsoleError(...args);
  };

  globalScope.__chattatutorRenderHtmlWarningPatch = true;
}