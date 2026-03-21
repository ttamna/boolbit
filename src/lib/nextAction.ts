// ABOUTME: Prescriptive next-action recommendation based on daily completion state
// ABOUTME: Priority chain: intention → habits → pomodoro → allDone; pure function, no side effects

export interface NextActionParams {
  /** Habits array — each element's lastChecked is compared against todayStr to determine completion. */
  habits: Array<{ lastChecked?: string }>;
  /** YYYY-MM-DD string for the current calendar day. */
  todayStr: string;
  /** Today's intention text; falsy = not set. */
  intentionText?: string;
  /** Date when intention was last set; compared against todayStr. */
  intentionDate?: string;
  /** Number of pomodoro sessions completed (may be stale if pomodoroSessionsDate !== todayStr). */
  pomodoroSessions: number;
  /** Daily pomodoro session goal; 0 or falsy = no goal. */
  pomodoroGoal: number;
  /** Date the pomodoroSessions count belongs to; if !== todayStr, today's count is treated as 0. */
  pomodoroSessionsDate?: string;
}

export interface NextAction {
  /** Stable key for React rendering and test assertions. */
  key: string;
  /** Display emoji prefix. */
  emoji: string;
  /** Korean display text describing the recommended action. */
  text: string;
}

/**
 * Determines the single most important next action for the user right now.
 * Decision priority (first match wins):
 *   1. Set intention (not set for today)
 *   2. Complete remaining habits (at least one unchecked today)
 *   3. Do pomodoro sessions (goal > 0 and not yet met)
 *   4. All done (everything complete)
 * Pure function with no side effects.
 */
export function calcNextAction(params: NextActionParams): NextAction {
  const {
    habits,
    todayStr,
    intentionText,
    intentionDate,
    pomodoroSessions,
    pomodoroGoal,
    pomodoroSessionsDate,
  } = params;

  // Priority 1: intention not set for today
  const intentionSet = intentionDate === todayStr && !!intentionText;
  if (!intentionSet) {
    return { key: "setIntention", emoji: "🎯", text: "오늘의 의도를 설정하세요" };
  }

  // Priority 2: unchecked habits
  const remaining = habits.filter(h => h.lastChecked !== todayStr).length;
  if (remaining > 0) {
    return { key: "completeHabits", emoji: "✅", text: `습관 ${remaining}개 남음` };
  }

  // Priority 3: pomodoro goal not met
  const todaySessions = pomodoroSessionsDate === todayStr ? pomodoroSessions : 0;
  const sessionsLeft = pomodoroGoal - todaySessions;
  if (pomodoroGoal && sessionsLeft > 0) {
    return { key: "doPomodoro", emoji: "🍅", text: `포모도로 ${sessionsLeft}세션 남음` };
  }

  // Priority 4: all daily tasks done
  return { key: "allDone", emoji: "✨", text: "오늘의 루틴을 모두 완료했어요" };
}
