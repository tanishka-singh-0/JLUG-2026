"use client";

import { useRecruitmentForm } from "../hooks/useRecruitmentForm";
import RecruitmentHeader from "./RecruitmentHeader";
import FormTextInput from "./FormTextInput";
import BranchSelector from "./BranchSelector";
import YearDropdown from "./YearDropdown";
import DomainMultiSelect from "./DomainMultiSelect";
import WhyJoinTextarea from "./WhyJoinTextarea";

/**
 * UI-only recruitment form prototype.
 * No data is sent, stored, or persisted anywhere.
 * The submit button triggers client-side field validation only.
 */
export default function RecruitmentForm() {
  const {
    formData,
    touched,
    errors,
    completedCount,
    handleTextChange,
    handleBranchSelect,
    handleYearSelect,
    handleDomainToggle,
    handleBlur,
    submitApplication,
    resetForm,
  } = useRecruitmentForm();

  return (
    <div className="w-full">
      {/* Progress header */}
      <RecruitmentHeader completedCount={completedCount} totalCount={7} />

      {/* Form body */}
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-12 md:py-14">
        <form onSubmit={submitApplication} noValidate className="flex flex-col gap-10">

          {/* 01 — Full Name */}
          <section className="border border-jlug-line bg-jlug-ink/60 p-6 md:p-8">
            <FormTextInput
              id="candidate-name"
              stepIndex="[01]"
              label="CANDIDATE FULL NAME"
              value={formData.fullName}
              placeholder="e.g. Linus Torvalds"
              error={errors.fullName}
              touched={touched.fullName}
              onChange={handleTextChange("fullName")}
              onBlur={() => handleBlur("fullName")}
              hint="Your legal or college registration name."
            />
          </section>

          {/* 02 — Branch */}
          <section className="border border-jlug-line bg-jlug-ink/60 p-6 md:p-8">
            <BranchSelector
              selectedBranch={formData.branch}
              error={errors.branch}
              touched={touched.branch}
              onSelect={handleBranchSelect}
            />
          </section>

          {/* 03 — Year */}
          <section className="border border-jlug-line bg-jlug-ink/60 p-6 md:p-8">
            <YearDropdown
              selectedYear={formData.year}
              error={errors.year}
              touched={touched.year}
              onSelect={handleYearSelect}
              onBlur={() => handleBlur("year")}
            />
          </section>

          {/* 04 + 05 — Phone & Email */}
          <section className="border border-jlug-line bg-jlug-ink/60 p-6 md:p-8">
            <div className="mb-5 border-b border-jlug-line pb-3 font-mono text-xs uppercase tracking-widest text-jlug-gray-2">
              CONTACT CREDENTIALS
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormTextInput
                id="candidate-phone"
                stepIndex="[04]"
                label="PHONE NUMBER"
                type="tel"
                prefix="+91"
                value={formData.phone}
                placeholder="9876543210"
                error={errors.phone}
                touched={touched.phone}
                onChange={handleTextChange("phone")}
                onBlur={() => handleBlur("phone")}
                hint="10-digit number used for induction updates."
              />
              <FormTextInput
                id="candidate-email"
                stepIndex="[05]"
                label="EMAIL ADDRESS"
                type="email"
                value={formData.email}
                placeholder="you@jecjabalpur.ac.in"
                error={errors.email}
                touched={touched.email}
                onChange={handleTextChange("email")}
                onBlur={() => handleBlur("email")}
                hint="College or personal email address."
              />
            </div>
          </section>

          {/* 06 — Domains (multi-select) */}
          <section className="border border-jlug-line bg-jlug-ink/60 p-6 md:p-8">
            <DomainMultiSelect
              selectedDomains={formData.domains}
              error={errors.domains}
              touched={touched.domains}
              onToggleDomain={handleDomainToggle}
            />
          </section>

          {/* 07 — Why Join */}
          <section className="border border-jlug-line bg-jlug-ink/60 p-6 md:p-8">
            <WhyJoinTextarea
              value={formData.whyJoin}
              error={errors.whyJoin}
              touched={touched.whyJoin}
              onChange={handleTextChange("whyJoin")}
              onBlur={() => handleBlur("whyJoin")}
            />
          </section>

          {/* Action bar */}
          <div className="flex flex-col gap-4 border border-jlug-line bg-jlug-ink p-6 md:flex-row md:items-center md:justify-between">
            <p className="font-mono text-[0.7rem] uppercase tracking-wider text-jlug-gray-2">
              <span className="text-jlug-accent">UI PROTOTYPE</span>{" "}
              — No data is stored or transmitted.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {/* Reset */}
              <button
                id="recruitment-reset-btn"
                type="button"
                onClick={resetForm}
                className="border border-jlug-line bg-jlug-surface px-5 py-3 font-mono text-xs uppercase tracking-widest text-jlug-gray-1 transition-colors hover:border-jlug-white hover:text-jlug-white cursor-pointer"
              >
                RESET FORM
              </button>

              {/* Submit — client-side validation only, no backend */}
              <button
                id="recruitment-submit-btn"
                type="submit"
                className="flex items-center gap-3 border border-jlug-accent bg-jlug-accent px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-widest text-jlug-black transition-all hover:bg-jlug-white hover:border-jlug-white cursor-pointer shadow-[0_0_20px_rgba(183,243,74,0.2)]"
              >
                <span>SUBMIT APPLICATION</span>
                <span>{"-->"}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
