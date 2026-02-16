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
        } catch (error) {
            // Manejo de errores específicos
            if (!error.response) {
                // Error de red (sin respuesta del servidor)
                throw new Error('No se pudo conectar con el servidor. Verifique su conexión a internet.');
            }

            const status = error.response.status;
            const data = error.response.data;

            // Errores HTTP específicos
            if (status === 401) {
                // Credenciales inválidas
                throw new Error(data?.error || data?.detail || 'Usuario o contraseña incorrectos.');
            } else if (status === 403) {
                // Cuenta bloqueada o sin permisos
                throw new Error(data?.error || data?.detail || 'Cuenta bloqueada o sin acceso.');
            } else if (status === 429) {
                // Demasiados intentos
                throw new Error('Demasiados intentos de inicio de sesión. Intente más tarde.');
            } else if (status >= 500) {
                // Error del servidor
                throw new Error('Error en el servidor. Por favor, intente más tarde.');
            } else {
                // Otros errores
                throw new Error(data?.error || data?.detail || 'Error al iniciar sesión. Intente nuevamente.');
            }
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

    // Verificar si es administrador (superuser de Django o perfil con es_superusuario)
    const isAdmin = () => {
        return user?.is_superuser || user?.perfil_permiso?.es_superusuario;
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
