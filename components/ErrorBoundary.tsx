import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle } from "lucide-react-native";
import { GradientIcon } from "./GradientIcon";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center px-8 gap-5">
          <GradientIcon size={80} radius={22} from="#f43f5e" to="#ec4899">
            <AlertTriangle size={36} color="#ffffff" />
          </GradientIcon>
          <View className="items-center gap-2">
            <Text className="text-2xl font-bold text-slate-900 text-center">
              Something went wrong
            </Text>
            <Text className="text-sm leading-5 text-slate-600 text-center max-w-xs">
              The app hit an unexpected error. You can try again, or reopen the app if the
              problem persists.
            </Text>
          </View>
          {__DEV__ ? (
            <View className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <Text className="text-xs font-mono text-rose-700" numberOfLines={6}>
                {error.message}
              </Text>
            </View>
          ) : null}
          <Pressable
            onPress={this.reset}
            className="h-12 px-8 flex-row items-center justify-center rounded-full bg-slate-900 active:bg-slate-800"
          >
            <Text className="text-base font-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

export default ErrorBoundary;
