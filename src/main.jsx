import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from '../StablePayKYB_v2.jsx';
import AdminPanel from '../AdminPanel.jsx';

function Root() {
  const path = window.location.hash;
  const [, setTick] = useState(0);

  React.useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  if (path === "#admin") return <AdminPanel />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
