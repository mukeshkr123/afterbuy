import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// Mirrors iOS Reduce Motion / Android "Remove animations" system settings.
// Impeccable mandate: every animation needs a reduced-motion alternative.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (!cancelled) setReduced(value);
      })
      .catch(() => {
        // best-effort: leave default
      });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced
    );
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return reduced;
}
