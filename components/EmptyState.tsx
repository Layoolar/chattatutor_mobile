import type { ComponentType, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { LucideProps } from "lucide-react-native";
import { GradientIcon } from "./GradientIcon";

interface EmptyStateProps {
  icon: ComponentType<LucideProps>;
  title: string;
  message?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  secondary?: {
    label: string;
    onPress: () => void;
  };
  gradient?: { from: string; to: string };
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  secondary,
  gradient = { from: "#6366f1", to: "#7c3aed" },
  children,
}: EmptyStateProps) {
  return (
    <View className="items-center px-6 py-12 gap-4">
      <GradientIcon size={72} radius={20} from={gradient.from} to={gradient.to}>
        <Icon size={32} color="#ffffff" />
      </GradientIcon>

      <View className="items-center gap-2 max-w-xs">
        <Text className="text-xl font-bold text-slate-900 text-center">{title}</Text>
        {message ? (
          <Text className="text-sm leading-5 text-slate-600 text-center">{message}</Text>
        ) : null}
      </View>

      {children}

      {action || secondary ? (
        <View className="w-full max-w-xs gap-2 mt-2">
          {action ? (
            <Pressable
              onPress={action.onPress}
              className="h-12 flex-row items-center justify-center rounded-full bg-slate-900 active:bg-slate-800"
            >
              <Text className="text-base font-semibold text-white">{action.label}</Text>
            </Pressable>
          ) : null}
          {secondary ? (
            <Pressable
              onPress={secondary.onPress}
              className="h-12 flex-row items-center justify-center rounded-full border-2 border-slate-200 bg-white active:bg-slate-50"
            >
              <Text className="text-base font-semibold text-slate-900">{secondary.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default EmptyState;
