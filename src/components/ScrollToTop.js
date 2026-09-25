// ScrollToTop — resets the window scroll to (0,0) whenever the route
// changes. Fixes the beta report of "some pages load scrolled to the
// bottom", which happens because HashRouter reuses the same document
// so the browser's automatic scroll restoration doesn't kick in.

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  return null;
}
