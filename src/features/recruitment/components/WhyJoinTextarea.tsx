"use client";

interface WhyJoinTextareaProps {
  value: string;
  error?: string;
  touched?: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
}

export default function WhyJoinTextarea({
  value,
  error,
  touched,
  onChange,
  onBlur,
}: WhyJoinTextareaProps) {
  const hasError = Boolean(touched && error);
  const isValid = Boolean(touched && !error && value.trim().length >= 20);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="why-join-textarea"
          className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-jlug-white"
        >
          <span className="text-jlug-accent">[07]</span>
          <span>WHY DO YOU WANT TO JOIN JLUG?</span>
          <span className="text-jlug-accent">*</span>
        </label>
        <div className="flex items-center gap-3 font-mono text-[0.65rem] text-jlug-gray-2">
          <span>{value.length} CHARS</span>
          {isValid && <span className="text-jlug-accent">[VALID ✓]</span>}
        </div>
      </div>

      <p className="font-mono text-[0.65rem] text-jlug-gray-2">
        Share your motivation, curiosity for Linux/open-source, past experiments, or what you hope
        to build together with the club.
      </p>

      <div
        className={`relative border transition-all ${
          hasError
            ? "border-red-500/80 bg-red-950/10 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/40"
            : isValid
            ? "border-jlug-accent/40 bg-jlug-surface focus-within:border-jlug-accent focus-within:ring-1 focus-within:ring-jlug-accent/30"
            : "border-jlug-line bg-jlug-surface focus-within:border-jlug-accent focus-within:ring-1 focus-within:ring-jlug-accent/30"
        }`}
      >
        {/* Terminal buffer bar */}
        <div className="flex items-center justify-between border-b border-jlug-line/60 bg-jlug-black/50 px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-jlug-gray-2">
          <span>STATEMENT_BUFFER // MANIFESTO</span>
          <span>UTF-8 // UTF8_RAW</span>
        </div>

        <textarea
          id="why-join-textarea"
          rows={5}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="I want to join JLUG because..."
          className="w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-jlug-white placeholder:text-jlug-gray-3 focus:outline-none"
        />
      </div>

      {hasError && (
        <span className="font-mono text-[0.7rem] text-red-400">
          ! ERROR: {error}
        </span>
      )}
    </div>
  );
}
