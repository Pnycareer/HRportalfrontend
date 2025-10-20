import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import useRegister from "@/hooks/useRegister";
import InputField from "@/components/form/InputField";
import SelectField from "@/components/form/SelectField";
import { SelectItem } from "@/components/ui/select";
import OtpModal from "@/components/auth/OtpModal";
import AvatarUploader from "@/components/form/AvatarUploader";
import { CITIES, getBranchesForCity } from "@/components/constants/locations";
import { DEPARTMENTS } from "@/components/constants/departments";

export default function Register() {
  const [otpOpen, setOtpOpen] = React.useState(false);
  const [otpEmail, setOtpEmail] = React.useState("");

  const { form, update, submit, loading, setForm } = useRegister({
    onSuccess: () => {
      setOtpEmail(form.email);
      setOtpOpen(true);
      toast.success("Registered! Check your email for the code.");
    },
    onError: (message) => toast.error(message || "Something went wrong"),
  });

  const branches = React.useMemo(() => getBranchesForCity(form.city), [form.city]);

  function handleCityChange(val) {
    setForm((s) => {
      const next = { ...s, city: val };
      const allowed = getBranchesForCity(val);
      if (!allowed.includes(s.branch)) next.branch = "";
      return next;
    });
  }

  return (
    <>
      <OtpModal open={otpOpen} onOpenChange={setOtpOpen} email={otpEmail} />

      <div className="relative min-h-screen w-full overflow-hidden bg-slate-950">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(94,234,212,0.18),_transparent_60%)]" />
        <div className="absolute -bottom-36 -left-24 -z-10 h-[28rem] w-[28rem] rounded-full bg-primary/35 blur-3xl" aria-hidden="true" />
        <div className="absolute -top-40 -right-28 -z-10 h-[24rem] w-[24rem] rounded-full bg-secondary/25 blur-3xl" aria-hidden="true" />
        <div className="relative z-10">
          <div className="container flex min-h-screen items-center justify-center py-16">
            <div className="mx-auto grid w-full max-w-6xl gap-12 rounded-[2.75rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-3xl sm:p-10 lg:grid-cols-[1.05fr_1.2fr]">
              <div className="hidden min-h-full flex-col justify-between space-y-10 text-white lg:flex">
                <div className="space-y-6">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                    People Operations
                  </span>
                  <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                    Build a complete employee profile in minutes.
                  </h1>
                  <p className="max-w-xl text-base text-white/70">
                    Create a rich record for approvals, payroll, performance, and engagement with our secure HR workspace.
                  </p>
                </div>
                <div className="space-y-5">
                  <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                      01
                    </span>
                    <div className="space-y-1 text-sm text-white/80">
                      <p className="font-semibold text-white">Personalize your identity</p>
                      <p>Upload a cropped avatar and make your first impression count across every team workflow.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                      02
                    </span>
                    <div className="space-y-1 text-sm text-white/80">
                      <p className="font-semibold text-white">Connect to your branch</p>
                      <p>Select your city and branch so workflows, shifts, and approvals stay perfectly aligned.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                      03
                    </span>
                    <div className="space-y-1 text-sm text-white/80">
                      <p className="font-semibold text-white">Finish with security</p>
                      <p>Set a strong password and confirm with OTP to activate your workspace credentials.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-sm text-white/80">
                  Need help? Contact the people team at <span className="font-semibold text-white">hr-support@company.com</span>.
                </div>
              </div>
              <Card className="border-white/10 bg-white/95 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85">
                <CardHeader className="space-y-3">
                  <CardTitle className="text-3xl font-semibold text-slate-900 dark:text-white">Create your account</CardTitle>
                  <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
                    Employees only. Use your work email and wait for superadmin approval once your profile is verified.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <form className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5" onSubmit={submit}>
                    <InputField
                      label="Full Name"
                      name="fullName"
                      placeholder="Awais Ali"
                      value={form.fullName}
                      onChange={update}
                      required
                      containerClassName="md:col-span-2 space-y-1"
                    />

                    <InputField
                      label="Employee ID"
                      name="employeeId"
                      type="number"
                      placeholder="EMP-1024"
                      value={form.employeeId}
                      onChange={update}
                      required
                      containerClassName="space-y-1"
                    />
                    <InputField
                      label="CNIC"
                      type="number"
                      name="cnic"
                      placeholder="35202-xxxxxxx-x"
                      value={form.cnic}
                      onChange={update}
                      required
                      containerClassName="space-y-1"
                    />

                    <InputField
                      label="Email"
                      name="email"
                      type="email"
                      placeholder="you@company.com"
                      value={form.email}
                      onChange={update}
                      required
                      containerClassName="md:col-span-2 space-y-1"
                      autoComplete="email"
                    />

                    <SelectField
                      label="Department"
                      name="department"
                      value={form.department}
                      onValueChange={(val) => setForm((s) => ({ ...s, department: val }))}
                      placeholder="Select department"
                      containerClassName="space-y-1"
                    >
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={`std-${d}`} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectField>

                    <SelectField
                      label="City"
                      name="city"
                      value={form.city}
                      onValueChange={handleCityChange}
                      placeholder="Select city"
                      containerClassName="space-y-1"
                    >
                      {CITIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectField>

                    <SelectField
                      label="Branch"
                      name="branch"
                      value={form.branch}
                      onValueChange={(val) => setForm((s) => ({ ...s, branch: val }))}
                      placeholder={
                        form.city
                          ? branches.length
                            ? "Select branch"
                            : "No branches available"
                          : "Select city first"
                      }
                      containerClassName="space-y-1"
                      disabled={!form.city || branches.length === 0}
                    >
                      {branches.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectField>

                    <InputField
                      label="Joining Date"
                      name="joiningDate"
                      type="date"
                      value={form.joiningDate}
                      onChange={update}
                      required
                      containerClassName="space-y-1"
                    />

                    <InputField
                      label="Password"
                      name="password"
                      type="password"
                      placeholder="********"
                      value={form.password}
                      onChange={update}
                      required
                      containerClassName="md:col-span-2 space-y-1"
                      autoComplete="new-password"
                    />

                    <AvatarUploader
                      label="Profile Picture"
                      name="avatar"
                      onChange={update}
                      containerClassName="md:col-span-2"
                    />

                    <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="h-12 w-full rounded-xl text-base font-medium shadow-lg shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 md:w-auto"
                      >
                        {loading ? "Submitting..." : "Create Account"}
                      </Button>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        By continuing, you agree to our Terms and Privacy Policy.
                      </span>
                    </div>
                  </form>
                </CardContent>

                <CardFooter className="flex flex-col items-center justify-between gap-3 border-t border-slate-200/70 bg-slate-50/50 py-6 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300">
                  <p>Already registered? Ask the superadmin to approve, then log in with your new credentials.</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Secure workspace onboarding
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
