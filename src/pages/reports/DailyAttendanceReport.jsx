// src/pages/DailyAttendanceReport.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { CITIES, getBranchesForCity } from '@/components/constants/locations'
import api from '@/lib/axios'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// just color for status text
const STATUS_COLOR_CLASSES = {
  present: 'text-green-700',
  late: 'text-yellow-600',
  absent: 'text-red-600',
  leave: 'text-blue-600',
  official_off: 'text-slate-600',
  short_leave: 'text-orange-600',
  public_holiday: 'text-cyan-700',
  missing: 'text-slate-500'
}

// ---------- OKLCH → rgb shim so html2canvas doesn't die ----------
const OKLCH_REGEX = /oklch\(([^)]+)\)/gi

const clamp01 = (value) => Math.min(1, Math.max(0, value))

const parseAlphaSegment = (segment) => {
  if (!segment) return 1
  const trimmed = segment.trim()
  if (!trimmed) return 1
  if (trimmed.endsWith('%')) {
    const parsed = parseFloat(trimmed.slice(0, -1))
    return clamp01(Number.isNaN(parsed) ? 1 : parsed / 100)
  }
  const numeric = parseFloat(trimmed)
  return clamp01(Number.isNaN(numeric) ? 1 : numeric)
}

const formatAlpha = (alpha) => {
  if (alpha >= 0.999) return null
  const normalized = clamp01(alpha)
  const formatted = normalized.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  return formatted || '0'
}

const oklchToSrgbString = (L, C, h, alpha = 1) => {
  const hr = (h * Math.PI) / 180
  const a = Math.cos(hr) * C
  const b = Math.sin(hr) * C

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bVal = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  const toSrgbChannel = (value) => {
    const clamped = clamp01(value)
    const srgb =
      clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
    return Math.round(clamp01(srgb) * 255)
  }

  const [sr, sg, sb] = [r, g, bVal].map(toSrgbChannel)
  const alphaStr = formatAlpha(alpha)

  return alphaStr
    ? `rgba(${sr}, ${sg}, ${sb}, ${alphaStr})`
    : `rgb(${sr}, ${sg}, ${sb})`
}

const parseOklchBody = (body) => {
  try {
    let alpha = 1
    let colorBody = body
    if (body.includes('/')) {
      const [colorSegment, alphaSegment] = body.split('/')
      colorBody = colorSegment
      alpha = parseAlphaSegment(alphaSegment)
    }
    const parts = colorBody
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => parseFloat(token))
    while (parts.length < 3) parts.push(0)
    const [L, C, h] = parts
    if ([L, C, h].some((component) => Number.isNaN(component))) {
      return 'rgb(0, 0, 0)'
    }
    return oklchToSrgbString(L, C, h, alpha)
  } catch (err) {
    console.warn('Failed to parse oklch color for html2canvas', body, err)
    return 'rgb(0, 0, 0)'
  }
}

const replaceOklchInString = (value) => {
  if (typeof value !== 'string' || value.indexOf('oklch') === -1) {
    return value
  }
  return value.replace(OKLCH_REGEX, (_, body) => parseOklchBody(body))
}

const wrapComputedStyle = (style) => {
  if (!style) return style
  return new Proxy(style, {
    get(target, prop) {
      const original = Reflect.get(target, prop, target)
      if (typeof original === 'function') {
        return (...args) => {
          const result = original.apply(target, args)
          return typeof result === 'string' ? replaceOklchInString(result) : result
        }
      }
      return typeof original === 'string' ? replaceOklchInString(original) : original
    }
  })
}

const withColorSafeComputedStyles = async (callback) => {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return callback()
  }
  const originalGetComputedStyle = window.getComputedStyle
  window.getComputedStyle = (...args) => wrapComputedStyle(originalGetComputedStyle(...args))
  try {
    return await callback()
  } finally {
    window.getComputedStyle = originalGetComputedStyle
  }
}

