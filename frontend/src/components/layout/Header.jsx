/**
 * Componente Header - Barra superior con información del usuario.
 * Incluye soporte responsivo con botón hamburguesa para móviles.
 */

import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <header className="fixed top-0 left-0 lg:left-64 right-0 z-30 h-16 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between h-full px-4 sm:px-6">
                {/* Botón hamburguesa (solo móvil) + Título */}
                <div className="flex items-center gap-3">
                    {/* Botón hamburguesa - solo visible en móviles */}
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Abrir menú"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Título */}
                    <div>
                        <h2 className="text-sm font-medium text-gray-500 hidden sm:block">
                            Panel de Administración
                        </h2>
                        <h2 className="text-sm font-medium text-gray-900 sm:hidden">
                            AgroSubasta
                        </h2>
                    </div>
                </div>

                {/* Usuario */}
                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Info usuario - oculta en móviles muy pequeños */}
                    <div className="text-right hidden xs:block">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-none">
                            {user?.first_name || user?.username || 'Usuario'}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-none">
                            {user?.is_superuser 
                                ? 'Superusuario' 
                                : user?.perfil_permiso?.nombre || 'Sin perfil'}
                        </p>
                    </div>

                    {/* Avatar */}
                    <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 text-gray-600 font-medium text-sm flex-shrink-0">
                        {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                    </div>

                    {/* Botón cerrar sesión */}
                    <button
                        onClick={handleLogout}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
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
