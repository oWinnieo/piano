"use client";

import { useEffect, useState } from "react";

const MOBILE_PORTRAIT_QUERY = "(max-width: 720px) and (orientation: portrait)";

export function OrientationPrompt() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_PORTRAIT_QUERY);

    function syncVisibility() {
      setVisible(mediaQuery.matches && !dismissed);
    }

    syncVisibility();
    mediaQuery.addEventListener("change", syncVisibility);

    return () => {
      mediaQuery.removeEventListener("change", syncVisibility);
    };
  }, [dismissed]);

  if (!visible) {
    return null;
  }

  return (
    <div className="orientation-backdrop" role="presentation">
      <div
        className="orientation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="orientation-title"
      >
        <div className="orientation-mark">↻</div>
        <h2 id="orientation-title">横屏体验更好</h2>
        <p>手机竖屏会压缩钢琴舞台，横屏后琴键更宽、更适合弹奏。</p>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => setDismissed(true)}
        >
          继续竖屏使用
        </button>
      </div>
    </div>
  );
}