// ---------- helpers ----------
const getTodayLocalIso = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateHuman(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const DailyAttendanceReport = () => {
  // local date so no UTC off-by-one
  const [date, setDate] = useState(getTodayLocalIso)

  // default city + branch
  const [city, setCity] = useState('Lahore')
  const [branch, setBranch] = useState('Arfa Karim Tower')
  const [branchesList, setBranchesList] = useState(() =>
    getBranchesForCity('Lahore')
  )

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const sheetRef = useRef(null)

  // update branch list when city changes (and keep branch valid)
  useEffect(() => {
    const list = getBranchesForCity(city)
    setBranchesList(list)

    if (!list.includes(branch)) {
      if (city === 'Lahore' && list.includes('Arfa Karim Tower')) {
        setBranch('Arfa Karim Tower')
      } else {
        setBranch(list[0] || '')
      }
    }
  }, [city, branch])

  const fetchAttendance = useCallback(async () => {
    if (!date || !branch) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('branch', branch.trim())

      const url = `/api/attendance/daily/${date}?${params.toString()}`
      const res = await api.get(url)
      setData(res.data)
    } catch (err) {
      setError(err.message || 'Failed to load attendance')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [date, branch])

  // auto load on mount + whenever date/branch changes
  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  const hasSheetData = !!(data?.departments && data.departments.length)

  const captureSheetCanvas = async () => {
    if (!sheetRef.current) return null

    const runCapture = () =>
      html2canvas(sheetRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      })

    return withColorSafeComputedStyles(runCapture)
  }

  // Download as PDF
  const handleDownloadPdf = async () => {
    if (!hasSheetData) return
    const canvas = await captureSheetCanvas()
    if (!canvas) return

    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF('l', 'pt', 'a4') // landscape A4
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    const margin = 20
    const imgWidth = pageWidth - margin * 2
    const imgHeight = (canvas.height / canvas.width) * imgWidth

    let imgY = margin
    if (imgHeight < pageHeight - margin * 2) {
      imgY = (pageHeight - imgHeight) / 2
    }

    pdf.addImage(imgData, 'PNG', margin, imgY, imgWidth, imgHeight)

    const reportDate = data?.date || date
    const reportBranch = data?.branch || branch || 'branch'
    pdf.save(`attendance_${reportDate}_${reportBranch}.pdf`)
  }

  // Share image to WhatsApp
  const handleShareSnapWhatsapp = async () => {
    if (!hasSheetData) return
    const canvas = await captureSheetCanvas()
    if (!canvas) return

    const reportDate = data?.date || date
    const reportBranch = data?.branch || branch || 'branch'
    const title = `Daily Attendance Report - ${formatDateHuman(
      reportDate
    )}${reportBranch ? ` - ${reportBranch}` : ''}`

    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File(
        [blob],
        `attendance_${reportDate}_${reportBranch}.png`,
        { type: 'image/png' }
      )

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title,
            text: title,
            files: [file]
          })
        } catch (err) {
          console.error(err)
        }
      } else {
        const dataUrl = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `attendance_${reportDate}_${reportBranch}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        alert(
          'Your browser cannot share images directly. The snapshot has been downloaded — share it manually in your WhatsApp group.'
        )
      }
    }, 'image/png')
  }

  return (
    <div className='max-w-6xl mx-auto p-6 text-slate-900'>
      {/* Header + filters */}
      <div className='mb-6 flex flex-wrap justify-between gap-4'>
        <div>
          <h1 className='mb-1 text-2xl font-semibold'>Daily Attendance Report</h1>
          <p className='text-sm text-slate-500'>
            {formatDateHuman(data?.date || date)}
            {data?.branch || branch ? (
              <>
                {' '}
                · Branch:{' '}
                <span className='font-semibold text-slate-700'>
                  {data?.branch || branch}
                </span>
              </>
            ) : null}
          </p>
          {data?.totalEmployees != null && (
            <p className='mt-1 text-xs text-slate-400'>
              Total employees: {data.totalEmployees}
            </p>
          )}
        </div>

        <div className='flex flex-wrap items-end gap-3'>
          {/* City */}
          <div className='flex flex-col text-sm'>
            <label htmlFor='city' className='mb-1 font-medium text-slate-700'>
              City
            </label>
            <select
              id='city'
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className='rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
            >
              <option value=''>Select city</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div className='flex flex-col text-sm'>
            <label htmlFor='branch' className='mb-1 font-medium text-slate-700'>
              Branch
            </label>
            <select
              id='branch'
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              disabled={!city}
              className={`min-w-[200px] rounded-md border px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                city
                  ? 'border-slate-300 bg-white'
                  : 'cursor-not-allowed border-slate-200 bg-slate-100'
              }`}
            >
              <option value=''>Select branch</option>
              {branchesList.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className='flex flex-col text-sm'>
            <label htmlFor='date' className='mb-1 font-medium text-slate-700'>
              Date
            </label>
            <input
              id='date'
              type='date'
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className='rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
            />
          </div>

          {/* Actions */}
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={handleDownloadPdf}
              disabled={!hasSheetData}
              className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                hasSheetData
                  ? 'bg-slate-700 hover:bg-slate-800'
                  : 'cursor-not-allowed bg-slate-400'
              }`}
            >
              Download PDF
            </button>

            <button
              type='button'
              onClick={handleShareSnapWhatsapp}
              disabled={!hasSheetData}
              className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                hasSheetData
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'cursor-not-allowed bg-slate-400'
              }`}
            >
              Share Snapshot (WhatsApp)
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className='mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !hasSheetData && !error && (
        <p className='text-sm text-slate-500'>
          Select a city and branch to view the daily attendance sheet.
        </p>
      )}

      {/* ONE SHEET – department-wise */}
      {!loading && hasSheetData && (
        <div
          ref={sheetRef}
          className='rounded-xl border border-slate-200 bg-white shadow-sm'
        >
          <div className='flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5'>
            <span className='text-sm font-semibold text-slate-800'>
              Branch-wise Sheet — {data.branch || branch || 'N/A'}
            </span>
            <span className='text-xs text-slate-500'>
              {formatDateHuman(data.date || date)}
            </span>
          </div>

          <div className='p-4'>
            <div className='overflow-x-auto rounded-lg border border-slate-200'>
              <table className='min-w-full border-collapse text-sm'>
                <thead className='bg-slate-50'>
                  <tr>
                    <th className='whitespace-nowrap px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-600'>
                      Emp Code
                    </th>
                    <th className='whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600'>
                      Name
                    </th>
                    <th className='whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600'>
                      Official Off
                    </th>
                    <th className='whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600'>
                      Duty
                    </th>
                    <th className='whitespace-nowrap px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-600'>
                      In
                    </th>
                    <th className='whitespace-nowrap px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-600'>
                      Out
                    </th>
                    <th className='whitespace-nowrap px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-600'>
                      Status
                    </th>
                    <th className='whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600'>
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.departments.map((dept) => {
                    const employees = dept.employees || []
                    return (
                      <React.Fragment key={dept.name}>
                        <tr className='bg-slate-100/80'>
                          <td
                            colSpan={8}
                            className='px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600'
                          >
                            <div className='flex items-center justify-between'>
                              <span>{dept.name}</span>
                              <span className='text-[11px] font-normal uppercase tracking-normal text-slate-500'>
                                Employees: {employees.length}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {employees.length > 0 ? (
                          employees.map((emp, idx) => {
                            const statusClass =
                              STATUS_COLOR_CLASSES[emp.status] || 'text-slate-700'

                            return (
                              <tr
                                key={`${emp.employeeId}-${idx}`}
                                className='border-t border-slate-100 even:bg-slate-50/60'
                              >
                                <td className='whitespace-nowrap px-3 py-2 text-xs text-center text-slate-800'>
                                  {emp.employeeId}
                                </td>
                                <td className='whitespace-nowrap px-3 py-2 text-xs font-medium text-left text-slate-900'>
                                  {emp.fullName}
                                </td>
                                <td className='whitespace-nowrap px-3 py-2 text-xs text-left text-slate-800'>
                                  {emp.officialOff || '-'}
                                </td>
                                <td className='whitespace-nowrap px-3 py-2 text-xs text-left text-slate-800'>
                                  {emp.dutyRoster || '-'}
                                </td>
                                <td className='whitespace-nowrap px-3 py-2 text-xs text-center text-slate-800'>
                                  {emp.checkIn || '-'}
                                </td>
                                <td className='whitespace-nowrap px-3 py-2 text-xs text-center text-slate-800'>
                                  {emp.checkOut || '-'}
                                </td>

                                <td className='whitespace-nowrap px-3 py-2 text-xs text-center'>
                                  <span className={`font-semibold ${statusClass}`}>
                                    {emp.statusLabel || emp.status}
                                  </span>
                                </td>

                                <td className='px-3 py-2 text-xs text-left text-slate-800'>
                                  {emp.remarks || ''}
                                </td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr className='border-t border-slate-100'>
                            <td
                              colSpan={8}
                              className='px-3 py-3 text-center text-xs text-slate-500'
                            >
                              No employees for this department.
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <p className='mt-2 text-sm text-slate-500'>Loading attendance…</p>
      )}
    </div>
  )
}

export default DailyAttendanceReport
