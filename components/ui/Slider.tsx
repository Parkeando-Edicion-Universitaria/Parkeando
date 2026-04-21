'use client';

import { useState } from 'react';

interface SliderProps {
  onChange?: (value: number) => void;
  suffix?: string;
  step?: number;
  max?: number;
  min?: number;
  defaultValue?: number;
  fixedNum?: number;
}

export default function Slider({
  onChange,
  suffix = '',
  step = 1,
  max = 100,
  min = 0,
  defaultValue = 50,
  fixedNum = 0,
}: SliderProps) {
  const [value, setValue] = useState<number | null>(null);
  const clampedDefault = Math.min(max, Math.max(min, defaultValue));
  const displayValue = value ?? clampedDefault;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.currentTarget.value);
    setValue(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="slider-component">
      <input
        type="range"
        aria-label="Slider"
        onChange={handleChange}
        value={displayValue}
        step={step}
        max={max}
        min={min}
      />
      <span>
        {displayValue.toFixed(fixedNum)}
        {suffix}
      </span>
    </div>
  );
}
