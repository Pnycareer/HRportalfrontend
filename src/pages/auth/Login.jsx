// src/pages/Login.jsx
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import InputField from '@/components/form/InputField'
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom'

function routeForRole(role) {
  console.log(role)
  if (role === 'employee') return '/employee'
  if (role === 'admin' || role === 'superadmin' || role === 'hr') return '/admin'
  return '/' // fallback
}

export default function Login() {
  const { user, loading: authLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectFrom = location.state?.from?.pathname

  const [form, setForm] = React.useState({ email: '', password: '' })
  const [submitting, setSubmitting] = React.useState(false)

  function update(e) {
    const { name, value } = e.target
    setForm((s) => ({ ...s, [name]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const loggedInUser = await login(form)

      const u = loggedInUser || (typeof window !== 'undefined' ? null : null) || user
      const target = redirectFrom || routeForRole(u?.role)
      toast.success('Welcome back!')
      navigate(target, { replace: true })
    } catch (err) {
      toast.error(err?.message || 'Invalid credentials / not approved / email not verified')
    } finally {
      setSubmitting(false)
    }
  }

  if (!authLoading && user) {
    return <Navigate to={redirectFrom || routeForRole(user.role)} replace />
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_60%)]" />
      <div className="absolute -bottom-32 -left-24 -z-10 h-[26rem] w-[26rem] rounded-full bg-primary/30 blur-3xl" aria-hidden="true" />
      <div className="absolute -top-40 -right-24 -z-10 h-[22rem] w-[22rem] rounded-full bg-secondary/25 blur-3xl" aria-hidden="true" />
      <div className="relative z-10">
        <div className="container flex min-h-screen items-center justify-center py-16">
          <div className="mx-auto grid w-full max-w-6xl gap-10 rounded-[2.75rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-3xl sm:p-10 lg:grid-cols-[1.1fr_1fr]">
            <div className="hidden flex-col justify-between space-y-10 text-white lg:flex">
              <div className="space-y-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                  HR Platform
                </span>
                <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                  Elevate how your teams work, onboard, and grow together.
                </h1>
                <p className="max-w-xl text-base text-white/70">
                  Log in to unlock analytics, approvals, and automations crafted for high-performing HR and people operations teams.
                </p>
              </div>
              <dl className="grid max-w-xl gap-6 text-sm text-white/70 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <dt className="text-sm font-medium text-white">Secure by design</dt>
                  <dd className="mt-2 leading-relaxed">
                    Enterprise-grade access controls keep sensitive employee information protected end to end.
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <dt className="text-sm font-medium text-white">Insight-led workflows</dt>
                  <dd className="mt-2 leading-relaxed">
                    Automate onboarding, reviews, and payroll insights to focus on the employee experience.
                  </dd>
                </div>
              </dl>
            </div>
            <Card className="border-white/10 bg-white/95 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
              <CardHeader className="space-y-3">
                <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-white">Welcome back</CardTitle>
                <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
                  Use your work credentials to access the HR control center.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-5" onSubmit={onSubmit}>
                  <InputField
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={update}
                    required
                    autoComplete="email"
                  />
                  <InputField
                    label="Password"
                    name="password"
                    type="password"
                    placeholder="********"
                    value={form.password}
                    onChange={update}
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="submit"
                    disabled={submitting || authLoading}
                    className="h-12 w-full rounded-xl text-base font-medium shadow-lg shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0"
                  >
                    {submitting || authLoading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 text-center text-sm text-slate-600 dark:text-slate-300">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Need access?</p>
                <div>
                  Don't have an account yet?{' '}
                  <Link to="/register" className="font-medium text-primary hover:underline">
                    Request onboarding
                  </Link>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
