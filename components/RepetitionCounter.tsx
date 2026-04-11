import { Text } from "react-native";

interface RepetitionCounterProps {
  currentRound: number;
  totalRounds: number;
}

export function RepetitionCounter({ currentRound, totalRounds }: RepetitionCounterProps) {
  return (
    <Text className="text-xl font-medium text-white opacity-70">
      Round {currentRound} / {totalRounds}
    </Text>
  );
}
