import { useEffect } from "react";
import * as ScreenOrientation from "expo-screen-orientation";

type Lock = "portrait" | "all";

/**
 * Locks/unlocks the screen orientation while this hook is mounted.
 * - "portrait" → only portrait allowed
 * - "all" → both portrait and landscape allowed
 *
 * On unmount, the orientation lock is removed (default behavior).
 */
export function useOrientationLock(lock: Lock) {
  useEffect(() => {
    if (lock === "portrait") {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT
      ).catch(() => {});
    } else {
      ScreenOrientation.unlockAsync().catch(() => {});
    }
    return () => {
      // Return to portrait by default when leaving the screen
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT
      ).catch(() => {});
    };
  }, [lock]);
}
