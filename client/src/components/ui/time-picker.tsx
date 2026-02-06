import * as React from "react";
import { Clock, Check, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TimePickerProps {
    date?: Date;
    value?: string; // HH:MM 24h format
    onChange: (time: string) => void;
    className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
    const [open, setOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState("clock");

    // Parse value "HH:MM"
    const [hours, setHours] = React.useState<number>(() => {
        if (value) return parseInt(value.split(':')[0], 10);
        return 12; // Default
    });
    const [minutes, setMinutes] = React.useState<number>(() => {
        if (value) return parseInt(value.split(':')[1], 10);
        return 0; // Default
    });

    // Manual input state
    const [manualInput, setManualInput] = React.useState(() => {
        if (value) return value;
        return "12:00";
    });

    React.useEffect(() => {
        if (value) {
            const [h, m] = value.split(':').map(Number);
            if (!isNaN(h)) setHours(h);
            if (!isNaN(m)) setMinutes(m);
            setManualInput(value);
        }
    }, [value]);

    const handleTimeChange = (newHour: number, newMinute: number) => {
        setHours(newHour);
        setMinutes(newMinute);
        const formatted = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
        setManualInput(formatted);
        onChange(formatted);
    };

    const handleManualChange = (input: string) => {
        setManualInput(input);
        
        // Validate and parse manual input
        const regex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
        if (regex.test(input)) {
            const [h, m] = input.split(':').map(Number);
            setHours(h);
            setMinutes(m);
            onChange(input);
        }
    };

    const handleClockClick = (e: React.MouseEvent<SVGSVGElement>) => {
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const x = e.clientX - rect.left - centerX;
        const y = e.clientY - rect.top - centerY;
        
        const angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
        const normalizedAngle = (angle + 360) % 360;
        
        const isMinutes = Math.sqrt(x * x + y * y) > 60;
        
        if (isMinutes) {
            const minute = Math.round((normalizedAngle / 360) * 60) % 60;
            handleTimeChange(hours, minute);
        } else {
            const hour = Math.round((normalizedAngle / 360) * 12) % 12;
            handleTimeChange(hour === 0 ? 12 : hour, minutes);
        }
    };

    const formatDisplayTime = (h: number, m: number) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHour = h % 12 || 12;
        return `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    // Clock visualization
    const clockRadius = 80;
    const hourAngle = (hours % 12) * 30 + minutes * 0.5;
    const minuteAngle = minutes * 6;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-start text-left font-normal border-borderSoft hover:bg-hoverSoft transition-colors bg-white/90 dark:bg-white/5",
                        !value && "text-textMuted",
                        className
                    )}
                >
                    <Clock className="mr-2 h-4 w-4 opacity-50" />
                    {value ? (
                        <span className="font-medium text-textPrimary">
                            {formatDisplayTime(hours, minutes)}
                        </span>
                    ) : (
                        <span>Pick a time</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 border border-borderSoft bg-popover shadow-2xl rounded-xl" align="start">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-hoverSoft/50">
                        <TabsTrigger value="clock" className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="hidden sm:inline">Clock</span>
                        </TabsTrigger>
                        <TabsTrigger value="input" className="flex items-center gap-2">
                            <Keyboard className="h-4 w-4" />
                            <span className="hidden sm:inline">Manual</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Clock Tab */}
                    <TabsContent value="clock" className="space-y-4">
                        <div className="flex justify-center">
                            <svg width={220} height={220} viewBox="0 0 220 220" className="cursor-pointer" onClick={handleClockClick}>
                                {/* Clock Circle */}
                                <circle cx={110} cy={110} r={100} fill="var(--hoverSoft)" stroke="var(--borderSoft)" strokeWidth={2} opacity={0.3} />
                                
                                {/* Hour markers */}
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const angle = (i * 30 - 90) * (Math.PI / 180);
                                    const x1 = 110 + 85 * Math.cos(angle);
                                    const y1 = 110 + 85 * Math.sin(angle);
                                    const x2 = 110 + 95 * Math.cos(angle);
                                    const y2 = 110 + 95 * Math.sin(angle);
                                    return (
                                        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--textMuted)" strokeWidth={2} />
                                    );
                                })}

                                {/* Hour numbers */}
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const num = i === 0 ? 12 : i;
                                    const angle = (i * 30 - 90) * (Math.PI / 180);
                                    const x = 110 + 70 * Math.cos(angle);
                                    const y = 110 + 70 * Math.sin(angle);
                                    return (
                                        <text key={`num-${i}`} x={x} y={y} textAnchor="middle" dy="0.3em" className="text-xs font-semibold fill-textPrimary pointer-events-none">
                                            {num}
                                        </text>
                                    );
                                })}

                                {/* Hour hand */}
                                <line
                                    x1={110}
                                    y1={110}
                                    x2={110 + 50 * Math.sin((hourAngle * Math.PI) / 180)}
                                    y2={110 - 50 * Math.cos((hourAngle * Math.PI) / 180)}
                                    stroke="var(--brand)"
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                />

                                {/* Minute hand */}
                                <line
                                    x1={110}
                                    y1={110}
                                    x2={110 + 70 * Math.sin((minuteAngle * Math.PI) / 180)}
                                    y2={110 - 70 * Math.cos((minuteAngle * Math.PI) / 180)}
                                    stroke="var(--brand-link)"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    opacity={0.7}
                                />

                                {/* Center dot */}
                                <circle cx={110} cy={110} r={5} fill="var(--brand)" />
                            </svg>
                        </div>

                        <div className="flex gap-2 justify-center items-center">
                            <div className="text-center">
                                <Label className="text-xs text-textMuted uppercase tracking-wider mb-2 block">Hour</Label>
                                <div className="flex items-center gap-1">
                                    <Button
                                        size="sm"
                                        onClick={() => handleTimeChange((hours - 1 + 24) % 24, minutes)}
                                        className="px-2 h-8 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 font-bold"
                                    >
                                        −
                                    </Button>
                                    <div className="w-12 text-center font-bold text-lg text-brand">
                                        {hours.toString().padStart(2, '0')}
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleTimeChange((hours + 1) % 24, minutes)}
                                        className="px-2 h-8 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 font-bold"
                                    >
                                        +
                                    </Button>
                                </div>
                            </div>

                            <div className="text-lg font-bold text-textMuted">:</div>

                            <div className="text-center">
                                <Label className="text-xs text-textMuted uppercase tracking-wider mb-2 block">Minute</Label>
                                <div className="flex items-center gap-1">
                                    <Button
                                        size="sm"
                                        onClick={() => handleTimeChange(hours, (minutes - 5 + 60) % 60)}
                                        className="px-2 h-8 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 font-bold"
                                    >
                                        −
                                    </Button>
                                    <div className="w-12 text-center font-bold text-lg text-brand">
                                        {minutes.toString().padStart(2, '0')}
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleTimeChange(hours, (minutes + 5) % 60)}
                                        className="px-2 h-8 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 font-bold"
                                    >
                                        +
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="text-center p-3 rounded-lg bg-brand/5 border border-brand/20">
                            <p className="text-xs text-textMuted uppercase tracking-wider mb-1">Selected Time</p>
                            <p className="text-2xl font-bold text-brand">{formatDisplayTime(hours, minutes)}</p>
                        </div>
                    </TabsContent>

                    {/* Manual Input Tab */}
                    <TabsContent value="input" className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="time-input" className="text-textSecondary">Enter Time (HH:MM)</Label>
                            <Input
                                id="time-input"
                                type="time"
                                value={manualInput}
                                onChange={(e) => handleManualChange(e.target.value)}
                                className="h-11 text-base border-borderSoft focus:border-brand focus:ring-4 focus:ring-brand/10"
                            />
                            <p className="text-xs text-textMuted">Format: HH:MM (24-hour)</p>
                        </div>

                        <div className="p-3 rounded-lg bg-brand/5 border border-brand/20 space-y-2">
                            <p className="text-xs text-textMuted uppercase tracking-wider">Selected Time</p>
                            <p className="text-2xl font-bold text-brand">{formatDisplayTime(hours, minutes)}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                size="sm"
                                onClick={() => handleTimeChange(8, 0)}
                                className="text-xs bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 font-semibold"
                            >
                                08:00 AM
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleTimeChange(16, 0)}
                                className="text-xs bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 font-semibold"
                            >
                                04:00 PM
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleTimeChange(18, 0)}
                                className="text-xs bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 font-semibold"
                            >
                                06:00 PM
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleTimeChange(20, 0)}
                                className="text-xs bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 font-semibold"
                            >
                                08:00 PM
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleTimeChange(22, 0)}
                                className="text-xs bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 font-semibold"
                            >
                                10:00 PM
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleTimeChange(0, 0)}
                                className="text-xs bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 font-semibold"
                            >
                                12:00 AM
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="mt-4 flex justify-between items-center pt-4 border-t border-borderSoft">
                    <div className="text-xs text-textMuted">
                        {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
                    </div>
                    <Button size="sm" onClick={() => setOpen(false)} className="h-8 text-xs gap-1">
                        <Check className="h-3 w-3" />
                        Done
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
