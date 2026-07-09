import { Route, BrowserRouter, Routes } from 'react-router-dom';
import Display from './pages/Display';
import Admin from './pages/Admin';
import AdminUsers from './pages/AdminUsers';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Display />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/users" element={<AdminUsers />} />
      </Routes>
    </BrowserRouter>
  );
}
