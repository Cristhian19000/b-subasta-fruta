/**
 * Hook personalizado para verificar permisos de usuario.
 * 
 * Uso:
 *   const { hasPermission } = usePermissions();
 *   if (hasPermission('clientes', 'create')) {
 *     // Mostrar botón de crear
 *   }
 */

import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

export const usePermissions = () => {
    const { user, loading } = useContext(AuthContext);

    /**
     * Verifica si el usuario tiene un permiso específico.
     * 
     * @param {string} modulo - Código del módulo (ej: 'clientes', 'packing')
     * @param {string} permiso - Código del permiso (ej: 'view_list', 'create')
     * @returns {boolean} - true si tiene permiso, false en caso contrario
     */
    const hasPermission = (modulo, permiso) => {
        // Sin usuario autenticado = sin permisos
        if (!user) return false;

        // Superusuario de Django tiene acceso total
        if (user.is_superuser) return true;

        // Verificar perfil de permisos
        if (!user.perfil_permiso) return false;

        // Perfil marcado como superusuario = acceso total
        if (user.perfil_permiso.es_superusuario) return true;

        // Verificar permiso específico en el módulo
        const permisos = user.perfil_permiso.permisos || {};
        const permisosModulo = permisos[modulo] || [];

        // Lógica implícita: Si tienes cualquier permiso en el módulo,
        // automáticamente tienes view_list (necesitas ver el listado para hacer cualquier acción)
        if (permiso === 'view_list' && permisosModulo.length > 0) {
            return true;
        }

        return permisosModulo.includes(permiso);
    };

    /**
     * Verifica si el usuario tiene al menos UN permiso en un módulo.
     * 
     * @param {string} modulo - Código del módulo
     * @returns {boolean} - true si tiene al menos un permiso
     */
    const hasModuleAccess = (modulo) => {
        if (!user) return false;
        if (user.is_superuser) return true;
        if (!user.perfil_permiso) return false;
        if (user.perfil_permiso.es_superusuario) return true;

        const permisos = user.perfil_permiso.permisos || {};
        const permisosModulo = permisos[modulo] || [];

        return permisosModulo.length > 0;
    };

    /**
     * Verifica si el usuario es administrador.
     * 
     * @returns {boolean}
     */
    const isAdmin = () => {
        if (!user) return false;
        return user.is_superuser || user.perfil_permiso?.es_superusuario;
    };

    return {
        hasPermission,
        hasModuleAccess,
        isAdmin,
        user,
        loading
    };
};

export default usePermissions;
