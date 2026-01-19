"""
URLs para el Módulo de Subastas.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import SubastaViewSet, OfertaViewSet, SubastaMovilViewSet

# Router principal para el panel administrativo
router = DefaultRouter()
router.register(r'subastas', SubastaViewSet, basename='subasta')
router.register(r'ofertas', OfertaViewSet, basename='oferta')

# Router para la app móvil
router_movil = DefaultRouter()
router_movil.register(r'subastas', SubastaMovilViewSet, basename='subasta-movil')

urlpatterns = [
    # Endpoints del panel administrativo
    path('', include(router.urls)),
    
    # Endpoints para la app móvil
    path('movil/', include(router_movil.urls)),
]
