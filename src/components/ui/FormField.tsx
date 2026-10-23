import React from 'react';
import { TriangleAlert } from 'lucide-react';

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
  id: string;
  inputClassName?: string;
  rightAdornment?: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  helperText,
  error,
  id,
  className = '',
  inputClassName = '',
  rightAdornment,
  disabled,
  ...props
}) => {
  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-[16px] font-semibold text-text select-none">
        {label}
      </label>

      <div className="relative w-full flex items-center">
        <input
          id={id}
          disabled={disabled}
          className={`w-full min-h-[56px] h-14 px-4 text-[16px] text-text bg-white border rounded-[16px] transition-all duration-200 placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed ${
            error ? 'border-red ring-1 ring-red' : 'border-border'
          } ${rightAdornment ? 'pr-12' : ''} ${inputClassName}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          {...props}
        />
        {rightAdornment && (
          <div className="absolute right-4 flex items-center pointer-events-none text-text-muted">
            {rightAdornment}
          </div>
        )}
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-2 text-[16px] font-medium text-red mt-1"
        >
          <TriangleAlert size={20} strokeWidth={2} className="flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-[16px] text-text-muted mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
