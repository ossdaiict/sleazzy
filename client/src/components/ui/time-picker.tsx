import * as React from "react";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface TimePickerProps {
    date?: Date;
    value?: string;
    onChange: (time: string) => void;
    className?: string;
}

const QUICK_TIMES = ["18:00", "19:00", "20:00", "21:00", "22:00", "00:00", "06:00", "08:00"];

function formatDisplayTime(value?: string) {
    if (!value) return "Pick a time";

    const [rawHours, rawMinutes] = value.split(":").map(Number);
    if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) return value;

    const period = rawHours >= 12 ? "PM" : "AM";
    const hours = rawHours % 12 || 12;
    return `${hours}:${rawMinutes.toString().padStart(2, "0")} ${period}`;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={cn(
                        "h-10 w-full justify-start rounded-xl border-borderSoft bg-bgMain px-3 text-left font-normal text-textPrimary shadow-sm hover:bg-hoverSoft transition-all",
                        !value && "text-textMuted",
                        className
                    )}
                >
                    <Clock className="mr-2 h-4 w-4 text-brand/70" />
                    <span>{formatDisplayTime(value)}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 rounded-xl border-borderSoft bg-popover p-3 shadow-lg z-[100]" align="start">
                <div className="space-y-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Select Time</p>
                        <p className="mt-1 text-xl font-bold text-textPrimary">{formatDisplayTime(value)}</p>
                    </div>

                    <Input
                        type="time"
                        value={value || ""}
                        onChange={(event) => onChange(event.target.value)}
                        className="h-11 rounded-lg bg-bgMain border border-borderSoft text-textPrimary text-base font-semibold px-3 [color-scheme:light] dark:[color-scheme:dark]"
                    />

                    <div className="grid grid-cols-4 gap-2">
                        {QUICK_TIMES.map((time) => {
                            const selected = value === time;
                            return (
                                <Button
                                    key={time}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onChange(time)}
                                    className={cn(
                                        "h-9 rounded-lg px-2 text-xs font-semibold",
                                        selected && "border-brand bg-brand text-white hover:bg-brand hover:text-white"
                                    )}
                                >
                                    {formatDisplayTime(time).replace(" ", "")}
                                </Button>
                            );
                        })}
                    </div>

                    <Button
                        type="button"
                        size="sm"
                        onClick={() => setOpen(false)}
                        className="h-9 w-full gap-2 rounded-lg"
                    >
                        <Check className="h-4 w-4" />
                        Done
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
