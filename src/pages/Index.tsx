import { useState, useCallback } from "react";
import { Leaf, Zap, ChevronDown, Play, AlertCircle } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { AnalyzingSpinner } from "@/components/AnalyzingSpinner";
import { EnergyChart } from "@/components/EnergyChart";
import { CO2Chart } from "@/components/CO2Chart";
import { AggregatedCO2Chart } from "@/components/AggregatedCO2Chart";
import { GlobeSelector } from "@/components/GlobeSelector";
import { Button } from "@/components/ui/button";
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
  const [co2Error, setCo2Error] = useState(false);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [aggregatedResult, setAggregatedResult] = useState<AggregatedCO2Result | null>(null);
  const [isLoadingAggregated, setIsLoadingAggregated] = useState(false);
  const [aggregateError, setAggregateError] = useState(false);

  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  const fetchAggregate = useCallback(async (fileHash: string, loc: string, estimatedTimeS: number) => {
    setIsLoadingAggregated(true);
    setAggregateError(false);
    setSelectedPolicy("");
    try {
      const minTime = estimatedTimeS / 3600;
      const agg = await getAggregatedCO2(fileHash, loc, minTime);
      setAggregatedResult(agg);
    } catch (err) {
      console.error("Aggregate API failed:", err);
      setAggregatedResult(null);
      setAggregateError(true);
    } finally {
      setIsLoadingAggregated(false);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setProfilingResult(null);
    setCo2Result(null);
    setAggregatedResult(null);
    setAdvancedOpen(false);
    setCo2Error(false);
    setAggregateError(false);
    setSelectedPolicy("");
    setLocation("IE");

    try {
      const result = await analyzeFile(selectedFile);
      setProfilingResult(result);

      setIsLoadingCO2(true);
      setCo2Error(false);
      try {
        const co2 = await getCO2Emissions(result.file_hash, "IE");
        setCo2Result(co2);
      } catch {
        setCo2Error(true);
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
    setCo2Error(false);
    setSelectedPolicy("");
    if (!profilingResult) return;

    setIsLoadingCO2(true);
    try {
      const co2 = await getCO2Emissions(profilingResult.file_hash, newLocation);
      setCo2Result(co2);
    } catch {
      setCo2Error(true);
      setCo2Result(null);
    } finally {
      setIsLoadingCO2(false);
    }

    if (advancedOpen) {
      await fetchAggregate(profilingResult.file_hash, newLocation, profilingResult.estimated_total_time_s);
    }
  }, [profilingResult, advancedOpen, fetchAggregate]);

  const handleAdvancedToggle = useCallback(async () => {
    const willOpen = !advancedOpen;
    setAdvancedOpen(willOpen);

    if (willOpen && profilingResult) {
      await fetchAggregate(profilingResult.file_hash, location, profilingResult.estimated_total_time_s);
    }
  }, [advancedOpen, profilingResult, location, fetchAggregate]);

  const handleSchedule = useCallback(async () => {
    if (!profilingResult || !selectedFile) return;
    if (advancedOpen && aggregatedResult && !selectedPolicy) return;
    const policyToUse = (advancedOpen && selectedPolicy) ? selectedPolicy : "baseline";
    setIsScheduling(true);
    try {
      const result = await scheduleJob(selectedFile, location, policyToUse);
      toast({ title: "Job Scheduled!", description: result.message });
    } catch (err) {
      toast({ title: "Scheduling failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsScheduling(false);
    }
  }, [profilingResult, selectedFile, selectedPolicy, location, aggregatedResult, toast, advancedOpen]);

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
            {/* Globe location selector */}
            <GlobeSelector value={location} onChange={handleLocationChange} disabled={isLoadingCO2} />

            {/* Top bar with file info */}
            <div className="flex items-center gap-2 text-sm bg-card border border-border rounded-lg p-4 shadow-soft">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-display font-semibold text-foreground">
                {profilingResult.total_epochs} epochs · {profilingResult.total_steps.toLocaleString()} steps
              </span>
              <span className="text-muted-foreground">
                (profiled {profilingResult.profiled_epochs} epochs)
              </span>
            </div>

            {/* Energy chart */}
            <EnergyChart data={profilingResult} />

            {/* CO2 Error Banner */}
            {co2Error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 flex items-center gap-3 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>CO₂ emissions data is currently unavailable for this location. Please try another location.</span>
              </div>
            )}

            {/* CO2 chart */}
            {isLoadingCO2 ? (
              <div className="h-[360px] bg-card border border-border rounded-lg flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="ml-3 text-sm text-muted-foreground">Loading emissions data…</span>
              </div>
            ) : co2Result ? (
              <CO2Chart co2Data={co2Result} />
            ) : null}

            {/* Scheduling Section */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-soft animate-slide-up">
              <h4 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" />
                Schedule Your Job
              </h4>

              {/* Banner */}
              {co2Result && !co2Error && (
                <div className="mb-4">
                  <div className="bg-primary/10 border border-primary/20 text-primary rounded-lg p-4 flex items-center gap-3 text-sm font-medium">
                    <Leaf className="w-5 h-5" />
                    <span>
                      You can reduce your carbon emissions by {co2Result.savings_pct.toFixed(1)}% ({co2Result.savings_co2.toFixed(1)} gCO₂) by slowing down your job.
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 ml-1">
                    For even further reductions, consider changing the location!
                  </p>
                </div>
              )}

              {/* Expand / Collapse trade-off section */}
              <div className="mb-4">
                <button
                  onClick={handleAdvancedToggle}
                  className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                >
                  {advancedOpen ? "Hide trade-off analysis" : "Show duration vs CO₂ trade-off"}
                  <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Trade-off section */}
              {advancedOpen && (
                <div className="space-y-6 mb-6 border-t border-border pt-4">
                  {isLoadingAggregated ? (
                    <div className="flex items-center justify-center py-12 h-[300px]">
                      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span className="ml-3 text-sm text-muted-foreground">Computing optimization trade-offs…</span>
                    </div>
                  ) : aggregateError ? (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 flex items-center gap-3 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>Failed to load trade-off data. Please try again or select a different location.</span>
                    </div>
                  ) : aggregatedResult ? (
                    <AggregatedCO2Chart
                      data={aggregatedResult}
                      selectedPolicy={selectedPolicy}
                      onSelectPolicy={setSelectedPolicy}
                    />
                  ) : null}
                </div>
              )}

              <Button
                onClick={handleSchedule}
                disabled={isScheduling || (advancedOpen && isLoadingAggregated) || (advancedOpen && aggregatedResult && !selectedPolicy)}
                className="w-full sm:w-auto gradient-eco text-primary-foreground hover:opacity-90"
              >
                {isScheduling
                  ? "Scheduling…"
                  : selectedPolicy
                    ? `Schedule with ${selectedPolicy}`
                    : "Schedule Job"
                }
              </Button>
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
                  setSelectedPolicy("");
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
