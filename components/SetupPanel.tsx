

import React, { useState, useEffect } from 'react';
import type { GameState, ShiftMode, ReminderSettings } from '../types';
import { todayKey } from '../types';

interface SetupPanelProps {
    onClose: () => void;
    gameState: GameState;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    showToast: (message: string) => void;
    onSaveReminders: (settings: ReminderSettings) => void;
}

type Tab = 'stats' | 'reminders' | 'shift' | 'goal';

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; className?: string, disabled?: boolean }> = ({ active, onClick, children, className, disabled }) => (
    <button
        className={`py-2 px-2.5 border-4 border-[--blue-dark] shadow-[inset_0_0_0_4px_var(--border2)] font-bold cursor-pointer rounded-sm text-xs ${active ? 'bg-black text-[#ffd12b]' : 'bg-[#061021] text-[#a7c5f4]'} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
        onClick={onClick}
        disabled={disabled}
    >
        {children}
    </button>
);

const Row: React.FC<{ children: React.ReactNode, label: string }> = ({ children, label }) => (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center my-3">
        <label className="text-sm sm:min-w-[160px] flex-shrink-0">{label}</label>
        {children}
    </div>
);


const Hint: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`text-[11px] text-[--muted] ${className}`}>{children}</div>
);

const BaseInput = "bg-[#061021] border-2 border-[--blue-dark] shadow-[inset_0_0_0_2px_var(--border2)] text-white p-2 rounded-sm w-full disabled:opacity-60";

// --- Stats Tab ---
const StatsTab: React.FC<{ gameState: GameState }> = ({ gameState }) => {
    const [statsDate, setStatsDate] = useState(new Date());
    const [stats, setStats] = useState({ today: 0, week: 0, month: 0, weekData: [] as number[], monthData: [] as number[] });

    const goal = gameState.settings.useCustomGoal ? gameState.goalBase : 2000;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

    useEffect(() => {
        const dailyTotals = new Map<string, number>();
        gameState.entries.forEach(e => {
            const day = e.ts.slice(0, 10);
            dailyTotals.set(day, (dailyTotals.get(day) || 0) + e.amount);
        });

        const getMl = (key: string) => dailyTotals.get(key) || 0;

        // Today
        const todayMl = getMl(todayKey(new Date()));

        // Week
        const weekStart = new Date(statsDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1)); // Monday as start of week
        let weekMl = 0;
        const weekData = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            const ml = getMl(todayKey(d));
            weekMl += ml;
            return ml;
        });

        // Month
        const monthStart = new Date(statsDate.getFullYear(), statsDate.getMonth(), 1);
        const monthEndDay = new Date(statsDate.getFullYear(), statsDate.getMonth() + 1, 0).getDate();
        let monthMl = 0;
        const monthData = Array.from({ length: monthEndDay }, (_, i) => {
            const d = new Date(monthStart);
            d.setDate(d.getDate() + i);
            const ml = getMl(todayKey(d));
            monthMl += ml;
            return ml;
        });

        setStats({ today: todayMl, week: weekMl, month: monthMl, weekData, monthData });
    }, [statsDate, gameState.entries]);

    const weekStart = new Date(statsDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekLabel = `Week: ${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} - ${monthNames[weekEnd.getMonth()]} ${weekEnd.getDate()}`;
    const maxWeekMl = Math.max(...stats.weekData, goal);

    const monthLabel = `${monthNames[statsDate.getMonth()]} ${statsDate.getFullYear()}`;
    const maxMonthMl = Math.max(...stats.monthData, goal);

    return (
        <div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
                <div className="s_box"><div className="s_title">Today</div><div className="s_val">{stats.today} ml</div></div>
                <div className="s_box"><div className="s_title">Selected week</div><div className="s_val">{stats.week} ml</div></div>
                <div className="s_box"><div className="s_title">Selected month</div><div className="s_val">{stats.month} ml</div></div>
            </div>
            
            <style>{`.s_box{border:4px solid var(--blue-dark);box-shadow:inset 0 0 0 4px var(--border2);border-radius:4px;padding:8px;background:#061021}.s_title{font-size:10px;color:var(--muted);margin-bottom:4px}.s_val{font-size:16px;color:#ffd12b}`}</style>
            
            <div className="flex gap-1.5 items-center my-2.5 flex-wrap">
                <TabButton className="px-1.5 text-[10px]" active={false} onClick={() => setStatsDate(d => new Date(d.setDate(d.getDate() - 7)))}>◀ Prev</TabButton>
                <div className="flex-1 text-center font-bold text-xs sm:text-sm text-[--aqua] whitespace-nowrap min-w-0">{weekLabel}</div>
                <TabButton className="px-1.5 text-[10px]" active={false} onClick={() => setStatsDate(new Date())}>This</TabButton>
                <TabButton className="px-1.5 text-[10px]" active={false} onClick={() => setStatsDate(d => new Date(d.setDate(d.getDate() + 7)))}>Next ▶</TabButton>
            </div>
            <div className="flex gap-1 h-20 sm:h-10 items-end border-b-2 border-[--border2] pb-1 mt-2.5">
                {stats.weekData.map((ml, i) => <div key={i} className="flex-1 bg-[--orange] border-t-2 border-[#ffd12b] rounded-t-sm" style={{ height: `${maxWeekMl > 0 ? (ml / maxWeekMl * 100) : 0}%` }} title={`${dayNames[(weekStart.getDay() + i) % 7]}: ${ml}ml`}></div>)}
            </div>

            <div className="flex gap-1.5 items-center my-2.5 mt-4 flex-wrap">
                <TabButton className="px-1.5 text-[10px]" active={false} onClick={() => setStatsDate(d => new Date(d.setMonth(d.getMonth() - 1)))}>◀ Prev</TabButton>
                <div className="flex-1 text-center font-bold text-xs sm:text-sm text-[--aqua]">{monthLabel}</div>
                <TabButton className="px-1.5 text-[10px]" active={false} onClick={() => setStatsDate(new Date())}>This</TabButton>
                <TabButton className="px-1.5 text-[10px]" active={false} onClick={() => setStatsDate(d => new Date(d.setMonth(d.getMonth() + 1)))}>Next ▶</TabButton>
            </div>
             <div className="flex gap-0.5 h-20 sm:h-10 items-end border-b-2 border-[--border2] pb-1 mt-2.5">
                {stats.monthData.map((ml, i) => <div key={i} className="flex-1 bg-[--orange] border-t-2 border-[#ffd12b] rounded-t-sm" style={{ height: `${maxMonthMl > 0 ? (ml / maxMonthMl * 100) : 0}%` }} title={`Day ${i+1}: ${ml}ml`}></div>)}
            </div>
        </div>
    );
};

// --- Reminders Tab ---
const RemindersTab: React.FC<Pick<SetupPanelProps, 'gameState' | 'onSaveReminders'>> = ({ gameState, onSaveReminders }) => {
    const [reminders, setReminders] = useState(gameState.settings.reminders);

    const handleSave = () => {
        onSaveReminders(reminders);
    };

    const statusText = gameState.notificationPermission.charAt(0).toUpperCase() + gameState.notificationPermission.slice(1);
    const statusColor = {
        granted: 'text-green-400',
        denied: 'text-red-400',
        default: 'text-yellow-400'
    }[gameState.notificationPermission];

    return (
        <div>
            <Row label="Interval (minutes)">
                <input type="number" min="10" step="5" value={reminders.intervalMin} onChange={e => setReminders(r => ({ ...r, intervalMin: +e.target.value }))} className={BaseInput} />
            </Row>
            <Row label="Start Hour (24h)">
                <input type="number" min="0" max="23" value={reminders.startHour} onChange={e => setReminders(r => ({ ...r, startHour: +e.target.value }))} className={BaseInput} />
            </Row>
            <Row label="End Hour (24h)">
                <input type="number" min="0" max="23" value={reminders.endHour} onChange={e => setReminders(r => ({ ...r, endHour: +e.target.value }))} className={BaseInput} />
            </Row>
            <div className="flex items-center gap-4 mt-4">
                 <TabButton active={true} onClick={handleSave}>SAVE</TabButton>
                 <Hint>Status: <span className={statusColor}>{statusText}</span></Hint>
            </div>
            <Hint className="mt-4 leading-relaxed">
                Granting permission allows system notifications.
                <br />
                <strong className="text-yellow-400">Important:</strong> For reminders to work, this app must be running (even in a background tab). If the app is fully closed, reminders cannot be sent.
            </Hint>
        </div>
    );
};

// --- Shift Tab ---
const ShiftTab: React.FC<Pick<SetupPanelProps, 'gameState' | 'setGameState' | 'showToast'>> = ({ gameState, setGameState, showToast }) => {
    const [mode, setMode] = useState(gameState.settings.shiftMode);
    const [customWindow, setCustomWindow] = useState(gameState.settings.customWindow);
    const [cadence, setCadence] = useState(gameState.settings.cadenceMin);

    const handleSave = () => {
        setGameState(prev => ({ ...prev, settings: { ...prev.settings, shiftMode: mode, customWindow, cadenceMin: cadence } }));
        showToast('Shift settings saved');
    };

    return (
        <div>
            <Row label="Shift">
                <select value={mode} onChange={e => setMode(e.target.value as ShiftMode)} className={BaseInput}>
                    <option value="day">Day (8–21h)</option>
                    <option value="night">Night (21–8h)</option>
                    <option value="custom">Custom</option>
                </select>
            </Row>
            {mode === 'custom' && (
                <div id="customFields">
                    <Row label="Start">
                        <input type="time" value={customWindow.start} onChange={e => setCustomWindow(w => ({ ...w, start: e.target.value }))} className={BaseInput} />
                    </Row>
                    <Row label="End">
                        <input type="time" value={customWindow.end} onChange={e => setCustomWindow(w => ({ ...w, end: e.target.value }))} className={BaseInput} />
                    </Row>
                    <Row label="Cadence">
                        <div className="flex items-center gap-2 w-full">
                            <input type="number" min="15" step="15" value={cadence} onChange={e => setCadence(+e.target.value)} className={BaseInput} />
                            <span className="text-sm text-[--muted]">minutes</span>
                        </div>
                    </Row>
                </div>
            )}
            <div className="mt-4">
                <TabButton active={true} onClick={handleSave}>SAVE</TabButton>
            </div>
            <Hint className="mt-4">Shift controls your <em>shift window</em> in case you hydrate overnight.</Hint>
        </div>
    );
};

// --- Goal Tab ---
const GoalTab: React.FC<Pick<SetupPanelProps, 'gameState' | 'setGameState' | 'showToast'>> = ({ gameState, setGameState, showToast }) => {
    const [goal, setGoal] = useState(gameState.goalBase);
    const [useCustom, setUseCustom] = useState(gameState.settings.useCustomGoal);
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [activity, setActivity] = useState('moderate');

    const handleSave = () => {
        setGameState(prev => ({
            ...prev,
            goalBase: goal,
            settings: { ...prev.settings, useCustomGoal: useCustom },
            celebratedToday: false, // Reset celebration status if goal changes
        }));
        showToast('Goal saved');
    };
    
    const handleCalculate = () => {
        const numAge = +age;
        const numWeight = +weight;

        if (!numAge || numAge < 1 || numAge > 120) {
            showToast("Please enter a valid age.");
            return;
        }
        if (!numWeight || numWeight < 20 || numWeight > 500) {
            showToast("Please enter a valid weight in lbs.");
            return;
        }
        
        // Standard formula: (Weight in lbs * 0.5 oz) + activity bonus
        let baseOz = numWeight * 0.5;
        
        let activityOz = 0;
        if (activity === 'moderate') {
            activityOz = 20; // ~600ml
        } else if (activity === 'active') {
            activityOz = 40; // ~1200ml
        }

        const totalOz = baseOz + activityOz;
        const totalMl = totalOz * 29.5735; // Convert ounces to ml
        
        // Round to nearest 50ml for a cleaner number
        const calculatedGoal = Math.round(totalMl / 50) * 50;

        setGoal(calculatedGoal);
        setUseCustom(true);
        showToast(`Recommended goal: ${calculatedGoal} ml`);
    };

    return (
        <div>
            <div className="text-sm text-[#a7c5f4] py-1">Goal Wizard</div>
            <Row label="Age (years)"><input type="number" value={age} onChange={e=>setAge(e.target.value)} className={BaseInput} /></Row>
            <Row label="Weight (lbs)"><input type="number" value={weight} onChange={e=>setWeight(e.target.value)} className={BaseInput} /></Row>
            <Row label="Activity">
                <select value={activity} onChange={e=>setActivity(e.target.value)} className={BaseInput}>
                    <option value="sedentary">Sedentary</option>
                    <option value="moderate">Moderate</option>
                    <option value="active">Active</option>
                </select>
            </Row>
            <div className="flex items-center gap-2 my-3 flex-wrap">
                 <TabButton active={true} onClick={handleCalculate}>
                    CALCULATE
                 </TabButton>
                 <Hint>Uses a standard formula to suggest a goal.</Hint>
            </div>
            <hr className="border-none h-px bg-[#0e2d66] my-2" />
            <div className="flex items-center gap-2.5 my-3">
                <input id="useCustomGoal" type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} className="w-4 h-4 accent-[--orange]" />
                <label htmlFor="useCustomGoal" className="text-sm">Use custom goal</label>
            </div>
            <Row label="Daily Goal">
                <div className="flex items-center gap-2 w-full">
                    <input type="number" min="500" step="50" value={goal} onChange={(e) => setGoal(Number(e.target.value))} className={BaseInput} />
                    <span className="text-sm text-[--muted]">ml</span>
                </div>
            </Row>
            <div className="my-4"><TabButton active={true} onClick={handleSave}>SAVE</TabButton></div>
            <Hint>Default is <strong>2000 ml/day</strong>. Turn on "Use custom goal" to override.</Hint>
        </div>
    );
};

