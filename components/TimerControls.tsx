import { View, Text, Pressable } from "react-native";

interface TimerControlsProps {
  isRunning: boolean;
  isIdle: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onRestartSection: () => void;
}

export function TimerControls({
  isRunning,
  isIdle,
  onStart,
  onPause,
  onReset,
  onRestartSection,
}: TimerControlsProps) {
  return (
    <View className="w-full max-w-sm gap-3">
      <View className="flex-row gap-3">
        {isRunning ? (
          <Pressable
            onPress={onPause}
            className="flex-1 rounded-2xl bg-white/20 py-4 active:bg-white/30"
          >
            <Text className="text-center text-2xl font-bold text-white">Pause</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onStart}
            className="flex-1 rounded-2xl bg-white/20 py-4 active:bg-white/30"
          >
            <Text className="text-center text-2xl font-bold text-white">
              {isIdle ? "Start" : "Resume"}
            </Text>
          </Pressable>
        )}
        {!isIdle && (
          <Pressable
            onPress={onReset}
            className="rounded-2xl bg-white/10 px-6 py-4 active:bg-white/20"
          >
            <Text className="text-2xl font-bold text-white/70">Reset</Text>
          </Pressable>
        )}
      </View>
      {!isIdle && (
        <Pressable
          onPress={onRestartSection}
          className="w-full rounded-2xl bg-white/10 py-3 active:bg-white/20"
        >
          <Text className="text-center text-base font-medium text-white/60">
            Restart Section
          </Text>
        </Pressable>
      )}
    </View>
  );
}
