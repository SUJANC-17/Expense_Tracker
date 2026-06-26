# UI/UX Spec: Expense Tracker

This document describes the current UI/UX of the app as implemented in the codebase. It is a restyle brief only. It does not propose new flows, new features, or layout changes.

## App Dispatcher

### Page Name & Route
- `App.tsx`
- Root entry point
- `?admin=true` or any pathname beginning with `/admin` renders the admin experience.
- All other paths render the user experience.

### Layout Structure
- Full-screen dispatcher only.
- Shows a centered loading fallback while lazy-loaded content resolves.
- Mounts `Toaster` in the bottom-right corner for all modes.

### Components
- `AdminDashboard` from [`client/src/components/admin/AdminDashboard.tsx`](./client/src/components/admin/AdminDashboard.tsx)
- `UserApp` from [`client/src/UserApp.tsx`](./client/src/UserApp.tsx)
- `Toaster` from [`client/src/components/ui/sonner.tsx`](./client/src/components/ui/sonner.tsx)

### Navigation Flow
- Route inspection happens on initial load only via `window.location.search` and `window.location.pathname`.
- No client-side router is used at this level.
- Admin mode and user mode are mutually exclusive.

## Auth Screen

### Page Name & Route
- Authentication screen
- Rendered by `UserApp.tsx` when the user is not signed in.
- No dedicated route component; it is the unauthenticated state of the app.

### Layout Structure
- Full-screen centered card on a `bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900` background.
- Single column layout with:
  - App icon and title
  - Login/signup form
  - Google sign-in action
  - Privacy policy agreement block
  - Mode switch between login and signup
- Two modal overlays can appear on top:
  - Forgot password dialog
  - Signup OTP verification dialog

### Components
- `AuthForm` from [`client/src/components/AuthForm.tsx`](./client/src/components/AuthForm.tsx)
  - Shows either login or signup form.
  - Login: email, password, forgot-password trigger, submit button, Google sign-in button.
  - Signup: username, email, password, confirm password, privacy policy consent, submit button, Google sign-in button.
  - Interactive elements:
    - mode toggle between login and signup
    - show/hide password toggle
    - Privacy Policy modal open
    - forgot password modal open
    - signup OTP modal open
    - resend verification code
  - Data shown:
    - validation errors and success state
    - reset password email entry
    - pending signup email and OTP expiration
- `PrivacyPolicy` from [`client/src/components/PrivacyPolicy.tsx`](./client/src/components/PrivacyPolicy.tsx)
  - Full-screen modal with policy text and close action.
- `Dialog` family from [`client/src/components/ui/dialog.tsx`](./client/src/components/ui/dialog.tsx)
  - Used for modal presentation in the auth flow.
- `InputOTP` from [`client/src/components/ui/input-otp.tsx`](./client/src/components/ui/input-otp.tsx)
  - 6-digit verification code entry.
- `Card`, `Button`, `Input`, `Label` from shared UI primitives
  - Used to build the glass auth panel and form controls.

### Navigation Flow
- No route change occurs inside the auth screen.
- Successful login transitions into the main user shell.
- Successful signup OTP verification returns the user to the login state and signs them in.
- Privacy policy opens and closes in place.
- Forgot password and OTP dialogs are in-place overlays only.

## Main User Shell

### Page Name & Route
- User shell / tabbed app
- Active when authenticated
- Primary paths:
  - `/` for dashboard and tabbed navigation
  - `/settings`
  - `/settings/reports`
- Virtual tab state is also stored through `sessionStorage` and `?tab=`

### Layout Structure
- Full-screen animated mesh background behind the app.
- Main wrapper:
  - `container mx-auto p-4 md:p-8`
  - top glass header block
  - tabbed content area
- Top header block:
  - mobile row with menu button, centered app title, avatar menu
  - desktop row with brand area, horizontal tab buttons, avatar menu
- Mobile navigation:
  - collapsible vertical menu under the header
