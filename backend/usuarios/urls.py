"""
Configuración de URLs para la API de Usuarios.

Incluye rutas de autenticación y gestión de usuarios.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UsuarioViewSet,
    PerfilPermisoViewSet,
    login_view,
    logout_view,
    me_view
)

# Router para ViewSets
router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'perfiles-permiso', PerfilPermisoViewSet, basename='perfil-permiso')

urlpatterns = [
    # Rutas de autenticación
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/me/', me_view, name='me'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Rutas del ViewSet de usuarios
    path('', include(router.urls)),
]
