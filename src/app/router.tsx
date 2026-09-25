import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/app/AppShell'
import { NotFoundPage, RouteErrorPage } from '@/app/pages'
import { RequireAuth, RequireProfile } from '@/features/auth/guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { GroupFinanceTab } from '@/features/finance/GroupFinanceTab'
import { MyFinancePage } from '@/features/finance/MyFinancePage'
import { MarketplacePage } from '@/features/marketplace/MarketplacePage'
import { PublicPostPage } from '@/features/marketplace/PublicPostPage'
import { SuperadminPage } from '@/features/admin/SuperadminPage'
import { CreateGroupPage } from '@/features/groups/CreateGroupPage'
import { GroupLayout } from '@/features/groups/GroupLayout'
import { GroupMembersTab } from '@/features/groups/GroupMembersTab'
import { GroupSettingsTab } from '@/features/groups/GroupSettingsTab'
import { InvitePage } from '@/features/groups/InvitePage'
import { HomePage } from '@/features/home/HomePage'
import { OnboardingPage } from '@/features/profile/OnboardingPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { GroupSessionsTab } from '@/features/sessions/GroupSessionsTab'
import { SessionDetailPage } from '@/features/sessions/SessionDetailPage'

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/prihlasenie', element: <LoginPage /> },
      { path: '/burza/:postId', element: <PublicPostPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: '/vitaj', element: <OnboardingPage /> },
          {
            element: <RequireProfile />,
            children: [
              {
                element: <AppShell />,
                children: [
                  { index: true, element: <HomePage /> },
                  { path: '/profil', element: <ProfilePage /> },
                  { path: '/financie', element: <MyFinancePage /> },
                  { path: '/burza', element: <MarketplacePage /> },
                  { path: '/admin', element: <SuperadminPage /> },
                  { path: '/partie/nova', element: <CreateGroupPage /> },
                  {
                    path: '/partie/:groupId',
                    element: <GroupLayout />,
                    children: [
                      { index: true, element: <GroupSessionsTab /> },
                      { path: 'clenovia', element: <GroupMembersTab /> },
                      { path: 'financie', element: <GroupFinanceTab /> },
                      { path: 'nastavenia', element: <GroupSettingsTab /> },
                    ],
                  },
                  { path: '/terminy/:sessionId', element: <SessionDetailPage /> },
                  { path: '/pozvanka/:code', element: <InvitePage /> },
                  { path: '*', element: <NotFoundPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
])
