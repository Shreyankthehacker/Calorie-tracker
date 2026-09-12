import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { LoginPage, RegisterPage } from '../pages/AuthPages';
import { DashboardPage } from '../pages/DashboardPage';
import { GoalsPage } from '../pages/GoalsPage';
import { MealsPage } from '../pages/MealsPage';
import { GuestRoute, PlaceholderPage, ProtectedRoute } from './guards';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/meals" element={<MealsPage />} />
          <Route
            path="/reports"
            element={
              <PlaceholderPage
                title="Reports"
                description="Nutrition reports and charts will arrive in a later phase."
              />
            }
          />
          <Route
            path="/scan"
            element={
              <PlaceholderPage
                title="Scan Food"
                description="AI nutrition extraction from images will arrive in a later phase."
              />
            }
          />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
