/**
 * Página de Login - Autenticación de usuarios.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFirstAvailableRoute } from '../../utils/navigation';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Validaciones básicas del lado del cliente
            if (!username.trim()) {
                throw new Error('Por favor, ingrese su usuario.');
            }
            if (!password.trim()) {
                throw new Error('Por favor, ingrese su contraseña.');
            }

            await login(username, password);

            // Obtener datos del usuario para determinar la mejor ruta
            const userData = JSON.parse(localStorage.getItem('user'));
            const firstRoute = getFirstAvailableRoute(userData);

            navigate(firstRoute);
        } catch (err) {
            // Mostrar el mensaje de error
            setError(err.message || 'Error al iniciar sesión. Por favor, intente nuevamente.');

            // Limpiar la contraseña en caso de error
            setPassword('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-light text-gray-900 tracking-tight">
                        AgroSubasta
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Sistema de Gestión Agroindustrial
                    </p>
                </div>

                {/* Formulario */}
                <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-medium text-gray-900 mb-6">
                        Iniciar Sesión
                    </h2>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Usuario
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                                placeholder="Ingrese su usuario"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                                placeholder="Ingrese su contraseña"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 px-4 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="mt-6 text-center text-xs text-gray-400">
                    © 2026 AgroSubasta. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
};

export default Login;
