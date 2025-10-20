import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils' // if you have this helper; otherwise remove cn usage

/**
 * Reusable input field with label, helper, error, and consistent spacing.
 */
export default function InputField({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  disabled,
  autoComplete,
  description,          // small helper text under the input
  error,                 // error message text
  containerClassName,    // wrapper styles (grid cell, etc.)
  labelClassName,
  inputClassName,
  ...props               // any other input props
}) {
  const fieldId = id || name

  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label ? (
        <Label htmlFor={fieldId} className={labelClassName}>
          {label}
          {required ? <span className="ml-0.5 text-red-600">*</span> : null}
        </Label>
      ) : null}

      <Input
        id={fieldId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        className={inputClassName}
        {...props}
      />

      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}

      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  )
}
