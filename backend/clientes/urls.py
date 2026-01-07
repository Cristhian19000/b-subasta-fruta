"""
Configuración de URLs para la API de Clientes.

Este módulo define las rutas de la API utilizando el router de Django REST Framework,
que genera automáticamente todas las URLs para las operaciones CRUD.

Rutas generadas automáticamente:
    - GET    /clientes/          -> Listar clientes
    - POST   /clientes/          -> Crear cliente
    - GET    /clientes/{id}/     -> Detalle de cliente
    - PUT    /clientes/{id}/     -> Actualizar cliente
    - PATCH  /clientes/{id}/     -> Actualizar parcialmente
    - DELETE /clientes/{id}/     -> Eliminar cliente
    
    Acciones personalizadas:
    - POST   /clientes/{id}/confirmar_correo/
    - PATCH  /clientes/{id}/cambiar_estado/
    - PATCH  /clientes/{id}/actualizar_estatus_ficha/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClienteViewSet

# Crear el router que genera automáticamente las URLs
router = DefaultRouter()

# Registrar el ViewSet de clientes
# Esto genera todas las rutas bajo el prefijo 'clientes/'
router.register(r'clientes', ClienteViewSet, basename='cliente')

# Incluir las URLs generadas por el router
urlpatterns = [
    path('', include(router.urls)),
]
