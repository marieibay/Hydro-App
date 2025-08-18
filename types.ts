
export type Mood = 'happy' | 'ok' | 'sick' | 'sos';

export interface Entry {
    ts: string;
    amount: number;
}

export interface FishState {
    x: number;
    y: number;
    vx: number;
    vy: number;
    target: { x: number; y: number; isFood?: boolean } | null;
    facing: number; // visual scale for horizontal flip, interpolates between -1 and 1
    phase: number;
    rotation: number;
    state: 'swimming';
}

export interface Bubble {
    x: number;
    y: number;
    r: number;
    vy: number;
    a: number;
}

export interface Food {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    state: 'falling' | 'sinking' | 'settled';
    life: number; // for fade out
    color: string;
}

export interface Ripple {
    id: number;
    x: number;
    y: number;
    radius: number;
    life: number;
}

export interface ReminderSettings {
    intervalMin: number;
    startHour: number;
    endHour: number;
}

export interface CustomWindow {
    start: string; // "HH:mm"
    end: string;   // "HH:mm"
}

export type ShiftMode = 'day' | 'night' | 'custom';

export interface Settings {
    useCustomGoal: boolean;
    reminders: ReminderSettings;
    shiftMode: ShiftMode;
    customWindow: CustomWindow;
    cadenceMin: number;
    isMuted: boolean;
}

export interface GameState {
    date: string;
    goalBase: number;
    ml: number;
    entries: Entry[];
    settings: Settings;
    celebratedToday: boolean;
    postGoalHydrations: number;
    fish: FishState;
    bubbles: Bubble[];
    foods: Food[];
    ripples: Ripple[];
    lastBubbleAt: number;
    moodOverride: Mood | null;
    vitalityBoostUntil: number;
    followTarget: { x: number, y: number } | null;
    followTimeoutId: number | null;
    lastWaterAmount?: number;
    notificationPermission: NotificationPermission | 'default';
    lastReminderTimestamp: number;
    goalRecommendation: string | null;
}

export const initialSettings: Settings = {
    useCustomGoal: false,
    reminders: {
        intervalMin: 60,
        startHour: 8,
        endHour: 22
    },
    shiftMode: 'custom',
    customWindow: {
        start: '20:00',
        end: '07:00'
    },
    cadenceMin: 60,
    isMuted: false,
};

export const todayKey = (d: Date = new Date()): string => d.toISOString().slice(0, 10);