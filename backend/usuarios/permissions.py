"""
Helpers y clases para verificación de permisos en el sistema RBAC.

Este módulo proporciona funciones y clases para verificar permisos granulares
basados en los perfiles de permiso asignados a cada usuario.
"""

from rest_framework.permissions import BasePermission
from functools import wraps
from rest_framework.exceptions import PermissionDenied


def tiene_permiso(usuario, modulo, permiso):
    """
    Verifica si un usuario tiene un permiso específico en un módulo.
    
    Soporta formatos de permisos JSON como listas o diccionarios.
    Implementa lógica jerárquica: manage_* implica view_*
    """
    if not usuario or not usuario.is_authenticated:
        return False

    # 1. Superusuario de Django siempre tiene acceso
    if usuario.is_superuser:
        return True
    
    # 2. Obtener el perfil del usuario utilizando getattr para mayor seguridad
    perfil = getattr(usuario, 'perfil', None)
    if not perfil:
        return False
        
    # 3. Administradores del sistema tienen acceso total
    if perfil.es_administrador:
        return True
    
    # 4. Verificar si tiene perfil de permisos asignado
    perfil_permiso = perfil.perfil_permiso
    if not perfil_permiso or not perfil_permiso.activo:
        return False
    
    # 5. Perfil marcado como superusuario = acceso total
    if perfil_permiso.es_superusuario:
        return True
    
    # 6. Verificar permiso específico en el módulo (soporta formato lista o diccionario)
    permisos_json = perfil_permiso.permisos or {}
    permisos_modulo = permisos_json.get(modulo, [])
    
    # Helper para verificar si tiene un permiso
    def _tiene_permiso_directo(perm):
        if isinstance(permisos_modulo, dict):
            # Formato: {"view_list": true, "create": false}
            return permisos_modulo.get(perm, False) is True
        elif isinstance(permisos_modulo, list):
            # Formato: ["view_list", "create"]
            return perm in permisos_modulo
        return False
    
    # 7. LÓGICA JERÁRQUICA: manage_* implica view_*
    # Si tiene permiso directo, permitir
    if _tiene_permiso_directo(permiso):
        return True
    
    # Si pide view_* y tiene manage_*, permitir
    if permiso.startswith('view_'):
        # Extraer el sufijo (ej: "view_empresas" -> "empresas")
        sufijo = permiso[5:]  # Remover "view_"
        manage_permiso = f"manage_{sufijo}"
        if _tiene_permiso_directo(manage_permiso):
            return True
    
    # 8. Lógica implícita: Si pides 'view_list' y tienes cualquier permiso en el módulo, se permite.
    # Esto es consistente con la lógica del frontend y necesario para navegar.
    if permiso == 'view_list' and len(permisos_modulo) > 0:
        return True
    
    return False



def requiere_permiso(modulo, permiso):
    """
    Decorador para proteger actions en ViewSets con logging detallado.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            if not tiene_permiso(request.user, modulo, permiso):
                print(f"[RBAC Decorator] DENEGADO: {request.user.username} -> {modulo}.{permiso}")
                raise PermissionDenied(
                    f'No tienes permiso para realizar esta acción. Se requiere: {modulo}.{permiso}'
                )
            return func(self, request, *args, **kwargs)
        return wrapper
    return decorator


class TienePermisoModulo(BasePermission):
    """
    Verifica que el usuario tenga al menos UN permiso en el módulo.
    """
    def has_permission(self, request, view):
        modulo = getattr(view, 'modulo_permiso', None)
        if not modulo:
            return False
        
        if request.user.is_superuser:
            return True
        
        perfil = getattr(request.user, 'perfil', None)
        if perfil and perfil.es_administrador:
            return True
            
        if not perfil or not perfil.perfil_permiso:
            return False
            
        permisos = perfil.perfil_permiso.permisos or {}
        permisos_modulo = permisos.get(modulo, [])
        return len(permisos_modulo) > 0


class SoloAdministradores(BasePermission):
    """
    Solo permite acceso a administradores.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        perfil = getattr(request.user, 'perfil', None)
        return perfil.es_administrador if perfil else False


class RBACPermission(BasePermission):
    """
    Permission class robusta para RBAC adaptable a ViewSets.
    """
    DEFAULT_MAPPING = {
        'list': 'view_list',
        'retrieve': 'view_detail',
        'create': 'create',
        'update': 'update',
        'partial_update': 'update',
        'destroy': 'delete',
    }
    
    def has_permission(self, request, view):
        # 1. Autenticación básica
        if not request.user or not request.user.is_authenticated:
            return False
            
        # 2. Verificar si es un Cliente (app móvil) - Los clientes no usan RBAC
        # Los clientes solo pueden acceder a sus propios endpoints específicos
        if not hasattr(request.user, 'is_superuser'):
            # Es un Cliente, no aplicar RBAC (los endpoints de Cliente manejan sus propios permisos)
            return True
            
        # 3. Superusuario de Django tiene acceso total
        if request.user.is_superuser:
            return True
            
        # 3. Administradores del sistema tienen acceso total
        perfil = getattr(request.user, 'perfil', None)
        if perfil and perfil.es_administrador:
            return True
            
        # 4. Obtener el módulo desde el view
        modulos = getattr(view, 'modulo_permiso', None)
        if not modulos:
            # Si el ViewSet no define módulo, denegamos por seguridad (excepto para superusers)
            print(f"[RBAC] DENEGADO: ViewSet {view.__class__.__name__} no define modulo_permiso")
            return False
            
        # Convertir a lista si es un string para manejarlo uniformemente
        if isinstance(modulos, str):
            modulos = [modulos]
            
        # 5. Obtener la acción
        action = getattr(view, 'action', None)
        if not action:
            # Si no hay acción (ej: metadata/OPTIONS), permitimos el paso
            return True
            
        # 6. Buscar el permiso en el mapping
        mapping = getattr(view, 'permisos_mapping', self.DEFAULT_MAPPING)
        permiso = mapping.get(action)
        
        # 7. Si no hay mapeo, permitir passthrough para decoradores @requiere_permiso
        if not permiso:
            return True
            
        # 8. Verificación final: permitir si tiene permiso en CUALQUIERA de los módulos definidos
        # Convertir permiso a lista si es string para manejarlo uniformemente
        permisos_requeridos = permiso if isinstance(permiso, list) else [permiso]
        
        for modulo in modulos:
            # A. Intentar con el permiso específico mapeado (si es lista, basta con tener uno)
            for perm in permisos_requeridos:
                if tiene_permiso(request.user, modulo, perm):
                    return True
            
            # B. Fallback para acciones de lectura: si tienes 'view_list' en el módulo,
            # puedes ejecutar acciones de visualización básica (list/retrieve).
            if action in ['list', 'retrieve'] and tiene_permiso(request.user, modulo, 'view_list'):
                return True
            
            # C. Auto-incluir view_reports si tiene algún permiso de generación de reportes
            if modulo == 'reportes' and permiso == 'view_reports':
                if (tiene_permiso(request.user, 'reportes', 'generate_auctions') or
                    tiene_permiso(request.user, 'reportes', 'generate_packings') or
                    tiene_permiso(request.user, 'reportes', 'generate_clients')):
                    return True
        
        print(f"[RBAC] DENEGADO: {request.user.username} -> {modulos}.{permiso} (Action: {action})")
        return False
