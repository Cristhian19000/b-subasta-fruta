"""
Vistas para la API de Usuarios.

Este módulo contiene las vistas para autenticación y
gestión de usuarios trabajadores del sistema.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import PerfilUsuario, PerfilPermiso
from .serializers import (
    UsuarioSerializer,
    UsuarioListSerializer,
    LoginSerializer,
    UsuarioInfoSerializer,
    PerfilPermisoSerializer
)
from .permissions import SoloAdministradores, RBACPermission, requiere_permiso




@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Endpoint para iniciar sesión.
    
    POST /api/auth/login/
    Body: { "username": "...", "password": "..." }
    
    Retorna tokens JWT y datos del usuario.
    """
    serializer = LoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    username = serializer.validated_data['username']
    password = serializer.validated_data['password']
    
    # Verificar si el usuario existe primero
    try:
        user = User.objects.get(username=username)
        
        # Verificar si el usuario está activo
        if not user.is_active:
            return Response(
                {'error': 'Esta cuenta ha sido desactivada. Contacte al administrador del sistema.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verificar la contraseña
        if not user.check_password(password):
            return Response(
                {'error': 'Usuario o contraseña incorrectos.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
    except User.DoesNotExist:
        # Usuario no existe - usar el mismo mensaje que contraseña incorrecta por seguridad
        return Response(
            {'error': 'Usuario o contraseña incorrectos.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Generar tokens JWT
    refresh = RefreshToken.for_user(user)
    
    # Obtener información del usuario
    user_data = UsuarioInfoSerializer(user).data
    
    return Response({
        'message': 'Login exitoso',
        'user': user_data,
        'tokens': {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Endpoint para cerrar sesión.
    
    POST /api/auth/logout/
    Body: { "refresh": "..." }
    
    Invalida el refresh token.
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Logout exitoso'})
    except Exception:
        return Response({'message': 'Logout exitoso'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    Endpoint para obtener información del usuario autenticado.
    
    GET /api/auth/me/
    
    Retorna los datos del usuario actual.
    """
    user_data = UsuarioInfoSerializer(request.user).data
    return Response(user_data)


class UsuarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar usuarios trabajadores.
    
    Solo accesible por administradores con permisos de usuarios.
    
    Endpoints:
        - GET    /api/usuarios/          -> Listar usuarios
        - POST   /api/usuarios/          -> Crear usuario
        - GET    /api/usuarios/{id}/     -> Detalle de usuario
        - PUT    /api/usuarios/{id}/     -> Actualizar usuario
        - PATCH  /api/usuarios/{id}/     -> Actualizar parcialmente
        - DELETE /api/usuarios/{id}/     -> Eliminar usuario
    """
    
    queryset = User.objects.filter(is_superuser=False).select_related('perfil')
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated, RBACPermission]
    modulo_permiso = 'usuarios'
    
    permisos_mapping = {
        'list': 'view_usuarios',
        'retrieve': 'view_usuarios',
        'create': 'manage_usuarios',
        'update': 'manage_usuarios',
        'partial_update': 'manage_usuarios',
        'destroy': 'manage_usuarios',
        'activar': 'manage_usuarios',
        'cambiar_password': 'manage_usuarios',
    }
    
    def get_serializer_class(self):
        """Usar serializer simplificado para listados."""
        if self.action == 'list':
            return UsuarioListSerializer
        return UsuarioSerializer
    
    def update(self, request, *args, **kwargs):
        """Actualizar usuario - prevenir auto-bloqueo."""
        instance = self.get_object()
        
        # Prevenir que un usuario se edite a sí mismo si no es superusuario
        if instance.id == request.user.id and not request.user.is_superuser:
            return Response(
                {'error': 'No puedes editar tu propio usuario. Por seguridad, solicita a otro administrador que realice los cambios.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """Actualización parcial - prevenir auto-bloqueo."""
        instance = self.get_object()
        
        # Prevenir que un usuario se edite a sí mismo si no es superusuario
        if instance.id == request.user.id and not request.user.is_superuser:
            return Response(
                {'error': 'No puedes editar tu propio usuario. Por seguridad, solicita a otro administrador que realice los cambios.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Eliminar usuario (desactivar en lugar de eliminar)."""
        instance = self.get_object()
        
        # Prevenir que un usuario se desactive a sí mismo
        if instance.id == request.user.id:
            return Response(
                {'error': 'No puedes desactivar tu propio usuario.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance.is_active = False
        instance.save()
        return Response(
            {'message': 'Usuario desactivado correctamente'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    @requiere_permiso('usuarios', 'update')
    def activar(self, request, pk=None):
        """Activar un usuario desactivado."""
        usuario = self.get_object()
        usuario.is_active = True
        usuario.save()
        return Response({
            'message': 'Usuario activado correctamente',
            'usuario': UsuarioListSerializer(usuario).data
        })
    
    @action(detail=True, methods=['post'])
    @requiere_permiso('usuarios', 'update')
    def cambiar_password(self, request, pk=None):
        """Cambiar la contraseña de un usuario."""
        usuario = self.get_object()
        nueva_password = request.data.get('password')
        
        if not nueva_password:
            return Response(
                {'error': 'Debe proporcionar una contraseña'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        usuario.set_password(nueva_password)
        usuario.save()
        return Response({'message': 'Contraseña actualizada correctamente'})


class PerfilPermisoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar perfiles de permisos.
    
    Solo accesible por administradores con permisos de perfiles.
    
    Endpoints:
        - GET    /api/perfiles-permiso/                   -> Listar perfiles
        - POST   /api/perfiles-permiso/                   -> Crear perfil
        - GET    /api/perfiles-permiso/{id}/              -> Detalle de perfil
        - PUT    /api/perfiles-permiso/{id}/              -> Actualizar perfil
        - DELETE /api/perfiles-permiso/{id}/              -> Eliminar perfil
        - GET    /api/perfiles-permiso/estructura_permisos/ -> Estructura de permisos disponibles
    """
    
    queryset = PerfilPermiso.objects.all()
    serializer_class = PerfilPermisoSerializer
    permission_classes = [IsAuthenticated, RBACPermission]
    modulo_permiso = 'usuarios'
    permisos_mapping = {
        'list': 'view_perfiles',
        'retrieve': 'view_perfiles',
        'create': 'manage_perfiles',
        'update': 'manage_perfiles',
        'partial_update': 'manage_perfiles',
        'destroy': 'manage_perfiles',
        'estructura_permisos': 'view_perfiles',  # Necesario para ver la estructura al asignar
    }
    
    def perform_create(self, serializer):
        """Guardar quién creó el perfil."""
        # El campo creado_por espera un User, no un PerfilUsuario
        serializer.save(creado_por=self.request.user)
    
    @action(detail=False, methods=['get'])
    def estructura_permisos(self, request):
        """
        Retorna la estructura completa de módulos y permisos disponibles.
        
        GET /api/perfiles-permiso/estructura_permisos/
        
        Retorna un diccionario con todos los módulos del sistema y sus permisos.
        """
        estructura = {
            'dashboard': {
                'nombre': 'Dashboard',
                'icono': 'LayoutDashboard',
                'permisos': [
                    {'codigo': 'view_dashboard', 'nombre': 'Acceder al Dashboard'},
                    {'codigo': 'view_summary', 'nombre': 'Ver Resúmenes'},
                    {'codigo': 'view_tables', 'nombre': 'Ver Tablas'},
                    {'codigo': 'view_reports', 'nombre': 'Ver Reportes'}
                ]
            },
            'clientes': {
                'nombre': 'Clientes',
                'icono': 'Users',
                'permisos': [
                    {'codigo': 'view_list', 'nombre': 'Ver Listado'},
                    {'codigo': 'view_detail', 'nombre': 'Ver Detalle'},
                    {'codigo': 'create', 'nombre': 'Crear Cliente'},
                    {'codigo': 'update', 'nombre': 'Editar Cliente'},
                    {'codigo': 'delete', 'nombre': 'Eliminar Cliente'}
                ]
            },
            'packing': {
                'nombre': 'Packing',
                'icono': 'Package',
                'permisos': [
                    {'codigo': 'view_list', 'nombre': 'Ver Listado'},
                    {'codigo': 'view_detail', 'nombre': 'Ver Detalle'},
                    {'codigo': 'create', 'nombre': 'Crear Packing'},
                    {'codigo': 'update', 'nombre': 'Editar Packing'},
                    {'codigo': 'delete', 'nombre': 'Eliminar Packing'},
                    {'codigo': 'create_auction', 'nombre': 'Gestionar Subastas'}
                ]
            },
            'subastas': {
                'nombre': 'Subastas',
                'icono': 'Gavel',
                'permisos': [
                    {'codigo': 'view_list', 'nombre': 'Ver Listado'},
                    {'codigo': 'view_detail', 'nombre': 'Ver Detalle y Ofertas'},
                    {'codigo': 'create', 'nombre': 'Crear Subasta'},
                    {'codigo': 'update', 'nombre': 'Editar Subasta'},
                    {'codigo': 'cancel', 'nombre': 'Cancelar Subasta'}
                ]
            },
            'reportes': {
                'nombre': 'Reportes',
                'icono': 'FileText',
                'permisos': [
                    {'codigo': 'generate_clients', 'nombre': 'Generar Reporte de Clientes'},
                    {'codigo': 'generate_auctions', 'nombre': 'Generar Reporte de Subastas'},
                    {'codigo': 'generate_packings', 'nombre': 'Generar Reporte de Packings'}
                ]
            },
            'catalogos': {
                'nombre': 'Catálogos',
                'icono': 'Database',
                'permisos': [
                    {'codigo': 'view_empresas', 'nombre': 'Ver Empresas'},
                    {'codigo': 'manage_empresas', 'nombre': 'Gestionar Empresas'},
                    {'codigo': 'view_tipos_fruta', 'nombre': 'Ver Tipos de Fruta'},
                    {'codigo': 'manage_tipos_fruta', 'nombre': 'Gestionar Tipos de Fruta'}
                ]
            },
            'usuarios': {
                'nombre': 'Usuarios y Perfiles',
                'icono': 'UserCog',
                'permisos': [
                    {'codigo': 'view_usuarios', 'nombre': 'Ver Usuarios'},
                    {'codigo': 'manage_usuarios', 'nombre': 'Gestionar Usuarios'},
                    {'codigo': 'view_perfiles', 'nombre': 'Ver Perfiles de Permisos'},
                    {'codigo': 'manage_perfiles', 'nombre': 'Gestionar Perfiles de Permisos'}
                ]
            }
        }
        
        return Response(estructura)
