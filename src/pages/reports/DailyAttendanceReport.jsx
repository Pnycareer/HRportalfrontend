// src/pages/DailyAttendanceReport.jsx
import React, { useEffect, useState, useCallback } from 'react'
import { CITIES, getBranchesForCity } from '@/components/constants/locations'
import api from '@/lib/axios'
import jsPDF from 'jspdf'

// UI status text colors
const STATUS_COLOR_CLASSES = {
  present: 'text-green-700',
  late: 'text-orange-500',
  absent: 'text-red-600',
  leave: 'text-blue-600',
  official_off: 'text-slate-600',
  short_leave: 'text-orange-600',
  public_holiday: 'text-cyan-700',
  missing: 'text-slate-500'
}

// PDF status colors (R,G,B)
const STATUS_PDF_COLORS = {
  present: [22, 163, 74], // green
  late: [245, 158, 11], // amber
  absent: [239, 68, 68], // red
  leave: [37, 99, 235], // blue
  official_off: [100, 116, 139], // slate
  short_leave: [249, 115, 22], // orange
  public_holiday: [8, 145, 178], // teal
  missing: [148, 163, 184] // muted slate
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
  const [date, setDate] = useState(getTodayLocalIso)

  // default Lahore / Arfa tower
  const [city, setCity] = useState('Lahore')
  const [branch, setBranch] = useState('Arfa Karim Tower')
  const [branchesList, setBranchesList] = useState(() =>
    getBranchesForCity('Lahore')
  )

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  const hasSheetData = !!(data?.departments && data.departments.length)

  // --------- PDF generation (modern A4, colored status) ----------
  const handleDownloadPdf = () => {
    if (!hasSheetData) return

    const doc = new jsPDF('l', 'pt', 'a4') // landscape A4

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginX = 40
    const marginTop = 40
    const marginBottom = 40
    const usableWidth = pageWidth - marginX * 2

    const defaultTextColor = [31, 41, 55] // slate-800
    const mutedTextColor = [100, 116, 139] // slate-500/600
    const headerBg = [248, 250, 252] // slate-50
    const zebraBg = [248, 250, 252] // same as header but lighter feel

    const setDefaultText = () => doc.setTextColor(...defaultTextColor)

    // Column setup
    const columns = [
      { key: 'employeeId', label: 'EMP CODE', align: 'center', weight: 0.09 },
      { key: 'fullName', label: 'NAME', align: 'left', weight: 0.22 },
      { key: 'officialOff', label: 'OFFICIAL OFF', align: 'left', weight: 0.17 },
      { key: 'dutyRoster', label: 'DUTY', align: 'left', weight: 0.18 },
      { key: 'checkIn', label: 'IN', align: 'center', weight: 0.07 },
      { key: 'checkOut', label: 'OUT', align: 'center', weight: 0.07 },
      { key: 'status', label: 'STATUS', align: 'center', weight: 0.09 },
      { key: 'remarks', label: 'REMARKS', align: 'left', weight: 0.11 }
    ]
    columns.forEach((c) => {
      c.width = usableWidth * c.weight
    })

    const headerFontSize = 10
    const bodyFontSize = 9
    const departmentFontSize = 10
    const lineHeight = 18

    let y = marginTop

    // --- Page chrome: white bg, subtle top bar ---
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')

    doc.setFillColor(248, 250, 252) // light top strip
    doc.rect(0, 0, pageWidth, 32, 'F')

    // --- Top title area ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42) // slate-900
    const title = `Daily Attendance — ${data?.branch || branch || 'N/A'}`
    doc.text(title, marginX, y)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...mutedTextColor)
    const dateStr = formatDateHuman(data?.date || date)
    const totalStr =
      data?.totalEmployees != null ? `Employees: ${data.totalEmployees}` : ''
    const rightTop = totalStr ? `${dateStr}   •   ${totalStr}` : dateStr
    doc.text(rightTop, pageWidth - marginX, y, { align: 'right' })

    y += 26

    const drawTableHeader = () => {
      const headerHeight = lineHeight + 4
      doc.setFillColor(...headerBg)
      doc.setDrawColor(226, 232, 240) // border color
      doc.rect(marginX, y - headerHeight + 6, usableWidth, headerHeight, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(headerFontSize)
      doc.setTextColor(71, 85, 105) // slate-600

      let x = marginX
      columns.forEach((col) => {
        const textX =
          col.align === 'center'
            ? x + col.width / 2
            : col.align === 'right'
            ? x + col.width - 4
            : x + 4
        doc.text(col.label, textX, y, {
          align: col.align === 'left' ? 'left' : col.align
        })
        x += col.width
      })

      y += lineHeight
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(bodyFontSize)
      setDefaultText()
    }

    const drawPageHeader = () => {
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, pageWidth, pageHeight, 'F')
      doc.setFillColor(248, 250, 252)
      doc.rect(0, 0, pageWidth, 32, 'F')

      let yTop = marginTop
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(15, 23, 42)
      doc.text(title, marginX, yTop)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...mutedTextColor)
      doc.text(dateStr, pageWidth - marginX, yTop, { align: 'right' })

      yTop += 26
      y = yTop
      drawTableHeader()
    }

    const maybeAddPage = () => {
      if (y > pageHeight - marginBottom) {
        doc.addPage()
        drawPageHeader()
      }
    }

    drawTableHeader()

    // --- Departments + rows ---
    data.departments.forEach((dept, deptIndex) => {
      const employees = dept.employees || []

      // Department header row
      maybeAddPage()
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(departmentFontSize)
      doc.setTextColor(30, 64, 175) // indigo-700
     const deptText = `${dept.name}`
      doc.text(deptText, marginX, y)
      y += lineHeight - 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(bodyFontSize)
      setDefaultText()

      if (!employees.length) {
        maybeAddPage()
        doc.setTextColor(...mutedTextColor)
        doc.text('No employees for this department.', marginX + 10, y)
        setDefaultText()
        y += lineHeight
        return
      }

      employees.forEach((emp, idx) => {
        maybeAddPage()

        const isZebra = (idx + deptIndex) % 2 === 1
        if (isZebra) {
          doc.setFillColor(...zebraBg)
          doc.rect(marginX, y - lineHeight + 6, usableWidth, lineHeight, 'F')
        }

        let x = marginX
        columns.forEach((col) => {
          let val = ''

          switch (col.key) {
            case 'employeeId':
              val = emp.employeeId != null ? String(emp.employeeId) : ''
              break
            case 'fullName':
              val = emp.fullName || ''
              break
            case 'officialOff':
              val = emp.officialOff || '-'
              break
            case 'dutyRoster':
              val = emp.dutyRoster || '-'
              break
            case 'checkIn':
              val = emp.checkIn || '-'
              break
            case 'checkOut':
              val = emp.checkOut || '-'
              break
            case 'status':
              val = emp.statusLabel || emp.status || ''
              break
            case 'remarks':
              val = emp.remarks || ''
              break
            default:
              val = ''
          }

          const textX =
            col.align === 'center'
              ? x + col.width / 2
              : col.align === 'right'
              ? x + col.width - 4
              : x + 4

          // status gets color
          if (col.key === 'status') {
            const color =
              STATUS_PDF_COLORS[emp.status] || STATUS_PDF_COLORS.missing
            doc.setTextColor(...color)
            doc.setFont('helvetica', 'bold')
          } else if (col.key === 'fullName') {
            setDefaultText()
            doc.setFont('helvetica', 'bold')
          } else {
            setDefaultText()
            doc.setFont('helvetica', 'normal')
          }

          doc.text(String(val), textX, y, {
            align: col.align === 'left' ? 'left' : col.align
          })

          x += col.width
        })

        setDefaultText()
        y += lineHeight
      })

      y += 4
    })

    // footer with page number
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(...mutedTextColor)
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 16,
        { align: 'center' }
      )
    }

    const reportDate = data?.date || date
    const reportBranch = data?.branch || branch || 'branch'
    doc.save(`attendance_${reportDate}_${reportBranch}.pdf`)
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

      {/* On-screen table (for viewing only) */}
      {!loading && hasSheetData && (
        <div className='rounded-xl border border-slate-200 bg-white shadow-sm'>
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
