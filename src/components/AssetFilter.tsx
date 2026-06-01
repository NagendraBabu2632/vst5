import { useMemo, useState } from "react";
import { Filter, ChevronDown, ChevronRight, Search, Factory } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Machine = { id: string; name: string };
type Line = { id: string; name: string; machines: Machine[] };
type Unit = { id: string; name: string; lines: Line[] };

const HIERARCHY: Unit[] = [
  {
    id: "u1",
    name: "Unit 1",
    lines: [
      { id: "u1-l1", name: "Line 1", machines: [{ id: "u1-l1-m1", name: "Compressor A" }, { id: "u1-l1-m2", name: "Dryer B" }] },
      { id: "u1-l2", name: "Line 2", machines: [{ id: "u1-l2-m1", name: "Motor C" }, { id: "u1-l2-m2", name: "Pump E" }] },
    ],
  },
  {
    id: "u2",
    name: "Unit 2",
    lines: [
      { id: "u2-l3", name: "Line 3", machines: [{ id: "u2-l3-m1", name: "Furnace D" }, { id: "u2-l3-m2", name: "Conveyor F" }] },
      { id: "u2-l4", name: "Line 4", machines: [{ id: "u2-l4-m1", name: "Mixer G" }, { id: "u2-l4-m2", name: "Boiler H" }] },
    ],
  },
  {
    id: "pmd",
    name: "PMD",
    lines: [
      { id: "pmd-l1", name: "PMD Line 1", machines: [{ id: "pmd-l1-m1", name: "Press 1" }, { id: "pmd-l1-m2", name: "Press 2" }] },
    ],
  },
  {
    id: "smd",
    name: "SMD",
    lines: [
      { id: "smd-l1", name: "SMD Line 1", machines: [{ id: "smd-l1-m1", name: "Cutter 1" }, { id: "smd-l1-m2", name: "Cutter 2" }] },
    ],
  },
];

interface AssetFilterProps {
  onChange?: (selectedMachineIds: string[]) => void;
}

const AssetFilter = ({ onChange }: AssetFilterProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({ u1: true, u2: true });
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filteredHierarchy = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HIERARCHY;
    return HIERARCHY.map((u) => ({
      ...u,
      lines: u.lines
        .map((l) => ({
          ...l,
          machines: l.machines.filter(
            (m) => m.name.toLowerCase().includes(q) || l.name.toLowerCase().includes(q) || u.name.toLowerCase().includes(q),
          ),
        }))
        .filter((l) => l.machines.length > 0 || l.name.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)),
    })).filter((u) => u.lines.length > 0 || u.name.toLowerCase().includes(q));
  }, [query]);

  const allMachineIdsOfLine = (l: Line) => l.machines.map((m) => m.id);
  const allMachineIdsOfUnit = (u: Unit) => u.lines.flatMap(allMachineIdsOfLine);

  const updateSelection = (next: Set<string>) => {
    setSelected(next);
    onChange?.(Array.from(next));
  };

  const toggleMachine = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    updateSelection(next);
  };

  const setMany = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    updateSelection(next);
  };

  const lineState = (l: Line): "all" | "some" | "none" => {
    const ids = allMachineIdsOfLine(l);
    const sel = ids.filter((id) => selected.has(id)).length;
    if (sel === 0) return "none";
    if (sel === ids.length) return "all";
    return "some";
  };

  const unitState = (u: Unit): "all" | "some" | "none" => {
    const ids = allMachineIdsOfUnit(u);
    const sel = ids.filter((id) => selected.has(id)).length;
    if (sel === 0) return "none";
    if (sel === ids.length) return "all";
    return "some";
  };

  const totalMachines = HIERARCHY.flatMap(allMachineIdsOfUnit).length;
  const summary = selected.size === 0 ? "All Assets" : `${selected.size}/${totalMachines}`;

  const reset = () => updateSelection(new Set());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 px-3">
          <Filter className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-medium">Asset Filter</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[420px] p-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Asset Hierarchy
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search unit, line or machine..."
              className="h-9 pl-8 text-sm bg-card"
            />
          </div>
        </div>

        {/* Tree */}
        <div className="max-h-[340px] overflow-auto py-1">
          {filteredHierarchy.map((u) => {
            const uState = unitState(u);
            const uIds = allMachineIdsOfUnit(u);
            const uSelCount = uIds.filter((id) => selected.has(id)).length;
            const uOpen = expandedUnits[u.id] ?? false;
            return (
              <div key={u.id} className="select-none">
                {/* Unit row */}
                <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 group">
                  <button
                    onClick={() => setExpandedUnits((p) => ({ ...p, [u.id]: !uOpen }))}
                    className="p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label={uOpen ? "Collapse" : "Expand"}
                  >
                    {uOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <Checkbox
                    checked={uState === "all" ? true : uState === "some" ? "indeterminate" : false}
                    onCheckedChange={(v) => setMany(uIds, !!v)}
                  />
                  <Factory className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-semibold">{u.name}</span>
                  <span className="text-[11px] text-muted-foreground ml-1">
                    {uSelCount}/{uIds.length}
                  </span>
                </div>

                {/* Lines */}
                {uOpen &&
                  u.lines.map((l) => {
                    const lState = lineState(l);
                    const lIds = allMachineIdsOfLine(l);
                    const lSelCount = lIds.filter((id) => selected.has(id)).length;
                    const lOpen = expandedLines[l.id] ?? false;
                    return (
                      <div key={l.id} className="ml-5 border-l border-border">
                        <div className="flex items-center gap-2 pl-3 pr-3 py-1.5 hover:bg-muted/40">
                          <button
                            onClick={() => setExpandedLines((p) => ({ ...p, [l.id]: !lOpen }))}
                            className="p-0.5 text-muted-foreground hover:text-foreground"
                            aria-label={lOpen ? "Collapse" : "Expand"}
                          >
                            {lOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                          <Checkbox
                            checked={lState === "all" ? true : lState === "some" ? "indeterminate" : false}
                            onCheckedChange={(v) => setMany(lIds, !!v)}
                          />
                          <span className="text-sm">{l.name}</span>
                          <span className="text-[11px] text-muted-foreground ml-1">
                            {lSelCount}/{lIds.length}
                          </span>
                        </div>

                        {/* Machines */}
                        {lOpen &&
                          l.machines.map((m) => (
                            <div
                              key={m.id}
                              className={cn(
                                "ml-5 border-l border-border flex items-center gap-2 pl-3 pr-3 py-1.5 hover:bg-muted/40",
                              )}
                            >
                              <span className="w-4" />
                              <Checkbox
                                checked={selected.has(m.id)}
                                onCheckedChange={() => toggleMachine(m.id)}
                              />
                              <span className="text-sm text-foreground/90">{m.name}</span>
                            </div>
                          ))}
                      </div>
                    );
                  })}
              </div>
            );
          })}
          {filteredHierarchy.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">No matches</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-3 py-2.5 border-t border-border bg-muted/30">
          <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">
            Reset
          </button>
          <Button size="sm" className="h-8" onClick={() => setOpen(false)}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AssetFilter;
