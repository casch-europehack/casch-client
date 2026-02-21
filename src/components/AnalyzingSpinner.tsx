import { Leaf } from "lucide-react";

interface AnalyzingSpinnerProps {
  message?: string;
}

export function AnalyzingSpinner({ message = "We're analyzing your code and will be done soon!" }: AnalyzingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-slide-up">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Leaf className="w-8 h-8 text-primary animate-pulse-gentle" />
        </div>
      </div>
      <p className="text-lg font-display font-semibold text-foreground text-center">
        Profiling your training job…
      </p>
      <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm">
        {message}
      </p>
    </div>
  );
}
