/**
 * ProtectedRoute - Componente para proteger rutas basado en permisos.
 * 
 * Uso:
 *   <ProtectedRoute requirePermission={['clientes', 'view_list']}>
 *     <Clientes />
 *   </ProtectedRoute>
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ children, requirePermission, requireAdmin = false }) => {
    const { hasPermission, isAdmin, user, loading } = usePermissions();

    // Mostrar nada mientras se verifica la autenticación
    if (loading) {
        return null;
    }

    // Verificar si el usuario está autenticado
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Verificar si requiere ser admin
    if (requireAdmin && !isAdmin()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
                    <p className="text-gray-600 mb-4">No tienes permisos de administrador para acceder a esta página.</p>
                    <button
                        onClick={() => window.history.back()}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                        ← Volver
                    </button>
                </div>
            </div>
        );
    }

    // Verificar permiso específico
    if (requirePermission) {
        const [modulo, permiso] = requirePermission;

        if (!hasPermission(modulo, permiso)) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <ShieldAlert className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
                        <p className="text-gray-600 mb-4">
                            No tienes permiso para acceder a este módulo.
                            <br />
                            <span className="text-sm text-gray-500">
                                Se requiere: <code className="bg-gray-100 px-2 py-1 rounded">{modulo}.{permiso}</code>
                            </span>
                        </p>
                        <button
                            onClick={() => window.history.back()}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                            ← Volver
                        </button>
                    </div>
                </div>
            );
        }
    }

    return children;
};

export default ProtectedRoute;
