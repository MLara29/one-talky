import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function ChooseRole() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get("role");

  useEffect(() => {
    // Always redirect based on role — no choice screen
    if (role === "tutor") {
      navigate("/onboarding/tutor", { replace: true });
    } else if (role === "affiliate") {
      navigate("/onboarding/affiliate", { replace: true });
    } else {
      // Default: student onboarding
      navigate("/onboarding/student", { replace: true });
    }
  }, [role]);

  return null;
}