- Main content area:
  - Radix `Tabs` root with one active content panel at a time
  - tab panels are stacked one after another in the DOM, but only the active panel is visible
- Global modals mounted after the shell:
  - reminder settings
  - password change / setup
  - delete account
  - donation/support
  - privacy policy overlay

### Components
- Shell background from CSS classes in [`client/src/styles/index.css`](./client/src/styles/index.css)
  - `mesh-bg-container`
  - `mesh-blob-1`
  - `mesh-blob-2`
  - `mesh-blob-3`
- Header / nav shell in [`client/src/UserApp.tsx`](./client/src/UserApp.tsx)
  - mobile menu button
  - desktop tab bar
  - avatar dropdown menu
- `Tabs` / `TabsContent` from [`client/src/components/ui/tabs.tsx`](./client/src/components/ui/tabs.tsx)
  - active tab content areas
- `Dashboard` from [`client/src/components/Dashboard.tsx`](./client/src/components/Dashboard.tsx)
- `IncomeManager` from [`client/src/components/IncomeManager.tsx`](./client/src/components/IncomeManager.tsx)
- `ExpenseManager` from [`client/src/components/ExpenseManager.tsx`](./client/src/components/ExpenseManager.tsx)
- `SplitManager` from [`client/src/components/SplitManager.tsx`](./client/src/components/SplitManager.tsx)
- `FriendsManager` from [`client/src/components/FriendsManager.tsx`](./client/src/components/FriendsManager.tsx)
- `SettingsPage` from [`client/src/components/Settings.tsx`](./client/src/components/Settings.tsx)
- `Dialog` family from [`client/src/components/ui/dialog.tsx`](./client/src/components/ui/dialog.tsx)
- `DropdownMenu` family from [`client/src/components/ui/dropdown-menu.tsx`](./client/src/components/ui/dropdown-menu.tsx)
- `Avatar` family from [`client/src/components/ui/avatar.tsx`](./client/src/components/ui/avatar.tsx)
- `SkeletonLoader` from [`client/src/components/SkeletonLoader.tsx`](./client/src/components/SkeletonLoader.tsx)

### Navigation Flow
- Desktop tabs switch the active content panel without a full page transition.
- Mobile menu buttons switch the active tab and close the menu.
- Selecting `Settings` always opens the budget section first.
- Selecting `Reports` updates the URL to `/settings/reports`.
- Selecting budget settings updates the URL to `/settings`.
- Any other tab selection resets the path back to `/` if needed.
- The user avatar dropdown can open:
  - change/set password
  - Google account linking
  - reminder settings
  - support dialog
  - privacy policy
  - delete account
  - logout

## Dashboard Tab

### Page Name & Route
- Dashboard tab
- Path: `/` with active tab `dashboard`

### Layout Structure
- Vertical stack:
  - page title and month label
  - summary metrics grid
  - budget progress section if active budgets exist
  - two-column bottom grid for category breakdown and unpaid split summary
- No left sidebar.
- No charts, no tables, no pagination.

### Components
- `Dashboard` from [`client/src/components/Dashboard.tsx`](./client/src/components/Dashboard.tsx)
  - Shows current-month overview using incomes, expenses, splits, budgets, and categories.
  - Top summary cards:
    - Balance
    - Income
    - Expenses
  - Budget progress cards:
    - daily, weekly, monthly active budgets
    - spent vs limit values
    - progress bar
    - percent used and remaining amount
  - Category breakdown card:
    - expense totals grouped by category
  - Unpaid split summary card:
    - total unpaid amount
    - top unpaid friends
    - overflow count when more than three
  - Interactive elements:
    - none beyond passive display and animated count values
  - Charts/graphs:
    - none
    - `Progress` bars are used as linear indicators, not charts
- `Card`, `CardHeader`, `CardTitle`, `CardContent` from [`client/src/components/ui/card.tsx`](./client/src/components/ui/card.tsx)
- `Progress` from [`client/src/components/ui/progress.tsx`](./client/src/components/ui/progress.tsx)
- `CountUp` animation for numeric totals

