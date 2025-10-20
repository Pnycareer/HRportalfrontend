// src/components/auth/OtpModal.jsx
import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/lib/axios'
import { toast } from 'sonner'

export default function OtpModal({ open, onOpenChange, email }) {
  const [code, setCode] = React.useState('')
  const [verifying, setVerifying] = React.useState(false)
  const [resending, setResending] = React.useState(false)

  React.useEffect(() => {
    if (!open) setCode('')
  }, [open])

  async function handleVerify(e) {
    e?.preventDefault?.()
    if (!code?.trim()) return toast.error('Enter the code sent to your email')
    setVerifying(true)
    try {
      await api.post('/api/auth/verify-otp', { email, code })
      toast.success('Email verified! You can log in after approval.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err.message || 'Invalid/expired code')
    } finally {
      setVerifying(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await api.post('/api/auth/resend-otp', { email })
      toast.success('New code sent. Check your inbox (and spam).')
    } catch (err) {
      toast.error(err.message || 'Failed to resend code')
    } finally {
      setResending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify your email</DialogTitle>
          <DialogDescription>
            We sent a 6-digit code to <b>{email}</b>. Enter it below. It expires in 10 minutes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-center tracking-widest"
            autoFocus
          />

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={verifying} className="w-full md:w-auto">
              {verifying ? 'Verifying…' : 'Verify'}
            </Button>
            <Button type="button" variant="secondary" disabled={resending} onClick={handleResend}>
              {resending ? 'Resending…' : 'Resend code'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
