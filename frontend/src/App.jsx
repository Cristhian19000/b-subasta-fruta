/**
 * Componente principal de la aplicación.
 * 
 * Configura el enrutamiento y el proveedor de autenticación.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import { Layout } from './components/layout';
import { Login } from './pages/auth';
import { Home } from './pages/home';
import { Clientes } from './pages/clientes';
import { Usuarios } from './pages/usuarios';
import { Packing, Empresas, TiposFruta } from './pages/packing';
import { Subastas } from './pages/subastas';
import { Reportes } from './pages/reportes';
import Perfiles from './pages/perfiles/Perfiles';
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
                        {/* Página de inicio - requiere permiso dashboard */}
                        <Route index element={
                            <ProtectedRoute requirePermission={['dashboard', 'view_dashboard']}>
                                <Home />
                            </ProtectedRoute>
                        } />

                        {/* Módulo de clientes - requiere permiso view_list */}
                        <Route path="clientes" element={
                            <ProtectedRoute requirePermission={['clientes', 'view_list']}>
                                <Clientes />
                            </ProtectedRoute>
                        } />

                        {/* Módulo de packing - requiere permiso view_list */}
                        <Route path="packing" element={
                            <ProtectedRoute requirePermission={['packing', 'view_list']}>
                                <Packing />
                            </ProtectedRoute>
                        } />

                        {/* Módulo de subastas - requiere permiso view_list */}
                        <Route path="subastas" element={
                            <ProtectedRoute requirePermission={['subastas', 'view_list']}>
                                <Subastas />
                            </ProtectedRoute>
                        } />

                        {/* Catálogos de packing */}
                        <Route path="empresas" element={
                            <ProtectedRoute requirePermission={['catalogos', 'view_empresas']}>
                                <Empresas />
                            </ProtectedRoute>
                        } />
                        <Route path="tipos-fruta" element={
                            <ProtectedRoute requirePermission={['catalogos', 'view_tipos_fruta']}>
                                <TiposFruta />
                            </ProtectedRoute>
                        } />

                        {/* Módulo de reportes - requiere al menos un permiso de reporte */}
                        <Route path="reportes" element={
                            <ProtectedRoute>
                                <Reportes />
                            </ProtectedRoute>
                        } />

                        {/* Módulo de usuarios */}
                        <Route path="usuarios" element={
                            <ProtectedRoute requirePermission={['usuarios', 'view_list']}>
                                <Usuarios />
                            </ProtectedRoute>
                        } />

                        {/* Módulo de perfiles de permisos */}
                        <Route path="perfiles" element={
                            <ProtectedRoute requirePermission={['usuarios', 'view_perfiles']}>
                                <Perfiles />
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
