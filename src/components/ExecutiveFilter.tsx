import { useState } from "react";
import { format, getWeeksInMonth, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Dropdown, { DropdownItem } from "@/components/Dropdown";

export type ExecMode = "day" | "week" | "month";

export interface ExecFilterValue {
  mode: ExecMode;
  date: Date;          // for day
  shifts: string[];    // for day (Shift A/B/C/Daily)
  week: string;        // for week (W1..W5)
  month: string;       // for month (yyyy-MM)
}

interface Props {
  value: ExecFilterValue;
  onChange: (v: ExecFilterValue) => void;
}

const SHIFTS = [
  { id: "A", label: "Shift A", time: "06:00 - 14:00" },
  { id: "B", label: "Shift B", time: "14:00 - 22:00" },
  { id: "C", label: "Shift C", time: "22:00 - 06:00" },
  { id: "D", label: "Daily",   time: "06:00 - 06:00" },
];

const TABS: { value: ExecMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const monthOptions = (() => {
  const out: { value: string; label: string }[] = [];
  const base = new Date();
  for (let i = -11; i <= 0; i++) {
    const d = addMonths(base, i);
    out.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM-yyyy") });
  }
  return out.reverse();
})();

const ExecutiveFilter = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);

  const setMode = (mode: ExecMode) => onChange({ ...value, mode });

  const toggleShift = (id: string) => {
    const has = value.shifts.includes(id);
    onChange({
      ...value,
      shifts: has ? value.shifts.filter((s) => s !== id) : [...value.shifts, id],
    });
  };

  const weekCount = getWeeksInMonth(value.date, { weekStartsOn: 1 });
  const weekOptions = Array.from({ length: weekCount }, (_, i) => `W${i + 1}`);

  const renderTrigger = () => {
    if (value.mode === "day") {
      const shiftLabel =
        value.shifts.length === 0
          ? "No shift"
          : value.shifts.length === SHIFTS.length
          ? "All shifts"
          : value.shifts.map((s) => (s === "D" ? "Daily" : `Shift ${s}`)).join(", ");
      return (
        <Button
          variant="outline"
          className="h-9 justify-between gap-2 text-sm font-normal min-w-[260px] bg-card"
        >
          <span className="flex items-center gap-2 truncate">
            <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            {format(value.date, "dd/MM/yyyy")}
            <span className="text-muted-foreground">·</span>
            <span className="truncate text-xs text-muted-foreground">{shiftLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      );
    }
    if (value.mode === "week") {
      return null;
    }
    return null;
  };

  return (
    <div className="flex items-end gap-2">
      {/* Tabs */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Period</label>
        <div className="inline-flex rounded-md border border-border bg-card p-0.5">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setMode(t.value)}
              className={cn(
                "px-3 h-8 text-xs font-medium rounded transition-colors",
                value.mode === t.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          {value.mode === "day" ? "Date & Shift" : value.mode === "week" ? "Week" : "Month"}
        </label>

        {value.mode === "day" && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{renderTrigger()}</PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex">
                {/* Calendar */}
                <div className="border-r border-border">
                  <Calendar
                    mode="single"
                    selected={value.date}
                    onSelect={(d) => d && onChange({ ...value, date: d })}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </div>
                {/* Shifts */}
                <div className="p-4 min-w-[220px]">
                  <div className="text-sm font-semibold mb-3">Shift</div>
                  <div className="space-y-3">
                    {SHIFTS.map((s) => {
                      const checked = value.shifts.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex items-center gap-3 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleShift(s.id)}
                          />
                          <span className="font-medium">{s.label}</span>
                          <span className="text-xs text-muted-foreground">{s.time}</span>
                          <span className="text-critical text-xs">*</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {value.mode === "week" && (
          <div className="flex gap-2">
            {/* Month picker for context */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 text-sm font-normal bg-card">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  {format(value.date, "MMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex items-center justify-between p-2 border-b border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ ...value, date: subMonths(value.date, 1) })}
                  >
                    ‹
                  </Button>
                  <span className="text-sm font-medium">{format(value.date, "MMMM yyyy")}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ ...value, date: addMonths(value.date, 1) })}
                  >
                    ›
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Dropdown
              value={value.week}
              onValueChange={(v) => onChange({ ...value, week: v })}
              placeholder="Select week"
              triggerClassName="w-[140px]"
            >
              {weekOptions.map((w, i) => {
                const monthStart = startOfMonth(value.date);
                const monthEnd = endOfMonth(value.date);
                return (
                  <DropdownItem key={w} value={w}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{w}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(monthStart, "MMM")} {i * 7 + 1}–
                        {Math.min((i + 1) * 7, monthEnd.getDate())}
                      </span>
                    </span>
                  </DropdownItem>
                );
              })}
            </Dropdown>
          </div>
        )}

        {value.mode === "month" && (
          <Dropdown
            value={value.month}
            onValueChange={(v) => onChange({ ...value, month: v })}
            placeholder="Select month"
            triggerClassName="w-[200px]"
            options={monthOptions.map((m) => ({ value: m.value, label: m.label }))}
          />
        )}
      </div>
    </div>
  );
};

export default ExecutiveFilter;
