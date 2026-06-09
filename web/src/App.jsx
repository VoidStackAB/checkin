import { Routes, Route } from 'react-router-dom';
import GatedApp from './GatedApp.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import ReportPage from './pages/ReportPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/report" element={<ReportPage />} />
      <Route path="/*" element={<GatedApp />} />
    </Routes>
  );
}
