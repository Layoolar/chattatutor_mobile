import { ActivityIndicator, Pressable, Text } from "react-native";
import type { PressableProps } from "react-native";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

const containerByVariant: Record<Variant, string> = {
  primary: "bg-slate-900 active:bg-slate-800",
  secondary: "bg-white border-2 border-slate-200 active:bg-slate-50",
  ghost: "bg-transparent active:bg-slate-100",
};

const textByVariant: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-slate-900",
  ghost: "text-slate-700",
};

export function Button({
  title,
  variant = "primary",
  loading = false,
  disabled,
  fullWidth = true,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      className={`h-12 rounded-xl items-center justify-center flex-row ${containerByVariant[variant]} ${fullWidth ? "w-full" : ""} ${isDisabled ? "opacity-60" : ""}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#0f172a"} />
      ) : (
        <Text className={`text-base font-semibold ${textByVariant[variant]}`}>{title}</Text>
      )}
    </Pressable>
  );
}
