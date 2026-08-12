import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Templates from "./pages/Templates";
import TemplateEditor from "./pages/TemplateEditor";
import TemplatePosters from "./pages/TemplatePosters";
import VideoTemplates from "./pages/VideoTemplates";
import VideoTemplateEditor from "./pages/VideoTemplateEditor";
import Banners from "./pages/Banners";
import News from "./pages/News";
import Categories from "./pages/Categories";
import ScheduleManager from "./pages/ScheduleManager";
import AppSettings from "./pages/AppSettings";
import Notifications from "./pages/Notifications";
import PricingPlans from "./pages/PricingPlans";

// Simple Settings mockup
const Settings = () => (
  <div className="animate-in fade-in duration-500">
    <h1 className="text-2xl sm:text-3xl font-bold text-ink">Settings</h1>
    <p className="text-slate-500 mt-1">Configure your platform preferences.</p>
    <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-white rounded-2xl border border-brand-100 shadow-sm max-w-2xl">
      <h3 className="text-lg font-bold text-ink mb-4">
        Profile Information
      </h3>
      <p className="text-slate-500 text-sm mb-6">
        Update your account details and email address.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Company Name
          </label>
          <input
            type="text"
            defaultValue="BJP Karyakarta"
            className="w-full px-4 py-2 border border-brand-100 rounded-xl bg-sand text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Support Email
          </label>
          <input
            type="text"
            defaultValue="support@bjpkaryakarta.in"
            className="w-full px-4 py-2 border border-brand-100 rounded-xl bg-sand text-sm"
          />
        </div>
        <button className="w-full sm:w-auto bg-primary-600 text-white px-6 py-2.5 rounded-xl font-bold mt-4 shadow-lg shadow-primary-100 transition-transform active:scale-95">
          Save Changes
        </button>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={
                <Layout>
                  <Dashboard />
                </Layout>
              }
            />
            <Route
              path="/templates"
              element={
                <Layout>
                  <Templates />
                </Layout>
              }
            />
            <Route
              path="/video-templates"
              element={
                <Layout>
                  <VideoTemplates />
                </Layout>
              }
            />
            <Route
              path="/templates-poster"
              element={
                <Layout>
                  <TemplatePosters />
                </Layout>
              }
            />
            <Route
              path="/banners"
              element={
                <Layout>
                  <Banners />
                </Layout>
              }
            />
            <Route
              path="/news"
              element={
                <Layout>
                  <News />
                </Layout>
              }
            />
            {/* Full-page editors — outside Layout so Design/Upload sidebar is never clipped */}
            <Route path="/templates/create" element={<TemplateEditor />} />
            <Route path="/templates/edit/:id" element={<TemplateEditor />} />
            <Route path="/video-templates/create" element={<VideoTemplateEditor />} />
            <Route path="/video-templates/edit/:id" element={<VideoTemplateEditor />} />
            <Route
              path="/users"
              element={
                <Layout>
                  <Users />
                </Layout>
              }
            />
            <Route
              path="/pricing-plans"
              element={
                <Layout>
                  <PricingPlans />
                </Layout>
              }
            />
            <Route
              path="/categories"
              element={
                <Layout>
                  <Categories />
                </Layout>
              }
            />
            <Route
              path="/schedule"
              element={
                <Layout>
                  <ScheduleManager />
                </Layout>
              }
            />
            <Route
              path="/notifications"
              element={
                <Layout>
                  <Notifications />
                </Layout>
              }
            />
            <Route
              path="/settings"
              element={
                <Layout>
                  <AppSettings />
                </Layout>
              }
            />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