### Navigation Flow
- The dashboard does not navigate anywhere.
- It is the default landing tab after login.
- Values refresh when underlying data changes.

## Income Tab

### Page Name & Route
- Income tab
- Path: `/` with active tab `income`

### Layout Structure
- Top row with page title and `Add Income` button.
- A dialog opens for create/edit.
- Below that, a single history card lists income rows.

### Components
- `IncomeManager` from [`client/src/components/IncomeManager.tsx`](./client/src/components/IncomeManager.tsx)
  - Shows income records sorted newest first.
  - Form fields:
    - amount
    - source
    - description
    - date
  - Interactive elements:
    - `Add Income` dialog trigger
    - edit button on each row
    - delete button on each row
    - submit / cancel inside the dialog
  - Data shown:
    - income amount
    - source
    - description if present
    - date
- `Dialog` family from [`client/src/components/ui/dialog.tsx`](./client/src/components/ui/dialog.tsx)
- `Input`, `Textarea`, `Label`, `Button`, `Card`

### Navigation Flow
- `Add Income` opens a modal form.
- `Edit` opens the same modal prefilled.
- Delete removes the income entry in place.
- No page route change occurs.

## Expenses Tab

### Page Name & Route
- Expenses tab
- Path: `/` with active tab `expenses`

### Layout Structure
- Top row with page title and `Add Expense` button.
- A dialog opens for create/edit.
- Below that, a single history card lists expense rows.

### Components
- `ExpenseManager` from [`client/src/components/ExpenseManager.tsx`](./client/src/components/ExpenseManager.tsx)
  - Shows expense records sorted newest first.
  - Form fields:
    - amount
    - category selector
    - description
    - date
  - Interactive elements:
    - `Add Expense` dialog trigger
    - category dropdown
    - edit button on each row
    - delete button on each row
    - submit / cancel inside the dialog
  - Data shown:
    - expense amount
    - category chip
    - description if present
    - date
- `Dialog`, `Select`, `Input`, `Textarea`, `Label`, `Button`, `Card`
- `motion.div` animation for row stagger and entrance

### Navigation Flow
- `Add Expense` opens a modal form.
- `Edit` opens the same modal prefilled.
- Delete removes the expense entry in place.
- No page route change occurs.

## Splits Tab

### Page Name & Route
- Splits tab
- Path: `/` with active tab `splits`

### Layout Structure
- Top row with page title and `Add Split` button.
- Create/edit split dialog is the primary interaction surface.
- Below, a three-column desktop layout collapses to one column on small screens:
  - main bill summary and recent splits area
  - right-side utility cards
- Within the main area:
  - bill summary accordion-like groups
  - recent split rows
- Right side:
  - outstanding balance card
  - quick tips card

### Components
- `SplitManager` from [`client/src/components/SplitManager.tsx`](./client/src/components/SplitManager.tsx)
  - Creates split bills and manages existing split rows.
  - Split form fields:
    - total bill amount
    - date
    - split mode toggle: equal or manual
    - participant selection
    - optional one-time custom name
    - description
  - Displays calculated preview of shares.
  - Shows grouped bill summaries by description and date.
  - Shows recent split entries.
  - Interactive elements:
    - `Add Split` dialog trigger
    - equal/manual mode toggle
    - self toggle
    - friend toggles
    - custom name input
    - manual share inputs
    - expandable bill group rows
    - mark-as-paid check button
    - edit and delete buttons on recent rows
  - Data shown:
    - bill totals
    - pending totals
    - paid totals
    - per-person share values
    - outstanding balance total
  - Charts/graphs:
    - none
    - balance/preview cards are not chart components
- `Badge` from [`client/src/components/ui/badge.tsx`](./client/src/components/ui/badge.tsx)
- `CountUp` for outstanding balance
- `motion.div` for recent split row animation

