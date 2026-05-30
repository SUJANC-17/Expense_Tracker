import { lazy, Suspense, useState, useEffect } from "react";
import { Toaster } from "sonner";

const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));
const UserApp = lazy(() => import("./UserApp"));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
      Loading...
    </div>
  );
}

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
    return (
      <>
        <Suspense fallback={<LoadingFallback />}>
          <AdminDashboard />
        </Suspense>
        <Toaster theme="dark" position="bottom-right" />
      </>
    );
  }

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <UserApp />
      </Suspense>
      <Toaster theme="dark" position="bottom-right" />
    </>
  );
}
