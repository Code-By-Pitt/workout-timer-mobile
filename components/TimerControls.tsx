import { View, Text, Pressable } from "react-native";

interface TimerControlsProps {
  isRunning: boolean;
  isIdle: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onRestartSection: () => void;
  onPreviousRound: () => void;
  onNextRound: () => void;
}

export function TimerControls({
  isRunning,
  isIdle,
  onStart,
  onPause,
  onReset,
  onRestartSection,
  onPreviousRound,
  onNextRound,
}: TimerControlsProps) {
  if (isIdle) {
    return (
      <View className="w-full max-w-sm gap-3">
        <Pressable
          onPress={onStart}
          className="rounded-2xl bg-white/20 py-4 active:bg-white/30"
        >
          <Text className="text-center text-2xl font-bold text-white">Start</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="w-full max-w-sm gap-3">
      {/* Music-player row */}
      <View className="flex-row items-center justify-center gap-3">
        <Pressable
          onPress={onPreviousRound}
          accessibilityLabel="Previous round"
          className="h-14 w-14 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
        >
          <Text className="text-2xl text-white/80">⏮</Text>
        </Pressable>
        {isRunning ? (
          <Pressable
            onPress={onPause}
            accessibilityLabel="Pause"
            className="h-20 w-20 items-center justify-center rounded-full bg-white active:bg-white/90"
          >
            <Text className="text-3xl text-slate-800">⏸</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onStart}
            accessibilityLabel="Resume"
            className="h-20 w-20 items-center justify-center rounded-full bg-white active:bg-white/90"
          >
            <Text className="text-3xl text-slate-800">▶</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onNextRound}
          accessibilityLabel="Next round"
          className="h-14 w-14 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
        >
          <Text className="text-2xl text-white/80">⏭</Text>
        </Pressable>
      </View>

      <View className="flex-row gap-3">
        <Pressable
          onPress={onRestartSection}
          className="flex-1 rounded-2xl bg-white/10 py-3 active:bg-white/20"
        >
          <Text className="text-center text-sm font-medium text-white/70">
            Restart Section
          </Text>
        </Pressable>
        <Pressable
          onPress={onReset}
          className="flex-1 rounded-2xl bg-white/10 py-3 active:bg-white/20"
        >
          <Text className="text-center text-sm font-medium text-white/70">
            Reset
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
