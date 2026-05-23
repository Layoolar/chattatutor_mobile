import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, secureToggle, secureTextEntry, ...rest },
  ref,
) {
  const [hidden, setHidden] = useState(true);
  const isSecure = secureToggle ? hidden : secureTextEntry;

  return (
    <View className="gap-2">
      {label && <Text className="text-slate-900 font-medium">{label}</Text>}
      <View className="relative justify-center">
        <TextInput
          ref={ref}
          className={`h-12 bg-white border-2 ${error ? "border-red-300" : "border-slate-200"} rounded-xl px-4 ${secureToggle ? "pr-12" : ""} text-slate-900`}
          placeholderTextColor="#94a3b8"
          secureTextEntry={isSecure}
          autoCapitalize={secureTextEntry || secureToggle ? "none" : rest.autoCapitalize}
          autoCorrect={false}
          {...rest}
        />
        {secureToggle && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            className="absolute right-3"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            {hidden ? (
              <Eye size={20} color="#94a3b8" />
            ) : (
              <EyeOff size={20} color="#94a3b8" />
            )}
          </Pressable>
        )}
      </View>
      {error && <Text className="text-sm text-red-600">{error}</Text>}
    </View>
  );
});
