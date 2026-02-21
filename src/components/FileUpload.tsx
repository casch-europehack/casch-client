import { useCallback, useState } from "react";
import { Upload, FileCode2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  selectedFile: File | null;
}

export function FileUpload({ onFileSelect, onAnalyze, isAnalyzing, selectedFile }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".py")) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 cursor-pointer
          ${isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
          }
        `}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".py"
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-lg font-display font-semibold text-foreground">
              Drop your Python training script here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse — supports .py files with PyTorch training loops
            </p>
          </div>
        </div>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between bg-card border border-border rounded-lg p-4 shadow-soft animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileCode2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onFileSelect(null as unknown as File); }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Button
        onClick={onAnalyze}
        disabled={!selectedFile || isAnalyzing}
        className="w-full h-12 text-base font-display font-semibold gradient-eco text-primary-foreground hover:opacity-90 transition-opacity"
        size="lg"
      >
        {isAnalyzing ? "Analyzing…" : "Analyze Carbon Footprint"}
      </Button>
    </div>
  );
}
