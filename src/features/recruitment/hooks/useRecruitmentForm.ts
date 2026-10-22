import { useState, useCallback, useMemo } from "react";
import { FormErrors, FormFieldKey, RecruitmentFormData } from "../types";
import { INITIAL_FORM_DATA } from "../data/recruitmentOptions";

export function useRecruitmentForm() {
  const [formData, setFormData] = useState<RecruitmentFormData>(INITIAL_FORM_DATA);
  const [touched, setTouched] = useState<Record<FormFieldKey, boolean>>({
    fullName: false,
    branch: false,
    year: false,
    phone: false,
    email: false,
    domains: false,
    whyJoin: false,
  });

  /** Validate a single field value and return an error message, or undefined. */
  const validateField = useCallback(
    (key: FormFieldKey, value: unknown): string | undefined => {
      switch (key) {
        case "fullName": {
          const v = (value as string).trim();
          if (!v) return "Name is required.";
          if (v.length < 3) return "Name must be at least 3 characters.";
          return undefined;
        }
        case "branch": {
          if (!(value as string)) return "Please select your branch.";
          return undefined;
        }
        case "year": {
          if (!(value as string)) return "Please select your academic year.";
          return undefined;
        }
        case "phone": {
          const v = (value as string).replace(/[\s-]/g, "");
          if (!v) return "Phone number is required.";
          if (!/^[6-9]\d{9}$/.test(v)) return "Enter a valid 10-digit Indian phone number.";
          return undefined;
        }
        case "email": {
          const v = (value as string).trim();
          if (!v) return "Email is required.";
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
          return undefined;
        }
        case "domains": {
          const arr = value as string[];
          if (!arr || arr.length === 0) return "Select at least one domain.";
          return undefined;
        }
        case "whyJoin": {
          const v = (value as string).trim();
          if (!v) return "Please tell us your motivation.";
          if (v.length < 20) return `At least 20 characters needed (${v.length} so far).`;
          return undefined;
        }
        default:
          return undefined;
      }
    },
    []
  );

  /** Derived validation errors for every field. */
  const errors = useMemo<FormErrors>(() => {
    const errs: FormErrors = {};
    (Object.keys(formData) as FormFieldKey[]).forEach((key) => {
      const msg = validateField(key, formData[key]);
      if (msg) errs[key] = msg;
    });
    return errs;
  }, [formData, validateField]);

  const isValid = Object.keys(errors).length === 0;

  /** Count how many fields are individually passing validation. */
  const completedCount = useMemo(() => {
    let n = 0;
    if (!validateField("fullName", formData.fullName)) n++;
    if (!validateField("branch", formData.branch)) n++;
    if (!validateField("year", formData.year)) n++;
    if (!validateField("phone", formData.phone)) n++;
    if (!validateField("email", formData.email)) n++;
    if (!validateField("domains", formData.domains)) n++;
    if (!validateField("whyJoin", formData.whyJoin)) n++;
    return n;
  }, [formData, validateField]);

  // ─── Field handlers ───────────────────────────────────────────────────────

  const handleTextChange = useCallback(
    (field: "fullName" | "phone" | "email" | "whyJoin") =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.value;
        setFormData((prev) => ({ ...prev, [field]: val }));
      },
    []
  );

  const handleBranchSelect = useCallback((branchCode: string) => {
    setFormData((prev) => ({ ...prev, branch: branchCode }));
    setTouched((prev) => ({ ...prev, branch: true }));
  }, []);

  const handleYearSelect = useCallback((yearVal: string) => {
    setFormData((prev) => ({ ...prev, year: yearVal }));
    setTouched((prev) => ({ ...prev, year: true }));
  }, []);

  const handleDomainToggle = useCallback((domainId: string) => {
    setFormData((prev) => {
      const exists = prev.domains.includes(domainId);
      const next = exists
        ? prev.domains.filter((d) => d !== domainId)
        : [...prev.domains, domainId];
      return { ...prev, domains: next };
    });
    setTouched((prev) => ({ ...prev, domains: true }));
  }, []);

  const handleBlur = useCallback((field: FormFieldKey) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  /**
   * Submit handler — UI-only demo. No data leaves the browser.
   * Marks all fields as touched so errors surface, then returns early
   * if validation fails. No network request or storage is made.
   */
  const submitApplication = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Surface errors for all fields
      setTouched({
        fullName: true,
        branch: true,
        year: true,
        phone: true,
        email: true,
        domains: true,
        whyJoin: true,
      });

      // If invalid, do nothing further — errors are shown inline
      if (!isValid) return;

      // Valid — intentionally do nothing (UI-only prototype, no backend)
    },
    [isValid]
  );

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setTouched({
      fullName: false,
      branch: false,
      year: false,
      phone: false,
      email: false,
      domains: false,
      whyJoin: false,
    });
  }, []);

  return {
    formData,
    touched,
    errors,
    isValid,
    completedCount,
    handleTextChange,
    handleBranchSelect,
    handleYearSelect,
    handleDomainToggle,
    handleBlur,
    submitApplication,
    resetForm,
  };
}
