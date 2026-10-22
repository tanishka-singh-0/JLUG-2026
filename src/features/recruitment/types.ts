export interface RecruitmentFormData {
  fullName: string;
  branch: string;
  year: string;
  phone: string;
  email: string;
  domains: string[];
  whyJoin: string;
}

export type FormFieldKey = keyof RecruitmentFormData;

export interface FormErrors {
  fullName?: string;
  branch?: string;
  year?: string;
  phone?: string;
  email?: string;
  domains?: string;
  whyJoin?: string;
}

export interface BranchOption {
  code: string;
  name: string;
}

export interface YearOption {
  value: string;
  label: string;
  batch: string;
}

export interface DomainOption {
  id: string;
  title: string;
  description: string;
  iconTag: string;
}
