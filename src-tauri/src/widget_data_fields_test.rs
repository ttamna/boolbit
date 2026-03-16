// ABOUTME: WidgetData/WidgetSettings 누락 필드 및 직렬화 불변식 검증
// ABOUTME: serde 직렬화/역직렬화 왕복(round-trip), None→absent, 날짜 sanitize 포함

#[cfg(test)]
mod tests {
    use crate::{sanitize_ymd_date, WidgetData, WidgetSettings};

    // ─── WidgetData 누락 필드: 역직렬화 보존 테스트 ─────────────────────────

    /// JSON에 pomodoroSound 필드가 있으면 역직렬화 후에도 보존되어야 한다
    #[test]
    fn should_preserve_pomodoro_sound_when_deserializing() {
        let json = r#"{
            "projects": [],
            "habits": [],
            "quotes": [],
            "pomodoroSound": true
        }"#;
        let data: WidgetData = serde_json::from_str(json).expect("deserialization failed");
        assert_eq!(data.pomodoro_sound, Some(true));
    }

    /// JSON에 habitsSound 필드가 있으면 역직렬화 후에도 보존되어야 한다
    #[test]
    fn should_preserve_habits_sound_when_deserializing() {
        let json = r#"{
            "projects": [],
            "habits": [],
            "quotes": [],
            "habitsSound": false
        }"#;
        let data: WidgetData = serde_json::from_str(json).expect("deserialization failed");
        assert_eq!(data.habits_sound, Some(false));
    }

    /// JSON에 momentumHistory 필드가 있으면 역직렬화 후에도 보존되어야 한다
    #[test]
    fn should_preserve_momentum_history_when_deserializing() {
        let json = r#"{
            "projects": [],
            "habits": [],
            "quotes": [],
            "momentumHistory": [{"date": "2026-03-16", "score": 5}]
        }"#;
        let data: WidgetData = serde_json::from_str(json).expect("deserialization failed");
        assert!(data.momentum_history.is_some());
    }

    /// JSON에 habitEveningRemindDate 필드가 있으면 역직렬화 후에도 보존되어야 한다
    #[test]
    fn should_preserve_habit_evening_remind_date_when_deserializing() {
        let json = r#"{
            "projects": [],
            "habits": [],
            "quotes": [],
            "habitEveningRemindDate": "2026-03-16"
        }"#;
        let data: WidgetData = serde_json::from_str(json).expect("deserialization failed");
        assert_eq!(data.habit_evening_remind_date, Some("2026-03-16".to_string()));
    }

    /// JSON에 intentionMorningRemindDate 필드가 있으면 역직렬화 후에도 보존되어야 한다
    #[test]
    fn should_preserve_intention_morning_remind_date_when_deserializing() {
        let json = r#"{
            "projects": [],
            "habits": [],
            "quotes": [],
            "intentionMorningRemindDate": "2026-03-16"
        }"#;
        let data: WidgetData = serde_json::from_str(json).expect("deserialization failed");
        assert_eq!(data.intention_morning_remind_date, Some("2026-03-16".to_string()));
    }

    /// JSON에 intentionEveningRemindDate 필드가 있으면 역직렬화 후에도 보존되어야 한다
    #[test]
    fn should_preserve_intention_evening_remind_date_when_deserializing() {
        let json = r#"{
            "projects": [],
            "habits": [],
            "quotes": [],
            "intentionEveningRemindDate": "2026-03-16"
        }"#;
        let data: WidgetData = serde_json::from_str(json).expect("deserialization failed");
        assert_eq!(data.intention_evening_remind_date, Some("2026-03-16".to_string()));
    }

    /// JSON에 pomodoroMorningRemindDate 필드가 있으면 역직렬화 후에도 보존되어야 한다
    #[test]
    fn should_preserve_pomodoro_morning_remind_date_when_deserializing() {
        let json = r#"{
            "projects": [],
            "habits": [],
            "quotes": [],
            "pomodoroMorningRemindDate": "2026-03-16"
        }"#;
        let data: WidgetData = serde_json::from_str(json).expect("deserialization failed");
        assert_eq!(data.pomodoro_morning_remind_date, Some("2026-03-16".to_string()));
    }

    /// JSON에 pomodoroEveningRemindDate 필드가 있으면 역직렬화 후에도 보존되어야 한다
    #[test]
    fn should_preserve_pomodoro_evening_remind_date_when_deserializing() {
        let json = r#"{
            "projects": [],
            "habits": [],
            "quotes": [],
            "pomodoroEveningRemindDate": "2026-03-16"
        }"#;
        let data: WidgetData = serde_json::from_str(json).expect("deserialization failed");
        assert_eq!(data.pomodoro_evening_remind_date, Some("2026-03-16".to_string()));
    }

    /// JSON에 habitMilestoneApproachDate 필드가 있으면 역직렬화 후에도 보존되어야 한다
    #[test]
    fn should_preserve_habit_milestone_approach_date_when_deserializing() {
        let json = r#"{
            "projects": [],
            "habits": [],
            "quotes": [],
            "habitMilestoneApproachDate": "2026-03-16"
        }"#;
        let data: WidgetData = serde_json::from_str(json).expect("deserialization failed");
        assert_eq!(data.habit_milestone_approach_date, Some("2026-03-16".to_string()));
    }

    // ─── WidgetData 직렬화: 필드가 JSON 출력에 포함되는지 ──────────────────

    /// WidgetData를 직렬화하면 pomodoroSound 필드가 JSON에 포함되어야 한다
    #[test]
    fn should_serialize_pomodoro_sound_to_json() {
        let json = r#"{
            "projects": [],
            "habits": [],
            "quotes": [],
            "pomodoroSound": true
        }"#;
        let data: WidgetData = serde_json::from_str(json).expect("deserialization failed");
        let serialized = serde_json::to_string(&data).expect("serialization failed");
        assert!(
            serialized.contains("\"pomodoroSound\""),
            "serialized JSON does not contain 'pomodoroSound': {serialized}"
        );
    }

    /// WidgetData를 직렬화하면 habitsSound 필드가 JSON에 포함되어야 한다
    #[test]
    fn should_serialize_habits_sound_to_json() {
        let json = r#"{
            "projects": [],
            "habits": [],
            "quotes": [],
            "habitsSound": false
        }"#;
        let data: WidgetData = serde_json::from_str(json).expect("deserialization failed");
        let serialized = serde_json::to_string(&data).expect("serialization failed");
        assert!(
            serialized.contains("\"habitsSound\""),
            "serialized JSON does not contain 'habitsSound': {serialized}"
        );
    }

    // ─── WidgetSettings 누락 필드: pinned ──────────────────────────────────

    /// JSON에 pinned 필드가 있으면 WidgetSettings 역직렬화 후에도 보존되어야 한다
    #[test]
    fn should_preserve_pinned_in_widget_settings_when_deserializing() {
        let json = r#"{
            "position": {"x": 0, "y": 0},
            "size": {"width": 380, "height": 700},
            "opacity": 1.0,
            "pinned": true
        }"#;
        let settings: WidgetSettings = serde_json::from_str(json).expect("deserialization failed");
        assert_eq!(settings.pinned, Some(true));
    }

    /// WidgetSettings를 직렬화하면 pinned 필드가 JSON에 포함되어야 한다
    #[test]
    fn should_serialize_pinned_in_widget_settings_to_json() {
        let json = r#"{
            "position": {"x": 0, "y": 0},
            "size": {"width": 380, "height": 700},
            "opacity": 1.0,
            "pinned": true
        }"#;
        let settings: WidgetSettings = serde_json::from_str(json).expect("deserialization failed");
        let serialized = serde_json::to_string(&settings).expect("serialization failed");
        assert!(
            serialized.contains("\"pinned\""),
            "serialized JSON does not contain 'pinned': {serialized}"
        );
    }

    /// None 값 필드는 직렬화 시 JSON에 없어야 한다 (null이 아닌 absent)
    #[test]
    fn should_omit_none_fields_when_serializing() {
        let json = r#"{"projects": [], "habits": [], "quotes": []}"#;
        let data: WidgetData = serde_json::from_str(json).expect("deserialization failed");
        let serialized = serde_json::to_string(&data).expect("serialization failed");
        for field in &[
            "pomodoroSound", "habitsSound", "momentumHistory",
            "habitEveningRemindDate", "intentionMorningRemindDate",
            "intentionEveningRemindDate", "pomodoroMorningRemindDate",
            "pomodoroEveningRemindDate", "habitMilestoneApproachDate",
        ] {
            assert!(
                !serialized.contains(&format!("\"{}\":null", field)),
                "{field} should be absent (not null) when None: {serialized}"
            );
        }
    }

    /// 기존 settings 파일에 pinned 키가 없어도 역직렬화가 성공해야 한다
    #[test]
    fn should_deserialize_widget_settings_without_pinned_field() {
        let json = r#"{
            "position": {"x": 0, "y": 0},
            "size": {"width": 380, "height": 700},
            "opacity": 1.0
        }"#;
        let settings: WidgetSettings = serde_json::from_str(json).expect("deserialization should succeed without pinned");
        assert_eq!(settings.pinned, None);
    }

    // ─── sanitize_ymd_date ──────────────────────────────────────────────────

    /// 유효한 YYYY-MM-DD 날짜는 그대로 반환되어야 한다
    #[test]
    fn should_pass_valid_ymd_date() {
        assert_eq!(sanitize_ymd_date(Some("2026-03-16".into())), Some("2026-03-16".into()));
    }

    /// 잘못된 형식의 날짜 문자열은 None으로 변환되어야 한다
    #[test]
    fn should_reject_invalid_ymd_date() {
        assert_eq!(sanitize_ymd_date(Some("not-a-date".into())), None);
        assert_eq!(sanitize_ymd_date(Some("2026/03/16".into())), None);
        assert_eq!(sanitize_ymd_date(Some("2026-3-16".into())), None);
        assert_eq!(sanitize_ymd_date(Some("".into())), None);
    }

    /// None 입력은 None을 반환해야 한다
    #[test]
    fn should_pass_none_ymd_date() {
        assert_eq!(sanitize_ymd_date(None), None);
    }
}
