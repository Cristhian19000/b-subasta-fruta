"""
URLs para el Módulo de Packing.

Este módulo define las rutas de la API para el módulo de packing.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmpresaViewSet,
    TipoFrutaViewSet,
    PackingViewSet,
    PackingDetalleViewSet,
)

# Configuración del router para los ViewSets
router = DefaultRouter()
router.register(r'empresas', EmpresaViewSet, basename='empresa')
router.register(r'tipos-fruta', TipoFrutaViewSet, basename='tipo-fruta')
router.register(r'packings', PackingViewSet, basename='packing')
router.register(r'packing-detalles', PackingDetalleViewSet, basename='packing-detalle')

urlpatterns = [
    path('', include(router.urls)),
]
