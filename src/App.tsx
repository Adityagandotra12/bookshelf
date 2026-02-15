import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Shelves } from './pages/Shelves';
import { ShelfDetail } from './pages/ShelfDetail';
import { BookDetail } from './pages/BookDetail';
import { AddBook } from './pages/AddBook';
import { Search } from './pages/Search';
import { Profile } from './pages/Profile';
import { UsersList } from './pages/UsersList';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<Navigate to="/" replace />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
              <Route path="shelves" element={<ProtectedRoute><Shelves /></ProtectedRoute>} />
              <Route path="shelves/:shelfId" element={<ProtectedRoute><ShelfDetail /></ProtectedRoute>} />
              <Route path="books/new" element={<ProtectedRoute><AddBook /></ProtectedRoute>} />
              <Route path="books/:bookId" element={<ProtectedRoute><BookDetail /></ProtectedRoute>} />
              <Route path="search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
              <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute><UsersList /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
