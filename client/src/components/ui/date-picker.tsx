import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
    date?: Date;
    setDate: (date?: Date) => void;
    minDate?: Date;
    className?: string;
}

export function DatePicker({ date, setDate, minDate, className }: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full h-10 justify-start text-left font-normal border-borderSoft bg-bgMain hover:bg-hoverSoft transition-all text-textPrimary rounded-xl shadow-sm",
                        !date && "text-textMuted",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-brand opacity-70" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 bg-bgMain border border-borderSoft rounded-xl shadow-lg" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                        setDate(d);
                        setOpen(false);
                    }}
                    fromDate={minDate}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}
