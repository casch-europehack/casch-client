import { useState, useCallback } from "react";
import { Leaf, Zap, ChevronDown, Clock, Play } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { AnalyzingSpinner } from "@/components/AnalyzingSpinner";
import { EnergyChart } from "@/components/EnergyChart";
import { CO2Chart } from "@/components/CO2Chart";
import { AggregatedCO2Chart } from "@/components/AggregatedCO2Chart";
import { LocationSelector } from "@/components/LocationSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyzeFile, getCO2Emissions, getAggregatedCO2, scheduleJob } from "@/lib/api";
import { ProfilingResult, CO2Result, AggregatedCO2Result } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profilingResult, setProfilingResult] = useState<ProfilingResult | null>(null);

  const [location, setLocation] = useState("IE");
  const [co2Result, setCo2Result] = useState<CO2Result | null>(null);
  const [isLoadingCO2, setIsLoadingCO2] = useState(false);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [aggregatedResult, setAggregatedResult] = useState<AggregatedCO2Result | null>(null);
  const [isLoadingAggregated, setIsLoadingAggregated] = useState(false);

  const [scheduleLocation, setScheduleLocation] = useState("IE");
  const [scheduleMinTime, setScheduleMinTime] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setProfilingResult(null);
    setCo2Result(null);
    setAggregatedResult(null);
    setAdvancedOpen(false);

    try {
      const result = await analyzeFile(selectedFile);
      setProfilingResult(result);

      setIsLoadingCO2(true);
      try {
        const co2 = await getCO2Emissions(result.file_hash, "IE");
        setCo2Result(co2);
      } catch (err) {
        toast({ title: "CO₂ data unavailable", description: "Could not fetch emissions data. Try changing location.", variant: "destructive" });
      } finally {
        setIsLoadingCO2(false);
      }
    } catch (err) {
      toast({ title: "Analysis failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedFile, toast]);

  const handleLocationChange = useCallback(async (newLocation: string) => {
    setLocation(newLocation);
    setAdvancedOpen(false);
    setAggregatedResult(null);
    if (!profilingResult) return;
    setIsLoadingCO2(true);
    try {
      const co2 = await getCO2Emissions(profilingResult.file_hash, newLocation);
      setCo2Result(co2);
    } catch (err) {
      toast({ title: "CO₂ data unavailable", description: "Could not fetch emissions data for this location.", variant: "destructive" });
    } finally {
      setIsLoadingCO2(false);
    }
  }, [profilingResult, toast]);

  const handleAdvancedToggle = useCallback(async () => {
    const willOpen = !advancedOpen;
    setAdvancedOpen(willOpen);

    if (willOpen && !aggregatedResult && profilingResult) {
      setIsLoadingAggregated(true);
      const minTime = profilingResult.estimated_total_time_s / 3600;
      try {
        const agg = await getAggregatedCO2(profilingResult.file_hash, location, minTime);
        setAggregatedResult(agg);
      } catch (err) {
        toast({ title: "Could not load advanced data", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
      } finally {
        setIsLoadingAggregated(false);
      }
    }
  }, [advancedOpen, aggregatedResult, profilingResult, location, toast]);

  const handleSchedule = useCallback(async () => {
    if (!profilingResult || !selectedPolicy) return;
    setIsScheduling(true);
    try {
      const result = await scheduleJob(profilingResult.file_hash, scheduleLocation, selectedPolicy);
      toast({ title: "Job Scheduled!", description: result.message });
    } catch (err) {
      toast({ title: "Scheduling failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsScheduling(false);
    }
  }, [profilingResult, selectedPolicy, scheduleLocation, toast]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-eco flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground leading-tight">
              Casch
            </h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              ML training carbon profiler
            </p>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-10">
        {/* Hero section for upload */}
        {!profilingResult && !isAnalyzing && (
          <div className="max-w-2xl mx-auto animate-slide-up">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                <Zap className="w-3.5 h-3.5" />
                Understand your training's carbon footprint
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
                Profile. Measure. Reduce.
              </h2>
              <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                Upload your PyTorch training script and discover the environmental
                impact of your ML workloads — then optimize.
              </p>
            </div>
            <FileUpload
              onFileSelect={setSelectedFile}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              selectedFile={selectedFile}
            />
          </div>
        )}

        {/* Loading state */}
        {isAnalyzing && <AnalyzingSpinner />}

        {/* Results */}
        {profilingResult && !isAnalyzing && (
          <div className="space-y-6 animate-slide-up">
            {/* Top bar with file info + location */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-lg p-4 shadow-soft">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-display font-semibold text-foreground">
                  {profilingResult.total_epochs} epochs · {profilingResult.total_steps.toLocaleString()} steps
                </span>
                <span className="text-muted-foreground">
                  (profiled {profilingResult.profiled_epochs} epochs)
                </span>
              </div>
              <LocationSelector value={location} onChange={handleLocationChange} disabled={isLoadingCO2} />
            </div>

            {/* Energy chart */}
            <EnergyChart data={profilingResult} />

            {/* CO2 chart */}
            {isLoadingCO2 && (
              <div className="bg-card border border-border rounded-lg p-12 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="ml-3 text-sm text-muted-foreground">Loading emissions data…</span>
              </div>
            )}
            {co2Result && !isLoadingCO2 && (
              <CO2Chart profilingData={profilingResult} co2Data={co2Result} />
            )}

            {/* Advanced section */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={handleAdvancedToggle}
                className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-display font-semibold text-foreground text-sm">Advanced: Scheduling & Optimization</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
              </button>

              {advancedOpen && (
                <div className="p-4 bg-card/50 space-y-6 border-t border-border">
                  {isLoadingAggregated && (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span className="ml-3 text-sm text-muted-foreground">Computing optimization data…</span>
                    </div>
                  )}

                  {aggregatedResult && !isLoadingAggregated && (
                    <>
                      <AggregatedCO2Chart data={aggregatedResult} />

                      {/* Schedule section */}
                      <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
                        <h4 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Play className="w-4 h-4 text-primary" />
                          Schedule Your Job
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block">Location</label>
                            <LocationSelector value={scheduleLocation} onChange={setScheduleLocation} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block">Min execution time (h)</label>
                            <Input
                              type="number"
                              min={(profilingResult.estimated_total_time_s / 3600).toFixed(1)}
                              step="0.5"
                              value={scheduleMinTime}
                              onChange={(e) => setScheduleMinTime(e.target.value)}
                              placeholder={(profilingResult.estimated_total_time_s / 3600).toFixed(1)}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block">Policy</label>
                            <select
                              value={selectedPolicy}
                              onChange={(e) => setSelectedPolicy(e.target.value)}
                              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                            >
                              <option value="">Select policy</option>
                              {aggregatedResult.policies.map((p) => (
                                <option key={p.name} value={p.name}>
                                  {p.name} ({p.time_h.toFixed(1)}h · {p.co2_g.toFixed(1)}g CO₂)
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <Button
                          onClick={handleSchedule}
                          disabled={!selectedPolicy || isScheduling}
                          className="mt-4 gradient-eco text-primary-foreground hover:opacity-90"
                        >
                          {isScheduling ? "Scheduling…" : "Schedule Job"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Back button */}
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setProfilingResult(null);
                  setCo2Result(null);
                  setAggregatedResult(null);
                  setAdvancedOpen(false);
                  setSelectedFile(null);
                }}
              >
                Analyze another file
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
