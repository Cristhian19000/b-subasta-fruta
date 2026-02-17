"""
Rutas WebSocket para el módulo de subastas.
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Canal general de subastas (para administradores y clientes)
    # Recibe: notificaciones de nuevas subastas, subastas canceladas, etc.
    re_path(r'ws/subastas/$', consumers.SubastasConsumer.as_asgi()),
    
    # Canal específico de una subasta (para pujas en tiempo real)
    # Recibe: nuevas pujas, actualizaciones de precio, tiempo restante
    re_path(r'ws/subastas/(?P<subasta_id>\d+)/$', consumers.SubastaDetalleConsumer.as_asgi()),
]