### Navigation Flow
- `Add Split` opens the split creation modal.
- `Split Equally` and `Split Manually` change the form calculation mode only.
- Bill groups expand and collapse in place.
- Marking a split as paid updates the row state without navigation.
- Editing a split reuses the same dialog.

## Friends Tab

### Page Name & Route
- Friends tab
- Path: `/` with active tab `friends`

### Layout Structure
- Top row with page title and `Add Friend` button.
- Create friend dialog at the top.
- Below, a responsive grid of friend cards.

### Components
- `FriendsManager` from [`client/src/components/FriendsManager.tsx`](./client/src/components/FriendsManager.tsx)
  - Shows friend profiles.
  - Form fields:
    - friend name
  - Interactive elements:
    - `Add Friend` dialog trigger
    - submit / cancel inside the dialog
    - delete button on each friend card
  - Data shown:
    - friend initial avatar
    - friend name
- `Dialog`, `Card`, `Button`, `Input`, `Label`

### Navigation Flow
- `Add Friend` opens a modal form.
- Delete removes the friend from the grid.
- No route change occurs.

## Settings Tab

### Page Name & Route
- Settings tab
- Paths:
  - `/settings`
  - `/settings/reports`
- Virtual tab active value: `settings`

### Layout Structure
- Top row with page title and section toggle buttons:
  - Budget
  - Reports
- A summary card shows the active budget count.
- Content beneath changes by section:
  - budget section shows three budget cards in a grid
  - reports section renders the reports page

### Components
- `SettingsPage` from [`client/src/components/Settings.tsx`](./client/src/components/Settings.tsx)
  - Top-level settings shell.
  - Budget section:
    - one card each for daily, weekly, and monthly budgets
    - cards either show current budget or an amount form
    - interactive elements:
      - edit button
      - clear/remove button
      - save/update button
      - cancel button
  - Reports section:
    - renders `SettingsReportsPage`
- `BudgetCard` internal component in [`client/src/components/Settings.tsx`](./client/src/components/Settings.tsx)
  - Manages a single budget period card.
- `SettingsReportsPage` from [`client/src/components/SettingsReports.tsx`](./client/src/components/SettingsReports.tsx)
- `Button`, `Card`, `Input`, `Label`

### Navigation Flow
- Budget and Reports buttons switch the section without leaving the app shell.
- Selecting Reports updates the path to `/settings/reports`.
- Selecting Budget updates the path to `/settings`.
- Budget actions update in place.

## Settings Reports Subpage

### Page Name & Route
- Reports inside Settings
- Route: `/settings/reports`

### Layout Structure
- Header row with title and `Back to Budget` button.
- Period selector card:
  - year select
  - month select
- Monthly report card:
  - send report button in the header
  - metric cards
  - category breakdown
  - cumulative savings section
  - unpaid split section when relevant

### Components
- `SettingsReportsPage` from [`client/src/components/SettingsReports.tsx`](./client/src/components/SettingsReports.tsx)
  - Report controls:
    - year dropdown
    - month dropdown
    - send to email button
  - Data shown:
    - total income
    - total expenses
    - balance
    - expenses by category with percentages
    - cumulative savings by budget period and range
    - unpaid split expenses
  - Interactive elements:
    - budget period dropdown
    - range dropdown
    - email send button
    - back to budget button
  - Charts/graphs:
    - none
    - all visuals are metric cards and lists
- `MetricCard` internal component in [`client/src/components/SettingsReports.tsx`](./client/src/components/SettingsReports.tsx)
- `SavingsCard` internal component in [`client/src/components/SettingsReports.tsx`](./client/src/components/SettingsReports.tsx)
- `Select`, `Button`, `Card`

### Navigation Flow
- `Back to Budget` returns to `/settings`.
- Changing year or month refreshes the computed report.
- Sending the report uses email only; no route change occurs.

## User Menu Dialogs

### Page Name & Route
- Global modal flows within the authenticated shell
- Not separate routes

### Layout Structure
- All dialogs use centered modal panels with dark glass surfaces.
- The modal stack is:
  - reminder settings
  - password setup/change
  - delete account confirmation
  - support/donation teaser
  - privacy policy overlay

