"""
URLs para el Módulo de Packing.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EmpresaViewSet,
    TipoFrutaViewSet,
    PackingSemanalViewSet,
    PackingTipoViewSet,
)

# Crear el router
router = DefaultRouter()
router.register(r'empresas', EmpresaViewSet, basename='empresa')
router.register(r'tipos-fruta', TipoFrutaViewSet, basename='tipo-fruta')
router.register(r'packing-semanal', PackingSemanalViewSet, basename='packing-semanal')
router.register(r'packing-tipos', PackingTipoViewSet, basename='packing-tipo')

urlpatterns = [
    path('', include(router.urls)),
]
