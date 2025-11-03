import { useState, useCallback } from 'react'
import api from '@/lib/axios'

export default function useSalarySheet() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const createSalarySheet = useCallback(async (payload) => {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await api.post('/api/salary-sheets', payload)
      setData(res.data)
      return res.data
    } catch (err) {
      setError(err?.message || 'Failed to create salary sheet')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { createSalarySheet, loading, error, data, setError, setData }
}
