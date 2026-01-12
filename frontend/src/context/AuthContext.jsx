/**
 * Contexto de Autenticación.
 * 
 * Provee estado de autenticación y funciones de login/logout
 * a toda la aplicación.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

// Crear contexto
const AuthContext = createContext(null);

// Hook para usar el contexto
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
};

// Proveedor del contexto
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Verificar si hay sesión al cargar
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('access_token');
            const savedUser = localStorage.getItem('user');

            if (token && savedUser) {
                try {
                    // Verificar que el token sigue siendo válido
                    const response = await api.get('/auth/me/');
                    setUser(response.data);
                    localStorage.setItem('user', JSON.stringify(response.data));
                } catch (error) {
                    // Token inválido, limpiar sesión
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    // Función de login
    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login/', { username, password });
            const { user: userData, tokens } = response.data;

            // Guardar tokens
            localStorage.setItem('access_token', tokens.access);
            localStorage.setItem('refresh_token', tokens.refresh);
            localStorage.setItem('user', JSON.stringify(userData));

            setUser(userData);
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.error || 'Error al iniciar sesión';
            return { success: false, error: message };
        }
    };

    // Función de logout
    const logout = async () => {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            await api.post('/auth/logout/', { refresh: refreshToken });
        } catch (error) {
            // Ignorar errores de logout
        } finally {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            setUser(null);
        }
    };

    // Verificar si es administrador
    const isAdmin = () => {
        return user?.is_superuser || user?.es_administrador;
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAdmin,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
