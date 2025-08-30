import React, { useEffect, useMemo, useState } from "react";
import { Upload, PlusCircle, MinusCircle, Wand2, DollarSign, Gauge, Signal, Globe, Wifi, CheckCircle2, XCircle, ChevronRight, Phone, Cloud, LineChart, RefreshCw, Play, Loader2, FileDown, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ----------------------------------------------
// Mock Data (replace with live plan catalog later)
// ----------------------------------------------
const FEATURE_CATALOG = [
  { id: "unlimited-data", label: "Unlimited data", icon: <Cloud className="h-4 w-4" /> },
  { id: "hotspot", label: "Hotspot / tethering", icon: <Wifi className="h-4 w-4" /> },
  { id: "priority-5g", label: "5G priority data", icon: <Gauge className="h-4 w-4" /> },
  { id: "intl-roaming", label: "International roaming", icon: <Globe className="h-4 w-4" /> },
  { id: "intl-calling", label: "International calling", icon: <Phone className="h-4 w-4" /> },
  { id: "streaming-perks", label: "Streaming perks (Netflix/Apple TV+)", icon: <LineChart className="h-4 w-4" /> },
  { id: "multi-line", label: "Multi-line discounts", icon: <PlusCircle className="h-4 w-4" /> },
];

// Placeholder catalog – swap with live API results
let BASE_PLANS = [
  {
    id: "tmob-essentials",
    carrier: "T-Mobile",
    plan: "Essentials 2-line",
    price: 90,
    perLine: 45,
    dataCapGB: "Unlimited (50GB priority)",
    hotspotGB: 10,
    intl: "Text + data at reduced speeds",
    perks: ["multi-line"],
    networkScore: 8.6,
  },
  {
    id: "vz-5g-start",
    carrier: "Verizon",
    plan: "5G Start",
    price: 100,
    perLine: 50,
    dataCapGB: "Unlimited (30GB priority)",
    hotspotGB: 5,
    intl: "Talk & text to Mexico/Canada",
    perks: ["priority-5g"],
    networkScore: 9.1,
  },
  {
    id: "att-value-plus",
    carrier: "AT&T",
    plan: "Value Plus",
    price: 90,
    perLine: 45,
    dataCapGB: "Unlimited (25GB priority)",
    hotspotGB: 5,
    intl: "Text + data at reduced speeds",
    perks: ["unlimited-data"],
    networkScore: 8.9,
  },
  {
    id: "mint-15gb",
    carrier: "Mint Mobile (MVNO)",
    plan: "15GB (2-line)",
    price: 60,
    perLine: 30,
    dataCapGB: 15,
    hotspotGB: 5,
    intl: "Add-on",
    perks: [],
    networkScore: 7.8,
  },
  {
    id: "googlefi-unlimited",
    carrier: "Google Fi",
    plan: "Unlimited Plus (2-line)",
    price: 100,
    perLine: 50,
    dataCapGB: "Unlimited (35GB priority)",
    hotspotGB: 10,
    intl: "High-speed intl data in 200+ locations",
    perks: ["intl-roaming"],
    networkScore: 8.4,
  },
];

// ----------------------------------------------
// Types
// ----------------------------------------------
interface ParsedBill {
  carrier: string;
  lines: number;
  currentPlan: string;
  monthlyCost: number;
  avgDataUsageGBPerLine: number;
  hotspotGBPerLine: number;
  intlUsage: boolean;
  overages: number;
  unusedAddOns: string[];
}

// ----------------------------------------------
// Fake back-end stubs (replace with real API calls)
// ----------------------------------------------
async function fakeParseBill(file: File | null): Promise<ParsedBill> {
  // Simulate OCR/Parsing latency
  await new Promise((r) => setTimeout(r, 1200));
  // Very naive "parsing" based on filename cues – replace with real OCR/regex
  const lower = (file?.name || "").toLowerCase();
  if (lower.includes("tmobile")) {
    return {
      carrier: "T-Mobile",
      lines: 3,
      currentPlan: "Go5G",
      monthlyCost: 165,
      avgDataUsageGBPerLine: 7.8,
      hotspotGBPerLine: 2.5,
      intlUsage: true,
      overages: 0,
      unusedAddOns: ["Apple TV+"],
    };
  }
  if (lower.includes("att") || lower.includes("at&t")) {
    return {
      carrier: "AT&T",
      lines: 2,
      currentPlan: "Unlimited Starter",
      monthlyCost: 130,
      avgDataUsageGBPerLine: 4.4,
      hotspotGBPerLine: 0.8,
      intlUsage: false,
      overages: 0,
      unusedAddOns: [],
    };
  }
  // Default mock (Verizon)
  return {
    carrier: "Verizon",
    lines: 2,
    currentPlan: "Unlimited Welcome",
    monthlyCost: 120,
    avgDataUsageGBPerLine: 5.2,
    hotspotGBPerLine: 1.1,
    intlUsage: false,
    overages: 0,
    unusedAddOns: ["Disney+"],
  };
}

async function fakeFetchPlans(zip: string, lines: number): Promise<Plan[]> {
  // Simulate network latency and minor price variance by region/promos
  await new Promise((r) => setTimeout(r, 800));
  const bump = zip ? (parseInt(zip[zip.length - 1] || "0", 10) % 5) : 0;
  return (BASE_PLANS as unknown as Plan[]).map((p) => ({
    ...p,
    price: p.price + bump, // small regional variance demo
    perLine: Math.round(((p.price + bump) / Math.max(1, lines)) * 100) / 100,
  }));
}

// Live fetch – plug your API base here or via env
async function fetchLivePlans(apiBase: string, zip: string, lines: number): Promise<Plan[]> {
  const url = `${apiBase.replace(/\/$/, "")}/plans?zip=${encodeURIComponent(zip)}&lines=${encodeURIComponent(String(lines))}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`Catalog API ${res.status}`);
  const json: PlanAPIResponse = await res.json();
  return (json.plans || []).map(normalizePlan);
}

// ----------------------------------------------
// Scoring (simple demo logic)
// ----------------------------------------------
function computeScore({ plan, wants, dislikes, budget, networkWeight }: any) {
  let score = 0;
  // Cost: higher score if under budget
  score += Math.max(0, budget - plan.price);
  // Feature match
  const matches = wants.filter((w: string) => plan.perks.includes(w)).length;
  score += matches * 10;
  // Penalize dislikes
  const dislikeHit = dislikes.filter((d: string) => plan.perks.includes(d)).length;
  score -= dislikeHit * 15;
  // Network quality weight
  score += (plan.networkScore || 0) * networkWeight;
  return Math.round(score);
}

// ----------------------------------------------
// Main App
// ----------------------------------------------
export default function PlanOptimizerApp() {
  const [billFile, setBillFile] = useState<File | null>(null);
  const [zip, setZip] = useState("");
  const [lines, setLines] = useState(2);
  const [budget, setBudget] = useState(120);
  const [networkWeight, setNetworkWeight] = useState(2);
  const [wants, setWants] = useState<string[]>(["hotspot", "multi-line"]);
  const [dislikes, setDislikes] = useState<string[]>(["streaming-perks"]);
  const [stayOnCarrierOnly, setStayOnCarrierOnly] = useState(false);

  // Live catalog controls
  const [useLiveCatalog, setUseLiveCatalog] = useState(false);
  const [apiBase, setApiBase] = useState("https://api.example.com");

  const [parsedBill, setParsedBill] = useState<ParsedBill | null>(null);
  const [plans, setPlans] = useState<Plan[]>(BASE_PLANS as unknown as Plan[]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshingPlans, setIsRefreshingPlans] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Derived: effective carrier for filter toggle label
  const currentCarrier = parsedBill?.carrier || "Your carrier";

  // Filter + rank
  const filteredPlans = useMemo(() => {
    let list = plans;
    if (!list.length) return [] as any[];
    if (stayOnCarrierOnly && parsedBill?.carrier) {
      list = list.filter((p) => p.carrier === parsedBill.carrier);
    }
    if (lines > 4) {
      list = list.filter((p) => p.carrier !== "Mint Mobile (MVNO)");
    }
    return list
      .map((p) => ({ ...p, score: computeScore({ plan: p, wants, dislikes, budget, networkWeight }) }))
      .sort((a, b) => b.score - a.score);
  }, [plans, wants, dislikes, budget, networkWeight, stayOnCarrierOnly, lines, parsedBill?.carrier]);

  const top = filteredPlans[0];

  // Actions
  const analyzeBill = async () => {
    setIsAnalyzing(true);
    try {
      const result = await fakeParseBill(billFile);
      setParsedBill(result);
      // Auto-adjust default line count & budget based on bill
      setLines(result.lines);
      setBudget(Math.max(40, Math.min(300, result.monthlyCost)));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const refreshPlans = async () => {
    setIsRefreshingPlans(true);
    setCatalogError(null);
    try {
      const updated = useLiveCatalog && apiBase
        ? await fetchLivePlans(apiBase, zip, lines)
        : await fakeFetchPlans(zip, lines);
      setPlans(updated);
    } catch (e: any) {
      setCatalogError(e?.message || "Failed to load catalog");
      const fallback = await fakeFetchPlans(zip, lines);
      setPlans(fallback);
    } finally {
      setIsRefreshingPlans(false);
    }
  };

  useEffect(() => {
    // Load default mock bill on first mount for a nicer first-run
    if (!parsedBill) {
      (async () => {
        setIsAnalyzing(true);
        const result = await fakeParseBill(null);
        setParsedBill(result);
        setLines(result.lines);
        setBudget(result.monthlyCost);
        setIsAnalyzing(false);
      })();
    }
  }, [parsedBill]);

  // Auto-refresh plans when toggling live/static or changing lines/zip
  useEffect(() => {
    (async () => {
      if (!zip && !useLiveCatalog) return; // avoid noisy calls on first load
      await refreshPlans();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLiveCatalog, zip, lines]);

  return (
    <TooltipProvider>
      <div className="min-h-screen w-full bg-gradient-to-b from-white to-slate-50">
        <header className="sticky top-0 z-30 border-b bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Signal className="h-6 w-6" />
              <h1 className="text-lg font-semibold">US Mobile Plan Optimizer</h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <div className="hidden md:flex items-center gap-2">
                <Badge variant="outline">Catalog: {useLiveCatalog ? "Live" : "Mock"}</Badge>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={refreshPlans} disabled={isRefreshingPlans}>
                    {isRefreshingPlans ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin"/> : <RefreshCw className="mr-2 h-3.5 w-3.5"/>}
                    Refresh plans
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pull latest plan catalog (swap to real API)</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-3">
          {/* Left column: Inputs */}
          <div className="md:col-span-1 space-y-6">
            <Section
              title="Upload your bill"
              right={<Badge variant="outline" className="gap-1"><Upload className="h-3 w-3"/> Any format</Badge>}
            >
              <div className="rounded-2xl border border-dashed p-4 text-center">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.csv"
                  className="hidden"
                  id="bill-upload"
                  onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                />
                <Label htmlFor="bill-upload" className="mx-auto flex w-full cursor-pointer flex-col items-center gap-2">
                  <Upload className="h-8 w-8" />
                  <div className="text-sm">{billFile ? billFile.name : "Click to upload or drop a file"}</div>
                  <div className="text-xs text-slate-500">PDF, image, or CSV</div>
                </Label>
                <div className="mt-3 flex justify-center">
                  <Button onClick={analyzeBill} disabled={isAnalyzing}>
                    {isAnalyzing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Analyzing…</>) : (<><Play className="mr-2 h-4 w-4"/>Analyze bill</>)}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>ZIP for coverage</Label>
                  <Input placeholder="e.g. 94107" value={zip} onChange={(e) => setZip(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Lines</Label>
                  <Select value={String(lines)} onValueChange={(v) => setLines(parseInt(v))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Switch checked={useLiveCatalog} onCheckedChange={setUseLiveCatalog} />
                  <span>Use live plan catalog</span>
                </div>
                <Badge variant="outline">Mode: {useLiveCatalog ? "Live" : "Mock"}</Badge>
              </div>

              {useLiveCatalog && (
                <div className="space-y-2">
                  <Label>Catalog API base</Label>
                  <Input placeholder="https://your-domain.tld" value={apiBase} onChange={(e) => setApiBase(e.target.value)} />
                  {catalogError && (
                    <div className="text-xs text-red-600">{catalogError}</div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Monthly budget (all lines)</Label>
                  <div className="flex items-center gap-1 text-sm"><DollarSign className="h-4 w-4"/>{budget}</div>
                </div>
                <Slider value={[budget]} min={40} max={300} step={5} onValueChange={(v) => setBudget(v[0])} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Network quality weight</Label>
                  <div className="text-sm">x{networkWeight}</div>
                </div>
                <Slider value={[networkWeight]} min={0} max={5} step={1} onValueChange={(v) => setNetworkWeight(v[0])} />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Switch checked={stayOnCarrierOnly} onCheckedChange={setStayOnCarrierOnly} />
                  <span>Show only {currentCarrier} options</span>
                </div>
                <Badge variant="outline">Current: {currentCarrier}</Badge>
              </div>
            </Section>

            <Section title="Features you want" right={<Tag>Pick a few</Tag>}>
              <div className="flex flex-wrap gap-2">
                {FEATURE_CATALOG.map((f) => {
                  const active = wants.includes(f.id);
                  return (
                    <Button
                      key={f.id}
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className="rounded-2xl"
                      onClick={() => setWants((curr) => (active ? curr.filter((x) => x !== f.id) : [...curr, f.id]))}
                    >
                      <span className="mr-2">{f.icon}</span>
                      {active ? <CheckCircle2 className="mr-1 h-4 w-4"/> : <PlusCircle className="mr-1 h-4 w-4"/>}
                      {f.label}
                    </Button>
                  );
                })}
              </div>
            </Section>

            <Section title="Features you don't need" right={<Tag>Filter out</Tag>}>
              <div className="flex flex-wrap gap-2">
                {FEATURE_CATALOG.map((f) => {
                  const active = dislikes.includes(f.id);
                  return (
                    <Button
                      key={f.id}
                      size="sm"
                      variant={active ? "destructive" : "outline"}
                      className="rounded-2xl"
                      onClick={() => setDislikes((curr) => (active ? curr.filter((x) => x !== f.id) : [...curr, f.id]))}
                    >
                      <span className="mr-2">{f.icon}</span>
                      {active ? <XCircle className="mr-1 h-4 w-4"/> : <MinusCircle className="mr-1 h-4 w-4"/>}
                      {f.label}
                    </Button>
                  );
                })}
              </div>
            </Section>

            <Section title="Export & next steps" right={<Tag>Optional</Tag>}>
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="justify-start" onClick={() => alert("Stub: export report PDF")}> <FileDown className="mr-2 h-4 w-4"/> Download report (PDF)</Button>
                <Button variant="outline" className="justify-start" onClick={() => alert("Stub: open carrier switch flow")}> <ExternalLink className="mr-2 h-4 w-4"/> Start switch on carrier site</Button>
              </div>
            </Section>
          </div>

          {/* Right column: Results */}
          <div className="md:col-span-2 space-y-6">
            <Section
              title="Bill insights"
              right={<Tag>{isAnalyzing ? "Analyzing…" : "Auto-extracted"}</Tag>}
            >
              {parsedBill ? (
                <>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <InsightTile label="Current carrier" value={parsedBill.carrier} icon={<Signal className="h-4 w-4"/>} />
                    <InsightTile label="Plan" value={parsedBill.currentPlan} icon={<Wand2 className="h-4 w-4"/>} />
                    <InsightTile label="Monthly cost" value={`$${parsedBill.monthlyCost}`} icon={<DollarSign className="h-4 w-4"/>} />
                    <InsightTile label="Avg data/line" value={`${parsedBill.avgDataUsageGBPerLine} GB`} icon={<Gauge className="h-4 w-4"/>} />
                  </div>
                  <div className="text-xs text-slate-500">Unused add-ons detected: {parsedBill.unusedAddOns.join(", ") || "None"}</div>
                  <Progress className="mt-3" value={Math.min(100, (parsedBill.avgDataUsageGBPerLine / 50) * 100)} />
                  <div className="text-xs text-slate-500 mt-1">Usage vs. a typical 50GB priority threshold</div>
                </>
              ) : (
                <div className="text-sm text-slate-600">Upload a bill and click Analyze to extract usage & costs.</div>
              )}
            </Section>

            <Section title="Top recommendation" right={<Tag>Ranked by fit</Tag>}>
              {top ? (
                <div className="flex flex-col gap-4 md:flex-row">
                  <Card className="w-full md:w-1/2 border-2 border-emerald-300">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CarrierLogo name={top.carrier} />
                          <span>{top.carrier} • {top.plan}</span>
                        </div>
                        <Badge className="bg-emerald-600">Score {top.score}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <Row label="Price (all lines)">${top.price} / mo</Row>
                      <Row label="Per-line">${top.perLine} / mo</Row>
                      <Row label="Data">{String(top.dataCapGB)}</Row>
                      <Row label="Hotspot">{top.hotspotGB} GB</Row>
                      <Row label="International">{top.intl}</Row>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {top.perks.map((p: string) => (
                          <Tag key={p}>{FEATURE_CATALOG.find(f=>f.id===p)?.label || p}</Tag>
                        ))}
                      </div>
                      {parsedBill && <Savings current={parsedBill.monthlyCost} proposed={top.price} />}
                      <Button className="w-full mt-2">See switch steps <ChevronRight className="ml-1 h-4 w-4"/></Button>
                    </CardContent>
                  </Card>

                  <Card className="w-full md:w-1/2">
                    <CardHeader>
                      <CardTitle>Compare vs current</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {parsedBill ? (
                        <CompareTable current={parsedBill} proposed={top} />
                      ) : (
                        <div className="text-sm text-slate-600">Analyze a bill to unlock comparisons.</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-sm text-slate-600">No matching plans under current filters.</div>
              )}
            </Section>

            <Section title="All matching plans" right={<Tag>{filteredPlans.length} results</Tag>}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filteredPlans.map((p) => (
                  <Card key={p.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-base">
                        <div className="flex items-center gap-2">
                          <CarrierLogo name={p.carrier} />
                          <span>{p.carrier} • {p.plan}</span>
                        </div>
                        <Badge variant="secondary">Score {p.score}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <Row label="Price (all lines)">${p.price} / mo</Row>
                      <Row label="Per-line">${p.perLine} / mo</Row>
                      <Row label="Data">{String(p.dataCapGB)}</Row>
                      <Row label="Hotspot">{p.hotspotGB} GB</Row>
                      <Row label="International">{p.intl}</Row>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {p.perks.map((perk: string) => (
                          <Tag key={perk}>{FEATURE_CATALOG.find(f=>f.id===perk)?.label || perk}</Tag>
                        ))}
                      </div>
                      {parsedBill && (
                        <div className="pt-2">
                          <Savings current={parsedBill.monthlyCost} proposed={p.price} compact />
                        </div>
                      )}
                      <div className="pt-2 flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm">Details</Button>
                        <Button size="sm">Choose</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Section>

            <Section title="Before & After — Your bill vs recommended" right={<Tag>Preview</Tag>}>
              {parsedBill && top ? (
                <BeforeAfterView current={parsedBill} recommended={top} />
              ) : (
                <div className="text-sm text-slate-600">Analyze a bill and select a recommendation to preview side-by-side savings.</div>
              )}
            </Section>

            <Section title="How scoring works" right={<Tag>Transparent</Tag>}>
              <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                <li>Cost score increases as total price drops below your budget.</li>
                <li>+10 points for each wanted feature a plan includes.</li>
                <li>-15 points for each feature you said you don’t need but the plan emphasizes.</li>
                <li>Network score (0–10) is multiplied by your chosen weight.</li>
              </ul>
            </Section>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="rounded-2xl px-3 py-1 text-xs">
      {children}
    </Badge>
  );
}

function Section({ title, children, right }: any) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {right}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function InsightTile({ label, value, icon }: any) {
  return (
    <div className="rounded-2xl border p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">{icon}{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function Row({ label, children }: any) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

function Savings({ current, proposed, compact = false }: { current: number; proposed: number; compact?: boolean }) {
  const monthly = Math.max(0, current - proposed);
  const annual = monthly * 12;
  return (
    <div className="rounded-xl bg-emerald-50 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-emerald-700 font-medium">
          <DollarSign className="h-4 w-4"/> {compact ? "Savings" : "Estimated savings"}
        </span>
        <span className="font-semibold text-emerald-700">${monthly}/mo</span>
      </div>
      {!compact && (
        <div className="mt-1 text-xs text-emerald-700/80">≈ ${annual}/yr if usage stays similar</div>
      )}
    </div>
  );
}

function CarrierLogo({ name }: { name: string }) {
  const letter = name?.[0] || "?";
  return (
    <div className="grid h-7 w-7 place-items-center rounded-xl border bg-white font-semibold">{letter}</div>
  );
}

function BeforeAfterView({ current, recommended }: any) {
  if (!current || !recommended) return (
    <div className="text-sm text-slate-600">Upload a bill and pick a recommendation to preview before/after.</div>
  );
  const monthly = current.monthlyCost;
  const proposed = recommended.price;
  const monthlySavings = Math.max(0, monthly - proposed);
  const perLineCurrent = (monthly / current.lines).toFixed(2);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-4">
        <CardHeader><CardTitle>Current — {current.carrier}</CardTitle></CardHeader>
        <CardContent>
          <Row label="Monthly (all lines)">${monthly}</Row>
          <Row label="Per line">${perLineCurrent}</Row>
          <Row label="Avg data/line">{current.avgDataUsageGBPerLine} GB</Row>
          <div className="mt-3"><Progress value={Math.min(100, (current.avgDataUsageGBPerLine/50)*100)} /></div>
        </CardContent>
      </Card>

      <Card className="p-4 border-2 border-emerald-300">
        <CardHeader><CardTitle>Recommended — {recommended.carrier}</CardTitle></CardHeader>
        <CardContent>
          <Row label="Monthly (all lines)">${proposed}</Row>
          <Row label="Per line">${recommended.perLine}</Row>
          <Row label="Data">{String(recommended.dataCapGB)}</Row>
          <div className="mt-3"><Savings current={monthly} proposed={proposed} /></div>
        </CardContent>
      </Card>
    </div>
  );
}

function CompareTable({ current, proposed }: any) {
  const rows = [
    { k: "Carrier", a: current.carrier, b: proposed.carrier },
    { k: "Plan", a: current.currentPlan, b: proposed.plan },
    { k: "Monthly (all lines)", a: `$${current.monthlyCost}`, b: `$${proposed.price}` },
    { k: "Per line", a: `$${(current.monthlyCost / current.lines).toFixed(2)}`, b: `$${proposed.perLine}` },
    { k: "Avg data/line", a: `${current.avgDataUsageGBPerLine} GB`, b: typeof proposed.dataCapGB === 'number' ? `${proposed.dataCapGB} GB` : `${proposed.dataCapGB}` },
    { k: "Hotspot/line", a: `${current.hotspotGBPerLine} GB`, b: `${proposed.hotspotGB} GB` },
    { k: "International", a: current.intlUsage ? "Used" : "Not used", b: proposed.intl },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="p-3 font-medium text-slate-500">Metric</th>
            <th className="p-3 font-medium text-slate-500">Current</th>
            <th className="p-3 font-medium text-slate-500">Recommended</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k} className="border-t">
              <td className="p-3 text-slate-600">{r.k}</td>
              <td className="p-3">{r.a}</td>
              <td className="p-3">{r.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
