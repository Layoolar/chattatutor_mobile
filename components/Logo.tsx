import { Image, Text, View } from "react-native";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "light";
  showMark?: boolean;
  showText?: boolean;
}

const textSize: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

const markSize: Record<NonNullable<LogoProps["size"]>, number> = {
  sm: 28,
  md: 36,
  lg: 48,
};

export function Logo({
  size = "md",
  variant = "default",
  showMark = true,
  showText = true,
}: LogoProps) {
  const color = variant === "light" ? "text-white" : "text-indigo-600";
  const mark = markSize[size];
  return (
    <View className="flex-row items-center gap-2">
      {showMark && (
        <Image
          source={require("../assets/logo.png")}
          style={{ width: mark, height: mark }}
          resizeMode="contain"
        />
      )}
      {showText && (
        <Text className={`${textSize[size]} font-extrabold tracking-tight ${color}`}>
          ChattaTutor
        </Text>
      )}
    </View>
  );
}

export default Logo;
