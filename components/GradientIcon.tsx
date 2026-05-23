import { useId } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

interface GradientIconProps {
  size?: number;
  radius?: number;
  from: string;
  to: string;
  children: React.ReactNode;
  shadowColor?: string;
}

export function GradientIcon({
  size = 56,
  radius = 16,
  from,
  to,
  children,
  shadowColor,
}: GradientIconProps) {
  const gradId = useId();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        shadowColor: shadowColor ?? from,
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      <Svg
        width={size}
        height={size}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect
          width={size}
          height={size}
          rx={radius}
          ry={radius}
          fill={`url(#${gradId})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export default GradientIcon;