### Components
- Reminder dialog in [`client/src/UserApp.tsx`](./client/src/UserApp.tsx)
  - Shows reminder time input and enable/disable toggle.
  - Interactive elements:
    - time picker
    - toggle button
    - save
    - close
- Password dialog in [`client/src/UserApp.tsx`](./client/src/UserApp.tsx)
  - Two-step flow:
    - request step for new password and confirmation
    - verify step with 6-digit OTP
  - Interactive elements:
    - send verification code
    - resend code
    - update password
    - cancel
- Delete account dialog in [`client/src/UserApp.tsx`](./client/src/UserApp.tsx)
  - Confirmation card with permanent delete action.
- Donation dialog in [`client/src/UserApp.tsx`](./client/src/UserApp.tsx)
  - Informational placeholder only.
- `PrivacyPolicy` from [`client/src/components/PrivacyPolicy.tsx`](./client/src/components/PrivacyPolicy.tsx)
  - Can be opened from the user menu or auth screen.

### Navigation Flow
- These dialogs open from the avatar dropdown menu.
- None of them change routes.
- Delete account logs the user out after backend deletion.
- Privacy policy closes back to the current screen.

## Admin Login

### Page Name & Route
- Admin access screen
- Rendered when `?admin=true` is present or the pathname begins with `/admin`

### Layout Structure
- Full-screen centered login card on a very dark background.
- Single card stack:
  - icon and title
  - email and PIN inputs
  - error text
  - authenticate button

### Components
- `AdminDashboard` from [`client/src/components/admin/AdminDashboard.tsx`](./client/src/components/admin/AdminDashboard.tsx)
  - Login state inside the same file.
  - Inputs:
    - admin email
    - admin PIN
  - Interactive elements:
    - authenticate button
  - Data shown:
    - authentication errors
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- `Input`, `Button`

### Navigation Flow
- Successful login stores `admin_token` and switches to the admin dashboard.
- No route change is required.

## Admin Dashboard

### Page Name & Route
- Admin dashboard
- Route family:
  - `/admin`
  - `?admin=true`

### Layout Structure
- Two-column desktop layout:
  - left sidebar navigation
  - right scrolling content area
- Mobile collapses to a vertical stack with the same sections.
- Sidebar contains:
  - brand block
  - three navigation buttons
  - logout button
- Main content changes by internal tab:
  - overview
  - users
  - categories

### Components
- `AdminDashboard` from [`client/src/components/admin/AdminDashboard.tsx`](./client/src/components/admin/AdminDashboard.tsx)
  - Overview tab:
    - total users card
    - server uptime card
    - database size card
    - database backup card
  - Users tab:
    - user table
    - user summary detail card
    - raw tables inspection card
    - raw table data table
  - Categories tab:
    - add category input/button
    - editable category table
  - Interactive elements:
    - overview/users/categories nav buttons
    - logout
    - download database backup
    - view summary
    - inspect raw tables
    - inspect raw table rows
    - delete user
    - add/update/delete category
  - Data shown:
    - analytics totals
    - system health and uptime
    - database size
    - user list with income, expense, balance, unpaid split count and totals, last active time
    - selected user monthly summary with income, expenses, unpaid splits
    - raw table contents
    - category IDs and names
  - Charts/graphs:
    - none
    - the admin screen is table and card driven
- `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`
- `Button`, `Input`, `Badge`, `Table`

### Navigation Flow
- Overview, Users, and Categories switch panels in place.
- Clicking a user row opens the user summary.
- Clicking Raw tables opens table listing for that user.
- Clicking a table name opens the table row data.
- Category changes broadcast a storage/event update so the user app refreshes category data.
- Logout clears `admin_token` and returns to the admin login screen.

## Legacy / Unwired Components

These files exist in the codebase but are not part of the active dispatcher path in `App.tsx`. They should be treated as legacy UI unless the app is reworked to use them again.

