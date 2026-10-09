/**
 * usePullToRefresh.js
 * Detects a downward pull gesture at the top of the page and fires a callback.
 *
 * Usage:
 *   const { isPulling, pullProgress } = usePullToRefresh(onRefresh);
 */
import { useState, useEffect, useRef } from "react";

const THRESHOLD   = 72;   // px to drag before triggering
const MAX_PULL    = 110;  // px max drag distance shown

export function usePullToRefresh(onRefresh, containerRef) {
    const [pullProgress, setPullProgress] = useState(0); // 0-1
    const [isPulling,    setIsPulling]    = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const startY    = useRef(null);
    const pulling   = useRef(false);

    useEffect(() => {
        const el = containerRef?.current || window;

        function getScrollTop() {
            if (containerRef?.current) return containerRef.current.scrollTop;
            return window.scrollY || document.documentElement.scrollTop;
        }

        function onTouchStart(e) {
            if (getScrollTop() > 0) return;   // only trigger when at top
            startY.current = e.touches[0].clientY;
            pulling.current = false;
        }

        function onTouchMove(e) {
            if (startY.current === null) return;
            const dy = e.touches[0].clientY - startY.current;
            if (dy <= 0) { setPullProgress(0); return; }

            pulling.current = true;
            setIsPulling(true);
            const clamped = Math.min(dy, MAX_PULL);
            setPullProgress(clamped / THRESHOLD);

            // prevent native scroll overscroll while pulling
            if (dy > 5 && getScrollTop() === 0) e.preventDefault();
        }

        function onTouchEnd() {
            if (pulling.current && pullProgress >= 1 && !isRefreshing) {
                setIsRefreshing(true);
                Promise.resolve(onRefresh()).finally(() => {
                    setIsRefreshing(false);
                    setIsPulling(false);
                    setPullProgress(0);
                    startY.current = null;
                    pulling.current = false;
                });
            } else {
                setIsPulling(false);
                setPullProgress(0);
                startY.current = null;
                pulling.current = false;
            }
        }

        const target = containerRef?.current || document;
        target.addEventListener("touchstart", onTouchStart, { passive: true });
        target.addEventListener("touchmove",  onTouchMove,  { passive: false });
        target.addEventListener("touchend",   onTouchEnd,   { passive: true });

        return () => {
            target.removeEventListener("touchstart", onTouchStart);
            target.removeEventListener("touchmove",  onTouchMove);
            target.removeEventListener("touchend",   onTouchEnd);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onRefresh, isRefreshing, pullProgress]);

    return { isPulling, pullProgress: Math.min(pullProgress, 1), isRefreshing };
}
