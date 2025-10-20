import React from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Select, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select'

export default function SelectField({
  label,
  name,
  value,
  onValueChange,
  placeholder = 'Select an option',
  children,
  required,
  containerClassName,
  labelClassName,
  triggerClassName,
}) {
  return (
    // ↓ default to tighter spacing than before
    <div className={cn('space-y-1', containerClassName)}>
      {label && (
        <Label htmlFor={name} className={labelClassName}>
          {label}{required ? <span className="ml-0.5 text-red-600">*</span> : null}
        </Label>
      )}

      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={name} className={cn('h-11 w-full', triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}