### `client/src/components/Auth.tsx`
- Legacy Google-only auth card.
- Single button login flow.
- Uses `AuthContext` from [`client/src/context/AuthContext.tsx`](./client/src/context/AuthContext.tsx).

### `client/src/components/Income.tsx`
- Legacy income page.
- Contains its own add/edit dialog and table layout.
- Uses old CSS from [`client/src/components/Income.css`](./client/src/components/Income.css).

### `client/src/components/Expenses.tsx`
- Legacy expense page.
- Contains its own add/edit form and table layout.
- Uses old CSS from [`client/src/components/Income.css`](./client/src/components/Income.css).

### `client/src/components/Splits.tsx`
- Legacy split page.
- Contains a split form, preview block, and split history table.
- Uses old CSS from [`client/src/components/Income.css`](./client/src/components/Income.css) and [`client/src/components/Splits.css`](./client/src/components/Splits.css).

### `client/src/components/Friends.tsx`
- Legacy friends page.
- Contains add friend form and friend balance cards.
- Uses old CSS from [`client/src/components/Friends.css`](./client/src/components/Friends.css).

### `client/src/components/Navbar.tsx`
- Legacy top navigation bar.
- Uses React Router links to `/`, `/income`, `/expenses`, `/splits`, `/friends`.
- Styled by [`client/src/components/Navbar.css`](./client/src/components/Navbar.css).

### `client/src/components/SkeletonLoader.tsx`
- Generic loading skeleton screen for the active app shell.

### `client/src/components/figma/ImageWithFallback.tsx`
- Image wrapper with fallback graphic when loading fails.

### Legacy stylesheet files
- [`client/src/App.css`](./client/src/App.css)
- [`client/src/components/Auth.css`](./client/src/components/Auth.css)
- [`client/src/components/Dashboard.css`](./client/src/components/Dashboard.css)
- [`client/src/components/Friends.css`](./client/src/components/Friends.css)
- [`client/src/components/Income.css`](./client/src/components/Income.css)
- [`client/src/components/Navbar.css`](./client/src/components/Navbar.css)
- [`client/src/components/Splits.css`](./client/src/components/Splits.css)

These files define an older UI system and do not control the current tabbed shell except where the legacy components above are still rendered directly.

## Shared UI Primitives Present In Codebase

The active UI uses a small subset of the shared primitive library directly. The rest are present in the repository but are not wired into the current routes.

### Primitives used by active screens
- `Button` from [`client/src/components/ui/button.tsx`](./client/src/components/ui/button.tsx)
- `Card` family from [`client/src/components/ui/card.tsx`](./client/src/components/ui/card.tsx)
- `Dialog` family from [`client/src/components/ui/dialog.tsx`](./client/src/components/ui/dialog.tsx)
- `Tabs` family from [`client/src/components/ui/tabs.tsx`](./client/src/components/ui/tabs.tsx)
- `DropdownMenu` family from [`client/src/components/ui/dropdown-menu.tsx`](./client/src/components/ui/dropdown-menu.tsx)
- `Avatar` family from [`client/src/components/ui/avatar.tsx`](./client/src/components/ui/avatar.tsx)
- `Input` from [`client/src/components/ui/input.tsx`](./client/src/components/ui/input.tsx)
- `Label` from [`client/src/components/ui/label.tsx`](./client/src/components/ui/label.tsx)
- `Textarea` from [`client/src/components/ui/textarea.tsx`](./client/src/components/ui/textarea.tsx)
- `Select` family from [`client/src/components/ui/select.tsx`](./client/src/components/ui/select.tsx)
- `Badge` from [`client/src/components/ui/badge.tsx`](./client/src/components/ui/badge.tsx)
- `Progress` from [`client/src/components/ui/progress.tsx`](./client/src/components/ui/progress.tsx)
- `Table` family from [`client/src/components/ui/table.tsx`](./client/src/components/ui/table.tsx)
- `InputOTP` family from [`client/src/components/ui/input-otp.tsx`](./client/src/components/ui/input-otp.tsx)
- `Skeleton` from [`client/src/components/ui/skeleton.tsx`](./client/src/components/ui/skeleton.tsx)
- `Separator` from [`client/src/components/ui/separator.tsx`](./client/src/components/ui/separator.tsx)
- `Toaster` from [`client/src/components/ui/sonner.tsx`](./client/src/components/ui/sonner.tsx)

