import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { LoginPage, RegisterPage } from '../pages/AuthPages';
import { BmiPage } from '../pages/BmiPage';
import { ChatPage } from '../pages/ChatPage';
import { DashboardPage } from '../pages/DashboardPage';
import { FamilyPage } from '../pages/FamilyPage';
import { GoalsPage } from '../pages/GoalsPage';
import { ImportPdfPage } from '../pages/ImportPdfPage';
import { LogMealPage } from '../pages/LogMealPage';
import { MealsPage } from '../pages/MealsPage';
import { PortionPage } from '../pages/PortionPage';
import { ReportsPage } from '../pages/ReportsPage';
import { ScanFoodPage } from '../pages/ScanFoodPage';
import { WaterPage } from '../pages/WaterPage';
import { GuestRoute, HomeRoute, ProtectedRoute } from './guards';
import { GetStartedPage } from '../pages/GetStartedPage';
import { TutorialPage } from '../pages/TutorialPage';
import { AboutPage } from '../pages/AboutPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/tutorial" element={<TutorialPage />} />
      <Route path="/get-started" element={<GetStartedPage />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/log-meal" element={<LogMealPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/meals" element={<MealsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/scan" element={<ScanFoodPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/water" element={<WaterPage />} />
          <Route path="/bmi" element={<BmiPage />} />
          <Route path="/portions" element={<PortionPage />} />
          <Route path="/import" element={<ImportPdfPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
