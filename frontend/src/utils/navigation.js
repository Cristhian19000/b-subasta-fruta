/**
 * Utilidades para determinar rutas de redirección según permisos.
 */

/**
 * Obtiene la primera ruta disponible para un usuario según sus permisos.
 * @param {Object} user - Usuario autenticado
 * @returns {string} - Ruta a la que redirigir
 */
export const getFirstAvailableRoute = (user) => {
    // Superusuarios y admins siempre van al dashboard
    if (user?.is_superuser || user?.es_administrador) {
        return '/dashboard';
    }

    // Obtener permisos del usuario
    const permisos = user?.perfil_permiso?.permisos || {};

    // Lista de módulos en orden de prioridad
    const modulosDisponibles = [
        { ruta: '/dashboard', modulo: 'dashboard', permiso: 'view_dashboard' },
        { ruta: '/dashboard/clientes', modulo: 'clientes', permiso: 'view_list' },
        { ruta: '/dashboard/packing', modulo: 'packing', permiso: 'view_list' },
        { ruta: '/dashboard/subastas', modulo: 'subastas', permiso: 'view_list' },
        { ruta: '/dashboard/empresas', modulo: 'catalogos', permiso: 'view_empresas' },
        { ruta: '/dashboard/tipos-fruta', modulo: 'catalogos', permiso: 'view_tipos_fruta' },
        { ruta: '/dashboard/reportes', modulo: 'reportes', permiso: 'generate_auctions' },
        { ruta: '/dashboard/usuarios', modulo: 'usuarios', permiso: 'view_usuarios' },
        { ruta: '/dashboard/perfiles', modulo: 'usuarios', permiso: 'view_perfiles' },
    ];

    // Buscar el primer módulo al que tiene acceso
    for (const { ruta, modulo, permiso } of modulosDisponibles) {
        const permisosModulo = permisos[modulo];

        if (!permisosModulo) continue;

        // Verificar si tiene el permiso (puede ser array o diccionario)
        const tienePermiso = Array.isArray(permisosModulo)
            ? permisosModulo.includes(permiso)
            : permisosModulo[permiso] === true;

        if (tienePermiso) {
            return ruta;
        }
    }

    // Si no tiene acceso a ningún módulo, redirigir al dashboard
    // (mostrará el mensaje de sin permisos)
    return '/dashboard';
};
