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
from .models import PerfilUsuario
from .serializers import (
    UsuarioSerializer,
    UsuarioListSerializer,
    LoginSerializer,
    UsuarioInfoSerializer
)


class EsAdministrador(permissions.BasePermission):
    """
    Permiso personalizado que solo permite acceso a administradores.
    
    Un administrador es:
    - Un superusuario de Django
    - Un usuario con perfil.es_administrador = True
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if hasattr(request.user, 'perfil'):
            return request.user.perfil.es_administrador
        return False


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
    
    # Autenticar usuario
    user = authenticate(username=username, password=password)
    
    if user is None:
        return Response(
            {'error': 'Credenciales inválidas'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user.is_active:
        return Response(
            {'error': 'Usuario desactivado'},
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
    
    Solo accesible por administradores.
    
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
    permission_classes = [IsAuthenticated, EsAdministrador]
    
    def get_serializer_class(self):
        """Usar serializer simplificado para listados."""
        if self.action == 'list':
            return UsuarioListSerializer
        return UsuarioSerializer
    
    def destroy(self, request, *args, **kwargs):
        """Eliminar usuario (desactivar en lugar de eliminar)."""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(
            {'message': 'Usuario desactivado correctamente'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
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
