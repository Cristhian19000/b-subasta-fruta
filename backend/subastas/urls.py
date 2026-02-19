"""
URLs para el Módulo de Subastas.

Endpoints para Panel Admin:
    - /api/admin/subastas/     -> CRUD de subastas
    - /api/admin/ofertas/      -> CRUD de ofertas

Endpoints para App Móvil Android (requieren JWT de Cliente):
    - GET  /api/subastas/           -> Lista de subastas activas
    - GET  /api/subastas/{id}/      -> Detalle de subasta
    - GET  /api/subastas/{id}/pujas/ -> Pujas de una subasta
    - POST /api/pujas/              -> Enviar una puja
    - GET  /api/pujas/historial/    -> Historial de pujas del cliente
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import SubastaViewSet, OfertaViewSet, SubastaMovilViewSet, PujaMovilViewSet, ConfiguracionSubastaView
from .reportes_views import ReporteSubastasViewSet
from .dashboard_views import DashboardViewSet

# Router para el panel administrativo
router_admin = DefaultRouter()
router_admin.register(r'subastas', SubastaViewSet, basename='admin-subasta')
router_admin.register(r'ofertas', OfertaViewSet, basename='admin-oferta')
router_admin.register(r'reportes/subastas', ReporteSubastasViewSet, basename='admin-reporte-subastas')

# Router para la app móvil - Subastas
router_movil = DefaultRouter()
router_movil.register(r'subastas', SubastaMovilViewSet, basename='subasta')

# Router para la app móvil - Pujas
router_pujas = DefaultRouter()
router_pujas.register(r'pujas', PujaMovilViewSet, basename='puja')

# Router para el dashboard
router_dashboard = DefaultRouter()
router_dashboard.register(r'', DashboardViewSet, basename='dashboard')

urlpatterns = [
    # Endpoints del panel administrativo
    path('admin/', include(router_admin.urls)),

    # Configuración global de subastas (anti-sniping, etc.)
    path('admin/configuracion/', ConfiguracionSubastaView.as_view(), name='configuracion-subasta'),
    
    # Endpoints para el dashboard
    # Prefijo: /api/subastas/dashboard/
    path('subastas/dashboard/', include(router_dashboard.urls)),
    
    # Endpoints para la app móvil (formato exacto esperado)
    # GET /api/subastas/ y GET /api/subastas/{id}/
    path('', include(router_movil.urls)),
    
    # POST /api/pujas/ y GET /api/pujas/historial/
    path('', include(router_pujas.urls)),
]
