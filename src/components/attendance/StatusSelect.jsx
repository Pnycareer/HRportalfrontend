// src/components/attendance/StatusSelect.jsx
import React from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const STATUSES = ['present', 'absent', 'leave', 'late']

export default function StatusSelect({ value, onChange, className }) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className={className || 'w-[160px] h-10'}>
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map(s => (
          <SelectItem key={s} value={s} className="capitalize">
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
