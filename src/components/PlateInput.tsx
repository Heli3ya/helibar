import React from 'react';
import { IranPlate, LicensePlateLetter } from '../types';
import { IRAN_PLATE_LETTERS, toEnglishDigits } from '../lib/iranPlate';

interface PlateInputProps {
  value: IranPlate;
  onChange: (val: IranPlate) => void;
  disabled?: boolean;
}

export const PlateInput: React.FC<PlateInputProps> = ({ value, onChange, disabled }) => {
  const handlePart1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 2);
    onChange({ ...value, part1: raw });
  };

  const handlePart2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 3);
    onChange({ ...value, part2: raw });
  };

  const handleProvince = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 2);
    onChange({ ...value, provinceCode: raw });
  };

  const handleLetter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const letter = e.target.value as LicensePlateLetter;
    onChange({
      ...value,
      letter,
      type: letter === 'ع' ? 'public' : 'commercial',
    });
  };

  const isYellow = value.letter === 'ع';

  return (
    <div
      dir="ltr"
      className={`inline-flex items-center rounded-lg border-2 shadow-inner p-1 gap-1 select-none transition-colors ${
        isYellow
          ? 'bg-amber-400 border-amber-500 text-slate-950'
          : 'bg-slate-100 border-slate-300 text-slate-900'
      }`}
    >
      {/* Blue I.R. IRAN Strip */}
      <div className="bg-blue-700 text-white rounded px-1 py-1 flex flex-col items-center justify-between text-[8px] h-10 w-7">
        <div className="flex flex-col gap-0.5 w-full">
          <span className="block h-0.5 bg-green-500 w-full rounded-xs"></span>
          <span className="block h-0.5 bg-white w-full rounded-xs"></span>
          <span className="block h-0.5 bg-red-500 w-full rounded-xs"></span>
        </div>
        <span className="font-bold leading-none scale-90">IRAN</span>
      </div>

      {/* Part 1 (2 digits) */}
      <input
        type="text"
        inputMode="numeric"
        placeholder="12"
        value={value.part1}
        onChange={handlePart1}
        disabled={disabled}
        maxLength={2}
        className="w-10 h-10 text-center font-bold text-lg bg-white/70 border border-slate-400/40 rounded focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      {/* Plate Letter */}
      <select
        value={value.letter}
        onChange={handleLetter}
        disabled={disabled}
        className="h-10 px-1 font-bold text-base bg-white/70 border border-slate-400/40 rounded focus:bg-white focus:outline-none cursor-pointer"
      >
        {IRAN_PLATE_LETTERS.map(letter => (
          <option key={letter} value={letter}>
            {letter}
          </option>
        ))}
      </select>

      {/* Part 2 (3 digits) */}
      <input
        type="text"
        inputMode="numeric"
        placeholder="345"
        value={value.part2}
        onChange={handlePart2}
        disabled={disabled}
        maxLength={3}
        className="w-14 h-10 text-center font-bold text-lg bg-white/70 border border-slate-400/40 rounded focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      {/* Iran Province Code */}
      <div className="flex flex-col items-center justify-center border-l border-slate-400/40 pl-1.5 ml-1">
        <span className="text-[9px] font-sans font-semibold leading-none text-slate-700">ایران</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="77"
          value={value.provinceCode}
          onChange={handleProvince}
          disabled={disabled}
          maxLength={2}
          className="w-10 h-7 mt-0.5 text-center font-bold text-sm bg-white/70 border border-slate-400/40 rounded focus:bg-white focus:outline-none"
        />
      </div>
    </div>
  );
};