export const SetupPanel: React.FC<SetupPanelProps> = (props) => {
    const [activeTab, setActiveTab] = useState<Tab>('stats');
    const { onClose, gameState, setGameState, showToast, onSaveReminders } = props;
    
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-50 p-4">
            <div className="w-[min(640px,95vw)] max-h-[85vh] overflow-auto bg-[--cabinet] border-4 border-[--blue-dark] shadow-[inset_0_0_0_4px_var(--border2)] rounded-md p-3">
                <div className="flex gap-1.5 mb-2 flex-wrap">
                    <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>STATS</TabButton>
                    <TabButton active={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')}>REMINDERS</TabButton>
                    <TabButton active={activeTab === 'shift'} onClick={() => setActiveTab('shift')}>SHIFT</TabButton>
                    <TabButton active={activeTab === 'goal'} onClick={() => setActiveTab('goal')}>GOAL</TabButton>
                    <div className="flex-1 min-w-[10px]"></div>
                    <TabButton active={false} onClick={onClose}>CLOSE</TabButton>
                </div>
                <div className="mt-4">
                    {activeTab === 'stats' && <StatsTab gameState={gameState} />}
                    {activeTab === 'reminders' && <RemindersTab gameState={gameState} onSaveReminders={onSaveReminders} />}
                    {activeTab === 'shift' && <ShiftTab gameState={gameState} setGameState={setGameState} showToast={showToast} />}
                    {activeTab === 'goal' && <GoalTab gameState={gameState} setGameState={setGameState} showToast={showToast} />}
                </div>
            </div>
        </div>
    );
};