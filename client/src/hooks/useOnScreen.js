import { useEffect, useState } from 'react';

export default function useOnScreen(ref, rootMargin = '0px') {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    if (!ref?.current || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver((entries) => {
      const [entry] = entries;
      setIntersecting(entry.isIntersecting);
    }, { root: null, rootMargin, threshold: 0.01 });

    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, rootMargin]);

  return isIntersecting;
}
