/**
 * Componente principal de la aplicación.
 * 
 * Configura el enrutamiento y el proveedor de autenticación.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Layout } from './components/layout';
import { Login } from './pages/auth';
import { Home } from './pages/home';
import { Clientes } from './pages/clientes';
import { Usuarios } from './pages/usuarios';
import { Packing, Empresas, TiposFruta } from './pages/packing';
import './index.css';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Ruta pública: Login */}
                    <Route path="/login" element={<Login />} />
                    
                    {/* Rutas protegidas: Dashboard con Layout */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }>
                        {/* Página de inicio */}
                        <Route index element={<Home />} />
                        
                        {/* Módulo de clientes (todos) */}
                        <Route path="clientes" element={<Clientes />} />
                        
                        {/* Módulo de packing (todos) */}
                        <Route path="packing" element={<Packing />} />
                        
                        {/* Catálogos de packing (solo admin) */}
                        <Route path="empresas" element={
                            <ProtectedRoute requireAdmin>
                                <Empresas />
                            </ProtectedRoute>
                        } />
                        <Route path="tipos-fruta" element={
                            <ProtectedRoute requireAdmin>
                                <TiposFruta />
                            </ProtectedRoute>
                        } />
                        
                        {/* Módulo de usuarios (solo admin) */}
                        <Route path="usuarios" element={
                            <ProtectedRoute requireAdmin>
                                <Usuarios />
                            </ProtectedRoute>
                        } />
                    </Route>
                    
                    {/* Redirección por defecto */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
