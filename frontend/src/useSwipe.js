/**
 * useSwipe.js
 * Detects horizontal swipe gestures on a ref element.
 *
 * Usage:
 *   const bind = useSwipe({ onSwipeRight: () => {}, onSwipeLeft: () => {} });
 *   <div {...bind} />
 */
import { useRef } from "react";

const MIN_DISTANCE = 60;   // px minimum swipe
const MAX_VERTICAL = 60;   // px max vertical drift (to distinguish from scroll)

export function useSwipe({ onSwipeLeft, onSwipeRight, onSwipeProgress } = {}) {
    const startX  = useRef(null);
    const startY  = useRef(null);
    const swiping = useRef(false);

    function onTouchStart(e) {
        startX.current  = e.touches[0].clientX;
        startY.current  = e.touches[0].clientY;
        swiping.current = false;
    }

    function onTouchMove(e) {
        if (startX.current === null) return;
        const dx = e.touches[0].clientX - startX.current;
        const dy = Math.abs(e.touches[0].clientY - startY.current);
        if (dy > MAX_VERTICAL) return;   // mostly vertical — let page scroll
        if (Math.abs(dx) > 10) swiping.current = true;
        if (onSwipeProgress) onSwipeProgress(dx);
    }

    function onTouchEnd(e) {
        if (!swiping.current || startX.current === null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        const dy = Math.abs(e.changedTouches[0].clientY - startY.current);
        if (dy < MAX_VERTICAL && Math.abs(dx) >= MIN_DISTANCE) {
            if (dx > 0 && onSwipeRight) onSwipeRight();
            if (dx < 0 && onSwipeLeft)  onSwipeLeft();
        }
        if (onSwipeProgress) onSwipeProgress(0);
        startX.current  = null;
        swiping.current = false;
    }

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    };
}
