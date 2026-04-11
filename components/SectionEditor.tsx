import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import type { Section, Round, TransitionSound } from "@/lib/timer";
import { TRANSITION_SOUNDS, createDefaultRound } from "@/lib/timer";
import { RoundEditor } from "./RoundEditor";
import { DurationStepper } from "./DurationStepper";
import { playSound } from "@/lib/playSound";

interface SectionEditorProps {
  index: number;
  section: Section;
  onChange: (section: Section) => void;
  onRemove: (() => void) | null;
}

export function SectionEditor({
  index,
  section,
  onChange,
  onRemove,
}: SectionEditorProps) {
  function updateRound(roundIndex: number, round: Round) {
    const rounds = [...section.rounds];
    rounds[roundIndex] = round;
    onChange({ ...section, rounds });
  }

  function removeRound(roundIndex: number) {
    onChange({ ...section, rounds: section.rounds.filter((_, i) => i !== roundIndex) });
  }

  function addRound() {
    const last = section.rounds[section.rounds.length - 1];
    const newRound = last
      ? createDefaultRound(last.workoutSeconds, last.restSeconds)
      : createDefaultRound();
    onChange({ ...section, rounds: [...section.rounds, newRound] });
  }

  function duplicateRounds(count: number) {
    const last = section.rounds[section.rounds.length - 1];
    const template = last
      ? { workoutSeconds: last.workoutSeconds, restSeconds: last.restSeconds }
      : { workoutSeconds: 40, restSeconds: 20 };
    const newRounds = Array.from({ length: count }, () =>
      createDefaultRound(template.workoutSeconds, template.restSeconds)
    );
    onChange({ ...section, rounds: [...section.rounds, ...newRounds] });
  }

  function handleSoundChange(s: TransitionSound) {
    onChange({ ...section, transitionSound: s });
    playSound(s);
  }

  return (
    <View className="gap-4 rounded-2xl bg-white/10 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold uppercase tracking-wider text-white/60">
          Section {index + 1}
        </Text>
        {onRemove && (
          <Pressable onPress={onRemove}>
            <Text className="text-xs text-white/40">Remove section</Text>
          </Pressable>
        )}
      </View>

      <TextInput
        value={section.name}
        onChangeText={(text) => onChange({ ...section, name: text })}
        placeholder="Section name (e.g. Upper Body)"
        placeholderTextColor="rgba(255,255,255,0.3)"
        className="rounded-xl bg-white/10 px-4 py-3 text-white"
      />

      <View className="gap-2">
        <Text className="text-xs font-medium text-white/60">Transition Sound</Text>
        <View className="flex-row gap-1.5">
          {TRANSITION_SOUNDS.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => handleSoundChange(s.id)}
              className={`flex-1 rounded-lg px-2 py-2 ${
                section.transitionSound === s.id ? "bg-white" : "bg-white/10"
              }`}
            >
              <Text
                className={`text-center text-xs font-medium ${
                  section.transitionSound === s.id ? "text-slate-800" : "text-white"
                }`}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-xs font-medium text-white/60">Rest After Section</Text>
        <DurationStepper
          value={section.restBetweenSections}
          onChange={(v) => onChange({ ...section, restBetweenSections: v })}
          min={0}
          max={300}
          step={15}
        />
      </View>

      <View className="gap-2">
        <Text className="text-xs font-medium text-white/60">
          Rounds ({section.rounds.length})
        </Text>
        <View className="gap-2">
          {section.rounds.map((round, i) => (
            <RoundEditor
              key={i}
              index={i}
              round={round}
              onChange={(r) => updateRound(i, r)}
              onRemove={section.rounds.length > 1 ? () => removeRound(i) : null}
            />
          ))}
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={addRound}
            className="flex-1 rounded-xl bg-white/10 py-2.5 active:bg-white/20"
          >
            <Text className="text-center text-sm font-medium text-white">
              + Add Round
            </Text>
          </Pressable>
          {section.rounds.length < 3 && (
            <Pressable
              onPress={() => duplicateRounds(4)}
              className="rounded-xl bg-white/10 px-4 py-2.5 active:bg-white/20"
            >
              <Text className="text-sm font-medium text-white">+ Add 4</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
