'use client';

import { useState } from 'react';

interface SwitcherProps {
  options: string[];
  defaultIndex?: number;
  onChange?: (element: string, index: number) => void;
  value?: number;
}

export default function Switcher({
  options,
  defaultIndex = 0,
  onChange,
  value,
}: SwitcherProps) {
  const [currentIndex, setIndex] = useState<number | null>(null);

  const optionsLength = options.length;
  const normalizedDefaultIndex = optionsLength > 0
    ? ((defaultIndex % optionsLength) + optionsLength) % optionsLength
    : 0;
  
  const displayIndex = value !== undefined
    ? value
    : (currentIndex ?? normalizedDefaultIndex);

  const handlePrevious = () => {
    if (optionsLength === 0) return;
    let newValue = displayIndex - 1;
    if (newValue < 0) newValue += optionsLength;
    onChange?.(options[newValue], newValue);
    setIndex(newValue);
  };

  const handleNext = () => {
    if (optionsLength === 0) return;
    let newValue = displayIndex + 1;
    if (newValue >= optionsLength) newValue -= optionsLength;
    onChange?.(options[newValue], newValue);
    setIndex(newValue);
  };

  if (optionsLength === 0) {
    return (
      <div className="switcher-component">
        <button onClick={handlePrevious} type="button" disabled>
          {'<'}
        </button>
        <p>-</p>
        <button onClick={handleNext} type="button" disabled>
          {'>'}
        </button>
      </div>
    );
  }

  return (
    <div className="switcher-component">
      <button onClick={handlePrevious} type="button">
        {'<'}
      </button>
      <p>{options[displayIndex]}</p>
      <button onClick={handleNext} type="button">
        {'>'}
      </button>
    </div>
  );
}
