import { useState, useCallback } from 'react';
import { Braces, Copy, Check, Sparkles, AlertCircle, RotateCcw, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FormatPreset {
  name: string;
  indentSize: number;
  sortKeys: boolean;
  inlineArrays: boolean;
  inlineThreshold: number;
}

const PRESETS: Record<string, FormatPreset> = {
  standard: {
    name: 'Standard',
    indentSize: 2,
    sortKeys: false,
    inlineArrays: false,
    inlineThreshold: 0,
  },
  compact: {
    name: 'Compact',
    indentSize: 2,
    sortKeys: false,
    inlineArrays: true,
    inlineThreshold: 80,
  },
  expanded: {
    name: 'Expanded',
    indentSize: 4,
    sortKeys: false,
    inlineArrays: false,
    inlineThreshold: 0,
  },
  sorted: {
    name: 'Sorted Keys',
    indentSize: 2,
    sortKeys: true,
    inlineArrays: false,
    inlineThreshold: 0,
  },
  minified: {
    name: 'Minified',
    indentSize: 0,
    sortKeys: false,
    inlineArrays: true,
    inlineThreshold: Infinity,
  },
};

function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    Object.keys(obj as Record<string, unknown>)
      .sort()
      .forEach((key) => {
        sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
      });
    return sorted;
  }
  return obj;
}

function formatJson(input: string, preset: FormatPreset): string {
  const parsed = JSON.parse(input);
  const processedData = preset.sortKeys ? sortObjectKeys(parsed) : parsed;

  if (preset.indentSize === 0) {
    return JSON.stringify(processedData);
  }

  return JSON.stringify(processedData, null, preset.indentSize);
}

export function JsonBeautifierPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('standard');
  const [customSettings, setCustomSettings] = useState<FormatPreset>(PRESETS.standard);
  const [useCustom, setUseCustom] = useState(false);

  const activePreset = useCustom ? customSettings : PRESETS[selectedPreset];

  const handleBeautify = useCallback(() => {
    if (!input.trim()) {
      setError('Please enter some JSON to beautify');
      setOutput('');
      return;
    }

    try {
      const formatted = formatJson(input, activePreset);
      setOutput(formatted);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
      setOutput('');
    }
  }, [input, activePreset]);

  const handleCopy = useCallback(async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  }, [output]);

  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
    setError(null);
  }, []);

  const handlePresetChange = useCallback((value: string) => {
    setSelectedPreset(value);
    if (value !== 'custom') {
      setUseCustom(false);
    }
  }, []);

  return (
    <div className="fade-in flex flex-col gap-6 h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">JSON Beautifier</h1>
          <p className="text-muted-foreground mt-1">
            Format and beautify your JSON with configurable presets
          </p>
        </div>
      </div>

      {/* Settings Row */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <Label htmlFor="preset" className="text-sm font-medium">
            Preset:
          </Label>
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRESETS).map(([key, preset]) => (
                <SelectItem key={key} value={key}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Switch
            id="custom"
            checked={useCustom}
            onCheckedChange={setUseCustom}
          />
          <Label htmlFor="custom" className="text-sm cursor-pointer">
            Custom Settings
          </Label>
        </div>

        {useCustom && (
          <>
            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
              <Label htmlFor="indent" className="text-sm">
                Indent:
              </Label>
              <Select
                value={String(customSettings.indentSize)}
                onValueChange={(v) =>
                  setCustomSettings({ ...customSettings, indentSize: Number(v) })
                }
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="sortKeys"
                checked={customSettings.sortKeys}
                onCheckedChange={(checked) =>
                  setCustomSettings({ ...customSettings, sortKeys: checked })
                }
              />
              <Label htmlFor="sortKeys" className="text-sm cursor-pointer">
                Sort Keys
              </Label>
            </div>
          </>
        )}

        <div className="flex-1" />

        <Button variant="outline" size="sm" onClick={handleClear}>
          <RotateCcw className="size-4" />
          Clear
        </Button>
      </div>

      {/* Main Content - Two Panes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Input Pane */}
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Input JSON</Label>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your JSON here..."
            className="flex-1 min-h-[300px] font-mono text-sm resize-none"
          />
          <Button onClick={handleBeautify} className="w-full">
            <Sparkles className="size-4" />
            Beautify
          </Button>
        </div>

        {/* Output Pane */}
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Braces className="size-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Formatted Output</Label>
            </div>
            {output && (
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="size-4 text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copy
                  </>
                )}
              </Button>
            )}
          </div>

          {error ? (
            <div className="flex-1 min-h-[300px] rounded-md border border-destructive/50 bg-destructive/5 p-4">
              <div className="flex items-start gap-2 text-destructive">
                <AlertCircle className="size-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Invalid JSON</p>
                  <p className="text-sm mt-1 text-destructive/80">{error}</p>
                </div>
              </div>
            </div>
          ) : output ? (
            <pre className="flex-1 min-h-[300px] rounded-md border bg-muted/30 p-4 overflow-auto font-mono text-sm whitespace-pre">
              {output}
            </pre>
          ) : (
            <div className="flex-1 min-h-[300px] rounded-md border border-dashed bg-muted/20 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Braces className="size-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Formatted JSON will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preset Info */}
      {!useCustom && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">{PRESETS[selectedPreset].name}:</span>{' '}
          {PRESETS[selectedPreset].indentSize === 0
            ? 'No whitespace'
            : `${PRESETS[selectedPreset].indentSize} space indent`}
          {PRESETS[selectedPreset].sortKeys && ', sorted keys'}
        </div>
      )}
    </div>
  );
}
