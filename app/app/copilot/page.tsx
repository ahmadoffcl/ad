"use client";

import { useEffect } from "react";

export default function CopilotRedirect() {
  useEffect(() => {
    window.location.replace("/app");
  }, []);
  return null;
}
