/**
 * Componente Header - Barra superior con información del usuario.
 */

import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <header className="fixed top-0 left-64 right-0 z-30 h-16 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between h-full px-6">
                {/* Título o breadcrumb */}
                <div>
                    <h2 className="text-sm font-medium text-gray-500">
                        Panel de Administración
                    </h2>
                </div>

                {/* Usuario */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                            {user?.first_name || user?.username || 'Usuario'}
                        </p>
                        <p className="text-xs text-gray-500">
                            {user?.is_superuser 
                                ? 'Superusuario' 
                                : user?.perfil_permiso?.nombre || 'Sin perfil'}
                        </p>
                    </div>

                    {/* Avatar */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-600 font-medium text-sm">
                        {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                    </div>

                    {/* Botón cerrar sesión */}
                    <button
                        onClick={handleLogout}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        title="Cerrar sesión"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
