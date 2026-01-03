import { useState, useEffect } from "react";
import AdminDashboard from "./components/admin/AdminDashboard";
import UserApp from "./UserApp";

export default function App() {
  // Simple router check - does not use hooks that trigger auth/data fetching!
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = () => {
      // Check query param or path
      const isAdminParam = window.location.search.includes('admin=true');
      const isAdminPath = window.location.pathname.startsWith('/admin');

      console.log("[App Dispatcher] Checking mode:", { isAdminParam, isAdminPath });
      setIsAdmin(isAdminParam || isAdminPath);
    };

    checkAdmin();
    // Optional: add listener for popstate if we were using pushState, 
    // but here we mostly rely on initial load or reloads.
  }, []);

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return <UserApp />;
}
