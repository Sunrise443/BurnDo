import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { RequireAuth, RequireGroup } from './guards.tsx'
import { AccountPage } from '@/pages/account/index.ts'
import { CalendarPage } from '@/pages/calendar/index.ts'
import { ForgotPasswordPage } from '@/pages/forgot-password/index.ts'
import { JoinPage } from '@/pages/join/index.ts'
import { LoginPage } from '@/pages/login/index.ts'
import { MembersPage } from '@/pages/members/index.ts'
import { RegisterPage } from '@/pages/register/index.ts'
import { ResetPasswordPage } from '@/pages/reset-password/index.ts'
import { SubjectDetailsPage } from '@/pages/subject-details/index.ts'
import { SubjectListPage } from '@/pages/subject-list/index.ts'
import { TaskDetailsPage } from '@/pages/task-details/index.ts'
import { TaskListPage } from '@/pages/task-list/index.ts'
import { ThemeToggle, uiStyles } from '@/shared/ui/index.ts'
import { AppShell } from '@/widgets/app-shell/index.ts'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className={uiStyles.themeFloat}>
          <ThemeToggle />
        </div>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/join" element={<JoinPage />} />
            <Route element={<AppShell />}>
              <Route path="/account" element={<AccountPage />} />
              <Route element={<RequireGroup />}>
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/subjects" element={<SubjectListPage />} />
                <Route path="/subjects/:subjectId" element={<SubjectDetailsPage />} />
                <Route path="/tasks" element={<TaskListPage />} />
                <Route path="/tasks/:taskId" element={<TaskDetailsPage />} />
                <Route path="/members" element={<MembersPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
