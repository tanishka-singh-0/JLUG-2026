"use client";

interface FormTextInputProps {
  id: string;
  stepIndex: string;
  label: string;
  value: string;
  placeholder: string;
  type?: "text" | "tel" | "email";
  prefix?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  hint?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

export default function FormTextInput({
  id,
  stepIndex,
  label,
  value,
  placeholder,
  type = "text",
  prefix,
  error,
  touched,
  required = true,
  hint,
  onChange,
  onBlur,
}: FormTextInputProps) {
  const hasError = Boolean(touched && error);
  const isFilledAndValid = Boolean(touched && !error && value.trim().length > 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-jlug-white"
        >
          <span className="text-jlug-accent">{stepIndex}</span>
          <span>{label}</span>
          {required && <span className="text-jlug-accent">*</span>}
        </label>
        {isFilledAndValid && (
          <span className="font-mono text-[0.65rem] uppercase tracking-wider text-jlug-accent">
            [VALID ✓]
          </span>
        )}
      </div>

      <div
        className={`relative flex items-center border transition-all ${
          hasError
            ? "border-red-500/80 bg-red-950/10 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/40"
            : isFilledAndValid
            ? "border-jlug-accent/40 bg-jlug-surface focus-within:border-jlug-accent focus-within:ring-1 focus-within:ring-jlug-accent/30"
            : "border-jlug-line bg-jlug-surface focus-within:border-jlug-accent focus-within:ring-1 focus-within:ring-jlug-accent/30"
        }`}
      >
        {prefix && (
          <span className="flex select-none items-center border-r border-jlug-line px-3.5 py-3 font-mono text-xs font-bold text-jlug-gray-2">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full bg-transparent px-4 py-3 font-mono text-sm text-jlug-white placeholder:text-jlug-gray-3 focus:outline-none"
          autoComplete="off"
        />
      </div>

      {hint && !hasError && (
        <span className="font-mono text-[0.65rem] text-jlug-gray-2">{hint}</span>
      )}

      {hasError && (
        <span className="font-mono text-[0.7rem] text-red-400">
          ! ERROR: {error}
        </span>
      )}
    </div>
  );
}
