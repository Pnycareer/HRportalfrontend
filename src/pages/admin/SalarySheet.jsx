import React from 'react'
import SalarySheetForm from '@/components/salarysheet/SalarySheetForm'

export default function SalarySheetPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Salary Sheet</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Auto-snapshots core user fields on the backend. Just provide the <b>userId</b>, period, and amounts.
      </p>
      <SalarySheetForm onCreated={() => { /* you could route or toast here */ }} />
    </div>
  )
}
