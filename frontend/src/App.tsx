import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { useAuthStore } from './store/useAuthStore';
import { authService } from './services/auth';
import { statsService } from './services/stats';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ArticlePage } from './pages/ArticlePage';
import { AuthorsPage } from './pages/AuthorsPage';
import { ArticlesPage } from './pages/ArticlesPage';
import { SearchPage } from './pages/SearchPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotificationSettingsPage } from './pages/NotificationSettingsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SecurityPage } from './pages/SecurityPage';
import { EditorPage } from './pages/EditorPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { MyArticles } from './pages/dashboard/MyArticles';
import {
  AboutPage,
  ContactPage,
  TermsPage,
  PrivacyPage,
  CookiesPage,
  CategoriesPage
} from './pages/StaticPages';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppLoader } from './components/ui/AppLoader';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
      refetchOnWindowFocus: false
    },
  },
});

function AppContent() {
  const { isLoading, _hasHydrated } = useAuthStore();

  useEffect(() => {
    authService.initializeAuth();
    // Record visit once per session
    statsService.recordVisit();
  }, []);

  if (!_hasHydrated || isLoading) {
    return <AppLoader />;
  }

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="articles" element={<ArticlesPage />} />
            <Route path="articles/:slug" element={<ArticlePage />} />
            <Route path="articles/id/:id" element={<ArticlePage />} />
            <Route path="search" element={<SearchPage />} />

            {/* Static Pages */}
            <Route path="about" element={<AboutPage />} />
            <Route path="authors" element={<AuthorsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="cookies" element={<CookiesPage />} />

            {/* Protected Routes */}
            <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="profile/:id" element={<ProfilePage />} />
            <Route path="notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

            {/* Dashboard & Editor */}
            <Route path="dashboard/my-articles" element={<ProtectedRoute requirePublisher><MyArticles /></ProtectedRoute>} />
            <Route path="editor" element={<ProtectedRoute requirePublisher><EditorPage /></ProtectedRoute>} />
            <Route path="editor/:id" element={<ProtectedRoute requirePublisher><EditorPage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />

            {/* Settings Sub-routes */}
            <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="settings/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
            <Route path="settings/notifications" element={<ProtectedRoute><NotificationSettingsPage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