### Primitives present but not currently wired into active screens
- `accordion`
- `alert`
- `alert-dialog`
- `aspect-ratio`
- `breadcrumb`
- `calendar`
- `carousel`
- `chart`
- `checkbox`
- `collapsible`
- `command`
- `context-menu`
- `drawer`
- `form`
- `hover-card`
- `menubar`
- `navigation-menu`
- `pagination`
- `popover`
- `radio-group`
- `resizable`
- `scroll-area`
- `sheet`
- `sidebar`
- `slider`
- `switch`
- `toggle`
- `toggle-group`
- `tooltip`

These are reusable design-system controls that do not affect the current screens unless imported.

## Current Visual System

### Color Palette

The app is overwhelmingly dark glass with neon accents. Colors come from three sources:
- explicit hex values in CSS and inline styles
- Tailwind utility colors
- opacity overlays on white, slate, and accent colors

#### Base surfaces
- `#09090b`
  - admin root background
  - admin login background
  - loading fallback background
- `#0f172a`
  - mesh background container
  - privacy policy panel
  - older auth surface
- `#020617`
  - Tailwind `slate-950`
  - used across dark dialogs and dropdowns
- `rgba(255,255,255,0.05)` to `rgba(255,255,255,0.20)`
  - glass fills for cards, buttons, menu triggers, inputs, and pills

#### Explicit hex values used in the code
- `#ffffff`
  - text, icon, and surface contrast across the app
- `#1f2937`
  - legacy Google button text in `Auth.tsx`
- `#646cffaa`
  - legacy Vite logo shadow in `App.css`
- `#61dafbaa`
  - legacy React logo shadow in `App.css`
- `#888888`
  - legacy muted text in `App.css`
- `#818cf8`
  - legacy auth title gradient start in `Auth.css`
- `#8b5cf6`
  - legacy auth title gradient end in `Auth.css`
- `#fca5a5`
  - legacy error badge text in `Auth.css` and `Income.css`
- `#6ee7b7`
  - success accents in legacy CSS
- `#fcd34d`
  - legacy unpaid badge / warning accent
- `#10b981`
  - success green in legacy CSS
- `#ef4444`
  - danger red in legacy CSS
- `#3b82f6`
  - blue accents in the mesh blob and several modern actions
- `#ec4899`
  - pink mesh blob and accent gradients
- `#a855f7`
  - purple mesh / button / avatar fallback gradients
- `#f97316`
  - orange split and warning accent
- `#f59e0b`
  - amber split and warning accent
- `#22c55e`
  - green success actions
- `#06b6d4`
  - cyan settings/report accents
- `#6366f1`
  - indigo legacy navbar accent and admin buttons
- `#ef4444`
  - red danger actions and admin brand accents

#### Tailwind accent mappings used heavily
- Purple / pink:
  - `from-purple-500 to-pink-500`
  - used for auth CTA buttons, avatar fallback, some password flows
- Red / pink:
  - `from-red-500 to-pink-500`
  - used for expense creation
- Blue / indigo:
  - `from-blue-500 to-indigo-500`
  - used for friend creation
- Orange / amber:
  - `from-orange-500 to-amber-500`
  - used for split creation
- Green / emerald:
  - `from-green-500 to-emerald-500`
  - used for income creation and positive financial indicators
- Cyan:
  - `bg-cyan-500`
  - used for settings budget actions
- Emerald / rose / orange status fills:
  - used for reminder enablement, balance states, unpaid states, and report badges

### Liquid Glass Effect

