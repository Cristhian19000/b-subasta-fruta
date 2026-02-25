/**
 * Componente Sidebar - Menú lateral de navegación.
 * Incluye soporte responsivo con animaciones suaves.
 */

import { NavLink } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

const Sidebar = ({ isOpen, onClose }) => {
    const { hasPermission, isAdmin } = usePermissions();

    // Construir array de items del menú
    const buildMenuItems = () => {
        const items = [
            {
                name: 'Inicio',
                path: '/dashboard',
                requirePermission: ['dashboard', 'view_dashboard'],
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                ),
            },
            {
                name: 'Clientes',
                path: '/dashboard/clientes',
                requirePermission: ['clientes', 'view_list'],
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                ),
            },
            {
                name: 'Packing',
                path: '/dashboard/packing',
                requirePermission: ['packing', 'view_list'],
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                ),
            },
            {
                name: 'Subastas',
                path: '/dashboard/subastas',
                requirePermission: ['subastas', 'view_list'],
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
            },
            {
                name: 'Reportes',
                path: '/dashboard/reportes',
                requirePermission: ['reportes', 'view_module'],
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                ),
            },
            {
                name: 'Empresas',
                path: '/dashboard/empresas',
                requirePermission: ['catalogos', 'view_empresas'],
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                ),
            },
            {
                name: 'Tipos de Fruta',
                path: '/dashboard/tipos-fruta',
                requirePermission: ['catalogos', 'view_tipos_fruta'],
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                ),
            },
            {
                name: 'Usuarios',
                path: '/dashboard/usuarios',
                requirePermission: ['usuarios', 'view_list'],
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                ),
            },
            {
                name: 'Perfiles',
                path: '/dashboard/perfiles',
                requirePermission: ['usuarios', 'view_perfiles'],
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                ),
            },
        ];

        // Ya no necesitamos agregar items solo para admins - todos están basados en permisos

        return items;
    };

    const menuItems = buildMenuItems();

    // DEBUG: Ver qué permisos tiene el usuario
    console.log('=== SIDEBAR DEBUG ===');
    console.log('isAdmin():', isAdmin());
    console.log('Total menuItems:', menuItems.length);

    // Filtrar elementos del menú según permisos
    const visibleMenuItems = menuItems.filter(item => {
        console.log(`\nChecking item: ${item.name} (${item.path})`);
        console.log('  - adminOnly:', item.adminOnly);
        console.log('  - requirePermission:', item.requirePermission);

        // Admins ven todo
        if (isAdmin()) {
            console.log('  -> VISIBLE (is admin)');
            return true;
        }

        // Items solo para admin - ocultar si no es admin
        if (item.adminOnly) {
            console.log('  -> HIDDEN (adminOnly but not admin)');
            return false;
        }

        // CASO ESPECIAL: Reportes - mostrar si tiene cualquier permiso de reportes
        if (item.path === '/dashboard/reportes') {
            const hasAnyReportPermission =
                hasPermission('reportes', 'generate_auctions') ||
                hasPermission('reportes', 'generate_packings') ||
                hasPermission('reportes', 'generate_clients');
            console.log('  - Special case: Reportes (checking ANY report permission)');
            console.log(`  - Has any report permission: ${hasAnyReportPermission}`);
            if (hasAnyReportPermission) {
                console.log('  -> VISIBLE (has at least one report permission)');
            } else {
                console.log('  -> HIDDEN (no report permissions)');
            }
            return hasAnyReportPermission;
        }

        // Items con requirePermission - verificar
        if (item.requirePermission) {
            const [module, permission] = item.requirePermission;
            const hasAccess = hasPermission(module, permission);
            console.log(`  - Checking permission: ${module}.${permission}`);
            console.log(`  - Has access: ${hasAccess}`);
            if (hasAccess) {
                console.log('  -> VISIBLE (has permission)');
            } else {
                console.log('  -> HIDDEN (no permission)');
            }
            return hasAccess;
        }

        // Por defecto, no mostrar
        console.log('  -> HIDDEN (default)');
        return false;
    });

    console.log('\nVisible items:', visibleMenuItems.map(i => i.name));
    console.log('===================\n');

    return (
        <aside 
            className={`
                fixed left-0 top-0 z-50 h-screen w-64 bg-white border-r border-gray-200
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0
            `}
        >
            {/* Logo + Botón cerrar (móvil) */}
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-gray-200">
                <span className="text-xl font-semibold text-gray-900">
                    AgroSubasta
                </span>
                
                {/* Botón cerrar - solo visible en móviles */}
                <button
                    onClick={onClose}
                    className="lg:hidden p-2 -mr-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Cerrar menú"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Navigation - scrollable */}
            <nav className="flex flex-col gap-1 p-3 sm:p-4 overflow-y-auto h-[calc(100vh-4rem)]">
                {visibleMenuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/dashboard'}
                        onClick={onClose}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${isActive
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`
                        }
                    >
                        {item.icon}
                        <span className="truncate">{item.name}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
