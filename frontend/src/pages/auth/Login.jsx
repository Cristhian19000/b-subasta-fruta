import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFirstAvailableRoute } from '../../utils/navigation';
import axios from 'axios';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Estados para "Olvidaste tu contraseña"
    const [showForgot, setShowForgot] = useState(false);
    const [ruc_dni, setRucDni] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSuccess, setForgotSuccess] = useState('');
    const [forgotError, setForgotError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!username.trim()) {
                throw new Error('Por favor, ingrese su usuario.');
            }
            if (!password.trim()) {
                throw new Error('Por favor, ingrese su contraseña.');
            }

            await login(username, password);
            const userData = JSON.parse(localStorage.getItem('user'));
            const firstRoute = getFirstAvailableRoute(userData);
            navigate(firstRoute);
        } catch (err) {
            setError(err.message || 'Error al iniciar sesión. Por favor, intente nuevamente.');
            setPassword('');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setForgotError('');
        setForgotSuccess('');
        setForgotLoading(true);

        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            await axios.post(`${baseUrl}/api/clientes/recuperar-acceso/`, { ruc_dni });
            setForgotSuccess('datos enviados a soporte, pronto se pondran en contacto con usted');
            setRucDni('');
            // Podríamos cerrar el modal después de unos segundos
            setTimeout(() => {
                setShowForgot(false);
                setForgotSuccess('');
            }, 5000);
        } catch (err) {
            setForgotError(err.response?.data?.error || 'Error al enviar la solicitud.');
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 transition-all duration-300">
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

                {/* Formulario de Login */}
                {!showForgot ? (
                    <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm animate-in fade-in duration-500">
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

                            <div className="text-center mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForgot(true)}
                                    className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    /* Formulario de Recuperación */
                    <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm animate-in slide-in-from-right duration-300">
                        <h2 className="text-lg font-medium text-gray-900 mb-2">
                            Recuperar Acceso
                        </h2>
                        <p className="text-sm text-gray-500 mb-6">
                            Ingrese su DNI o RUC para solicitar ayuda a soporte técnico.
                        </p>

                        {forgotSuccess && (
                            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                                {forgotSuccess}
                            </div>
                        )}

                        {forgotError && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                                {forgotError}
                            </div>
                        )}

                        <form onSubmit={handleForgotSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    DNI o RUC
                                </label>
                                <input
                                    type="text"
                                    value={ruc_dni}
                                    onChange={(e) => setRucDni(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                                    placeholder="Ingrese su DNI o RUC"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={forgotLoading}
                                className="w-full py-2.5 px-4 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {forgotLoading ? 'Enviando...' : 'Enviar a Soporte'}
                            </button>

                            <div className="text-center mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForgot(false)}
                                    className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                                >
                                    Volver al inicio de sesión
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Footer */}
                <p className="mt-6 text-center text-xs text-gray-400">
                    © 2026 AgroSubasta. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
};

export default Login;
