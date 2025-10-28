// src/components/overtime/StatusToggle.jsx
import React from "react";
import { Button } from "@/components/ui/button";

export default function StatusToggle({ verified, saving, onToggle }) {
  return verified ? (
    <div className="flex items-center justify-center gap-2">
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
        Verified
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onToggle(false)}
        disabled={saving}
        title="Mark as unverified"
      >
        Unverify
      </Button>
    </div>
  ) : (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => onToggle(true)}
      disabled={saving}
    >
      Verify
    </Button>
  );
}
