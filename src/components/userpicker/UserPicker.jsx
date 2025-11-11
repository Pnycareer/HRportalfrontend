// UserPicker.jsx
import React, { useMemo, useEffect, useState } from 'react'
import useEmployees from '@/hooks/useEmployees'
import InputField from '@/components/form/InputField'
import SelectField from '@/components/form/SelectField'
import { SelectItem } from '@/components/ui/select'
import UserDetailsCard from '@/components/userpicker/UserDetailsCard'
import api from '@/lib/axios'
import { CITIES , getBranchesForCity } from '../constants/locations'
import { DEPARTMENTS } from '../constants/departments'


function dedupeStrings(arr) {
  return Array.from(new Set((arr || []).filter(Boolean).map(String)))
}

export default function UserPicker({ value, onChange, onUserChange }) {
  // If the hook returns null/undefined briefly, default to {}
  const employeesState = useEmployees() || {}

  // Defensive defaults so .map/.find never explode
  const {
    filtered = [],
    loading = false,
    q = '',
    setQ = () => {},
    branch = '',
    setBranch = () => {},
    branches = [],
    dept = '',
    setDept = () => {},
    departments = [],
    reload = () => {},
  } = employeesState

  // 🔽 NEW: local city state (not coming from the hook)
  const [city, setCity] = useState('')

  // Merge custom departments with API departments
  const deptOptions = useMemo(
    () => dedupeStrings([...(DEPARTMENTS || []), ...(departments || [])]),
    [departments]
  )

  // Merge branches provided by city with API branches
  const branchOptions = useMemo(() => {
    const cityBranches = city ? getBranchesForCity(city) : []
    return dedupeStrings([...(cityBranches || []), ...(branches || [])])
  }, [city, branches])

  // When city changes, make sure the selected branch is valid
  useEffect(() => {
    if (branch && !branchOptions.includes(String(branch))) {
      // clear branch if it's not in the list for this city
      setBranch('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, branchOptions])

  const selected = useMemo(
    () => (Array.isArray(filtered) ? filtered.find(u => u?._id === value) : undefined),
    [filtered, value]
  )

  async function handleSelect(val) {
    onChange?.(val)

    const list = Array.isArray(filtered) ? filtered : []
    let u = list.find(x => x?._id === val)

    try {
      const { data } = await api.get(`/api/users/${val}`)
      if (data && data._id) u = data
    } catch {
      // ignore – fallback to list item
    }

    onUserChange?.(u || null)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* 🔽 NEW: City */}
        <SelectField
          label="City"
          name="city"
          value={city}
          onValueChange={setCity}
        >
          {CITIES.map(c => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectField>

        {/* Branch depends on city + API, deduped */}
        <SelectField
          label="Branch"
          name="branch"
          value={branch}
          onValueChange={setBranch}
          placeholder={city ? `Select a branch in ${city}` : 'Select a branch'}
        >
          {branchOptions.map(b => (
            <SelectItem key={b} value={b}>{b}</SelectItem>
          ))}
        </SelectField>

        {/* Department uses merged custom + API */}
        <SelectField
          label="Department"
          name="department"
          value={dept}
          onValueChange={setDept}
        >
          {deptOptions.map(d => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectField>

        <InputField
          label="Search"
          name="q"
          placeholder="name / employeeId / email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" onClick={reload} className="mt-7 h-11 rounded-md border px-4 text-sm">
          Refresh
        </button>
      </div>

      <SelectField
        label="User"
        name="userId"
        value={value ?? ''}
        onValueChange={handleSelect}
        placeholder={loading ? 'Loading users…' : 'Select a user'}
        required
      >
        {(filtered || []).map((u) => (
          <SelectItem key={u._id} value={u._id}>
            {u.fullName} — {u.employeeId} ({u.email})
          </SelectItem>
        ))}
      </SelectField>

      {/* Full user details */}
      {/* <UserDetailsCard user={selected} /> */}
    </div>
  )
}
