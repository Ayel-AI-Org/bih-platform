import { useEffect, ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface ScrollToTopProps {
  children?: ReactNode;
}

const ScrollToTop = ({ children }: ScrollToTopProps) => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If navigating to a specific #hash anchor, scroll to that element
    if (hash) {
      const id = hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "instant" });
        return;
      }

      // If the target element is lazy-loaded or not yet in the DOM, retry on next frame
      requestAnimationFrame(() => {
        const deferredElement = document.getElementById(id);
        if (deferredElement) {
          deferredElement.scrollIntoView({ behavior: "instant" });
        } else {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
      });
      return;
    }

    // Reset window viewport scroll to top
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });

    // Also reset scroll position for internal scrollable layout containers (e.g. dashboards)
    const scrollableContainers = document.querySelectorAll("main.overflow-y-auto");
    scrollableContainers.forEach((container) => {
      container.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
  }, [pathname, hash]);

  return <>{children}</>;
};

export default ScrollToTop;
export { ScrollToTop };