The active visual language is a layered glass treatment. The recurring pattern is:
- dark blurred background
- translucent white fill
- thin white border
- heavy blur
- soft outer shadow
- occasional inner border or accent gradient

#### Main shell glass
- `rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/10`
- used for the authenticated shell header block

#### Card glass
- `border-white/20 bg-white/10 backdrop-blur-xl`
- used on dashboard cards, settings cards, and several list surfaces

#### Deeper glass / dense dark glass
- `bg-slate-950/95 border-white/15 backdrop-blur-xl`
- used for dropdown menus and dialogs
- `bg-slate-900/95 border-white/20 backdrop-blur-xl`
- used for create/edit modals
- `bg-black/70 backdrop-blur-sm`
- used for auth overlays

#### Admin glass
- `backdrop-blur-2xl bg-white/5 border-white/10 shadow-2xl`
- used on the admin login card
- `bg-white/5 border-white/10 backdrop-blur-xl`
- used on admin overview and management cards

#### Mesh background
- full-screen fixed container
- three radial-gradient blobs with `filter: blur(80px)`
- animated transform loops with different durations

#### Dialog and input surface specifics
- dialogs commonly use:
  - `border-white/15`
  - `bg-slate-950`
  - `bg-slate-900/95`
  - `shadow-lg`
- inputs commonly use:
  - `bg-white/10`
  - `border-white/20`
  - `text-white`
- OTP slots use:
  - `bg-white/10`
  - `data-[active=true]:bg-white/15`
  - `data-[active=true]:ring-[3px]`

### Typography

#### Global baseline from [`client/src/styles/theme.css`](./client/src/styles/theme.css)
- Base font size: `16px`
- No custom `font-family` is defined in the codebase, so the app relies on the browser/system sans stack.
- Default semantic sizes:
  - `h1`: `2xl`, weight `500`
  - `h2`: `xl`, weight `500`
  - `h3`: `lg`, weight `500`
  - `h4`: `base`, weight `500`
  - `label`: `base`, weight `500`
  - `button`: `base`, weight `500`
  - `input`: `base`, weight `400`

#### Component-level overrides
- Page titles frequently use `text-2xl font-bold tracking-tight`.
- Section headings often use `text-white` with no extra weight override, relying on the global semantic defaults.
- Values and totals commonly use:
  - `text-2xl`
  - `text-3xl`
  - `font-semibold`
  - `font-bold`
- Supporting text commonly uses:
  - `text-sm`
  - `text-xs`
  - `text-gray-400`
  - `text-slate-400`

### Spacing and Radius Conventions

#### Spacing
- Main shell padding: `p-4 md:p-8`
- Section stacks: `space-y-6` and `space-y-4`
- Cards usually use `p-4`, `p-6`, or `p-8`
- Grid gaps commonly use `gap-4`, `gap-6`, or `gap-8`
- Modal content uses `space-y-4` or `space-y-5`
- Header paddings typically use `px-4 py-4 md:px-6`

#### Radius
- Global large cards: `rounded-3xl`
- Main cards and dialogs: `rounded-2xl`
- Inner panels: `rounded-xl`
- Inputs and buttons: `rounded-md`
- Pills and avatars: `rounded-full`
- Small chips and badges: `rounded-md` or `rounded-sm`

#### Depth
- Outer shell and important cards use `shadow-2xl`.
- Buttons often add a colored shadow with reduced opacity.
- Hover states usually deepen the fill slightly rather than moving layout.

## Constraints For Redesign

- DO NOT change any card, component, feature, page structure, navigation, or data shown.
- DO NOT add new features.
- DO NOT remove any features.
- DO NOT rearrange the layout.
- DO NOT alter the flow between routes, tabs, dropdowns, dialogs, or buttons.
- ONLY the color palette and the liquid glass effect may be changed.
- Only restyle blur, opacity, depth, and refraction behavior.
- This document is a restyle brief, not a redesign brief.
- Every page must remain functionally and content-wise identical after the restyle.

