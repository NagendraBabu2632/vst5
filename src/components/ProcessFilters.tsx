import { useMemo, useState } from "react";
import { format, subDays, startOfMonth, startOfDay, endOfDay } from "date-fns";
import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Dropdown, { DropdownItem } from "@/components/Dropdown";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const units = ["Unit 1", "Unit 2", "Unit 3", "PMD", "SMD"];
const lines = ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5"];
const machines = ["Compressor A", "Dryer B", "Motor C", "Furnace D", "Pump E", "Conveyor F"];
const parameters = [
  "Moisture Parameter 1",
  "Moisture Parameter 2",
  "Humidity Sensor 1",
  "Temperature 1",
  "Temperature 2",
];

const runningFamilies = ["Family A", "Family B", "Family C"];
const allFamilies = ["Family A", "Family B", "Family C", "Family D", "Family E"];

const periodOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
];

// Deterministic pseudo-random generator so run-time list is stable per family+period
const seededRand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const getPeriodRange = (period: string): { start: Date; end: Date } => {
  const now = new Date();
  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "last7":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "last30":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case "thisMonth":
      return { start: startOfMonth(now), end: endOfDay(now) };
    default:
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
  }
};

const generateRunTimes = (family: string, period: string) => {
  if (!family || !period) return [];
  const { start, end } = getPeriodRange(period);
  const seed =
    family.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 31 +
    period.length * 7;
  const rand = seededRand(seed);
  const span = end.getTime() - start.getTime();
  const count = period === "today" || period === "yesterday" ? 2 : period === "last7" ? 4 : 6;

  const runs: { start: Date; end: Date }[] = [];
  for (let i = 0; i < count; i++) {
    const slot = span / count;
    const slotStart = start.getTime() + i * slot;
    const offset = rand() * slot * 0.3;
    const duration = (1 + rand() * 6) * 60 * 60 * 1000; // 1–7 hrs
    const s = new Date(slotStart + offset);
    const e = new Date(Math.min(slotStart + offset + duration, end.getTime()));
    runs.push({ start: s, end: e });
  }
  return runs.sort((a, b) => b.start.getTime() - a.start.getTime());
};

const formatRun = (r: { start: Date; end: Date }) =>
  `${format(r.start, "yyyy-MM-dd HH:mm:ss")} → ${format(r.end, "yyyy-MM-dd HH:mm:ss")}`;

const ProcessFilters = () => {
  const [unit, setUnit] = useState<string>("");
  const [line, setLine] = useState<string>("");
  const [machine, setMachine] = useState<string>("");
  const [parameter, setParameter] = useState<string>("");
  const [family, setFamily] = useState<string>("");
  const [period, setPeriod] = useState<string>("last7");
  const [runTime, setRunTime] = useState<string>("");

  const runTimes = useMemo(() => generateRunTimes(family, period), [family, period]);

  const handleApply = () => {
    if (!family) {
      toast.error("Please select a Family");
      return;
    }
    toast.success("Filters applied", {
      description: `${family} · ${periodOptions.find((p) => p.value === period)?.label}${
        runTime ? ` · ${runTime}` : " · All runs"
      }`,
    });
  };

  const handleReset = () => {
    setUnit("");
    setLine("");
    setMachine("");
    setParameter("");
    setFamily("");
    setPeriod("last7");
    setRunTime("");
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Asset filters */}
      {[
        { label: "Unit Name", value: unit, setter: setUnit, opts: units },
        { label: "Line Name", value: line, setter: setLine, opts: lines },
        { label: "Machine Name", value: machine, setter: setMachine, opts: machines },
        { label: "Parameter Name", value: parameter, setter: setParameter, opts: parameters },
      ].map((f) => (
        <div key={f.label} className="flex flex-col gap-1 min-w-[140px] flex-1 max-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
          <Dropdown
            value={f.value}
            onValueChange={f.setter}
            placeholder="Select…"
            options={f.opts}
          />
        </div>
      ))}

      {/* Family */}
      <div className="flex flex-col gap-1 min-w-[160px] flex-1 max-w-[200px]">
        <label className="text-xs font-medium text-muted-foreground">Family</label>
        <Dropdown
          value={family}
          onValueChange={(v) => { setFamily(v); setRunTime(""); }}
          placeholder="Select family…"
        >
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Running
          </div>
          {runningFamilies.map((f) => (
            <DropdownItem key={f} value={f}>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                {f}
                <Badge variant="outline" className="text-[9px] h-4 px-1 ml-1 border-success/40 text-success">
                  Running
                </Badge>
              </span>
            </DropdownItem>
          ))}
          <div className="px-2 py-1 mt-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-t border-border">
            All Families
          </div>
          {allFamilies
            .filter((f) => !runningFamilies.includes(f))
            .map((f) => (
              <DropdownItem key={f} value={f}>{f}</DropdownItem>
            ))}
        </Dropdown>
      </div>

      {/* Period */}
      <div className="flex flex-col gap-1 min-w-[150px]">
        <label className="text-xs font-medium text-muted-foreground">Period</label>
        <Dropdown
          value={period}
          onValueChange={(v) => { setPeriod(v); setRunTime(""); }}
          placeholder="Select period…"
          options={periodOptions.map((p) => ({ value: p.value, label: p.label }))}
        />
      </div>

      {/* Family Run Times — appears once Family + Period selected */}
      {family && period && runTimes.length > 0 && (
        <div className="flex flex-col gap-1 min-w-[280px] flex-1 max-w-[340px]">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Family Run Times
            <Badge variant="outline" className="text-[9px] h-4 px-1 ml-1">
              {runTimes.length}
            </Badge>
          </label>
          <Dropdown
            value={runTime}
            onValueChange={setRunTime}
            placeholder="All runs in period"
            contentClassName="max-w-[400px]"
          >
            <DropdownItem value="all">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                All runs in period
              </span>
            </DropdownItem>
            {runTimes.map((r, i) => (
              <DropdownItem key={i} value={formatRun(r)}>
                <span className="mono text-xs">{formatRun(r)}</span>
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button variant="outline" className="h-9" onClick={handleReset}>
          Reset
        </Button>
        <Button className="h-9 gap-1.5" onClick={handleApply}>
          <Check className="h-4 w-4" />
          Apply
        </Button>
      </div>
    </div>
  );
};

export default ProcessFilters;
