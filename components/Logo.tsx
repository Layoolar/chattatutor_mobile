import { Text, View } from "react-native";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "light";
}

const textSize: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

export function Logo({ size = "md", variant = "default" }: LogoProps) {
  const color = variant === "light" ? "text-white" : "text-[#2f3bff]";
  return (
    <View className="flex-row items-center">
      <Text className={`${textSize[size]} font-extrabold tracking-tight ${color}`}>
        ChattaTutor
      </Text>
    </View>
  );
}

export default Logo;
