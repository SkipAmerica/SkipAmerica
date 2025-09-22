import { useEffect } from "react";
import { Keyboard } from "@capacitor/keyboard";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export default function App() {
  useEffect(() => {
    Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
  }, []);

  const doCountdownHaptics = async () => {
    await Haptics.impact({ style: ImpactStyle.Medium });
    await Haptics.impact({ style: ImpactStyle.Medium });
    await Haptics.impact({ style: ImpactStyle.Medium });
    await Haptics.impact({ style: ImpactStyle.Heavy });
  };

  return (
    <div className="h-full w-full">
      {/* app UI */}
      {/* <button onClick={doCountdownHaptics}>Test Haptics</button> */}
    </div>
  );
}
