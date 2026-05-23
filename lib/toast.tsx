import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react-native";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ShowToastOptions {
  duration?: number;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, options?: ShowToastOptions) => void;
  success: (message: string, options?: ShowToastOptions) => void;
  error: (message: string, options?: ShowToastOptions) => void;
  info: (message: string, options?: ShowToastOptions) => void;
  dismiss: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const VARIANTS = {
  success: { icon: CheckCircle2, color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  error: { icon: AlertCircle, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  info: { icon: Info, color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
} as const;

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const current = queue[0];

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissNow = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setQueue((q) => q.slice(1));
    });
  }, [opacity, translateY]);

  useEffect(() => {
    if (!current) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    if (current.variant === "error") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {
        // haptics is best-effort (e.g. web target has no implementation)
      });
    } else if (current.variant === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    hideTimer.current = setTimeout(dismissNow, current.duration);
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [current, dismissNow, opacity, translateY]);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info", options?: ShowToastOptions) => {
      const item: ToastItem = {
        id: nextId++,
        message,
        variant,
        duration: options?.duration ?? (variant === "error" ? 4500 : 2800),
      };
      setQueue((q) => [...q, item]);
    },
    [],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (m, o) => show(m, "success", o),
      error: (m, o) => show(m, "error", o),
      info: (m, o) => show(m, "info", o),
      dismiss: dismissNow,
    }),
    [show, dismissNow],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {current ? (
        <SafeAreaView
          pointerEvents="box-none"
          className="absolute left-0 right-0 top-0"
          edges={["top"]}
        >
          <Animated.View
            pointerEvents="auto"
            style={{ opacity, transform: [{ translateY }] }}
            className="mx-4 mt-2"
          >
            <ToastBody item={current} onDismiss={dismissNow} />
          </Animated.View>
        </SafeAreaView>
      ) : null}
    </ToastContext.Provider>
  );
}

function ToastBody({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const v = VARIANTS[item.variant];
  const Icon = v.icon;
  return (
    <View
      className="flex-row items-start gap-3 rounded-2xl border px-4 py-3"
      style={{
        backgroundColor: v.bg,
        borderColor: v.border,
        shadowColor: "#0f172a",
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      <Icon size={20} color={v.color} />
      <Text className="flex-1 text-sm font-medium text-slate-900">{item.message}</Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <X size={16} color="#64748b" />
      </Pressable>
    </View>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
