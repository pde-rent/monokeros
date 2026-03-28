import { PRESET_COLORS } from "@monokeros/constants";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
  label?: string;
}

export function ColorPicker({
  value,
  onChange,
  colors = PRESET_COLORS,
  label = "Color",
}: ColorPickerProps) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider text-fg-3">{label}</label>
      <div className="mt-1.5 flex items-center gap-2">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`h-6 w-6 rounded-md border-2 transition-all ${
              value === c ? "border-fg scale-110" : "border-transparent"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}
