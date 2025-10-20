import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const employeeDetails = [
  { label: "Joining Date", value: "OCT 13, 2025" },
  { label: "Employee ID", value: "1756" },
  { label: "CNIC", value: "36203-2403172-5", uppercase: false },
  { label: "Blood Group", value: "AB+" },
  { label: "Email ID", value: "awais.waris@pnygroup.co", uppercase: false },
  { label: "Department", value: "Production", uppercase: false },
  { label: "Expiry Date", value: "10-13-2026" },
];

const ProfileCard = () => {
  const handlePrint = () => window.print();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-100 px-4 py-10 print:block print:min-h-0 print:bg-white print:p-0 print:gap-0">
      <div className="flex w-full max-w-[500px] justify-end print:hidden">
        <Button
          size="sm"
          onClick={handlePrint}
          className="bg-[#1a7dc1] text-white hover:bg-[#155f93]"
        >
          Print Card
        </Button>
      </div>

      <Card id="employee-card" className="relative h-[660px] w-full max-w-[500px] !flex-row !items-stretch !gap-0 overflow-hidden rounded-[32px] border-none bg-white text-slate-900 shadow-[0_28px_65px_rgba(15,23,42,0.18)] !p-0 print:mx-auto print:h-[660px] print:w-[500px] print:rounded-none print:border print:border-slate-200 print:shadow-none">
        <aside className="flex w-[80px] shrink-0 items-center justify-center bg-[#c8161f] px-4 py-12">
          <span className="text-center text-[14px] font-semibold uppercase tracking-[0.48em] text-white [writing-mode:vertical-rl] rotate-180">
            PNY Group Of Companies
          </span>
        </aside>

        <div className="relative flex flex-1 flex-col items-center px-10 pb-12 pt-10 text-center">
          <div className="pointer-events-none absolute inset-0">
           
            <div
              aria-hidden
              className="absolute top-20 right-16 h-0 w-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-[#1a7dc1]"
            />
            <div
              aria-hidden
              className="absolute top-[188px] left-8 h-0 w-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-[#d9252c]"
            />
          </div>
          <span className="absolute right-6 top-6 z-10 text-xs font-semibold uppercase tracking-[0.36em] text-[#1a7dc1]">
            #JoinPNY
          </span>

          <div className="relative z-10 flex flex-col items-center gap-1">
            <div className="text-5xl font-black uppercase leading-none tracking-[0.14em]">
              <span className="text-[#1a7dc1]">PN</span>
              <span className="text-[#e11e26]">Y</span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
              Group of Companies
            </p>
          </div>

          <div className="relative z-10 mt-6 flex flex-col items-center">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full">
              <Avatar className="h-32 w-32 border-4 border-[#c01925]">
                <AvatarImage src="/avatars/awais-waris.jpg" alt="Awais Waris" />
                <AvatarFallback className="bg-white text-xl font-semibold text-[#c01925]">
                  AW
                </AvatarFallback>
              </Avatar>
              <svg
                aria-hidden
                viewBox="0 0 32 32"
                className="absolute -left-7 top-1/2 h-16 w-16 -translate-y-1/2"
              >
                <path d="M0 16 L22 0 C15 9 15 23 22 32 Z" fill="#d9252c" />
              </svg>
              <svg
                aria-hidden
                viewBox="0 0 32 32"
                className="absolute -right-7 top-1/2 h-16 w-16 -translate-y-1/2"
              >
                <path d="M32 16 L10 32 C17 23 17 9 10 0 Z" fill="#1d7cc8" />
              </svg>
            </div>

            <div className="mt-6 text-center">
              <p className="text-2xl font-black tracking-[0.12em]">
                <span className="text-[#d9252c]">Awais</span>{" "}
                <span className="text-slate-900">Waris</span>
              </p>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Ads Management Executive
              </p>
            </div>
          </div>

          <CardContent className="relative z-10 mt-8 w-full !px-0">
            <div className="space-y-3">
              {employeeDetails.map(({ label, value, uppercase = true }) => (
                <div
                  key={label}
                  className="grid grid-cols-[135px_auto] items-center gap-2 text-sm"
                >
                  <span className="text-[13px] text-left font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {label}
                  </span>
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                    <span className="text-slate-300">:</span>
                    <span
                      className={`tracking-[0.08em] text-slate-900 ${
                        uppercase ? "uppercase" : "normal-case"
                      }`}
                    >
                      {value}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>

          <div className="relative z-10 mt-8 text-sm font-semibold uppercase tracking-[0.32em] text-slate-700">
            www.pnytrainings.com
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfileCard;
