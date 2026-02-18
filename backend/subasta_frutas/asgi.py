"""
ASGI config for subasta_frutas project.

Configura tanto HTTP como WebSocket para Django Channels.
Incluye un lifespan handler que inicializa los timers exactos de subastas
al arrancar el servidor, garantizando transiciones de estado en tiempo real.
"""

import os
import asyncio
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'subasta_frutas.settings')

# Inicializar Django ANTES de importar otros módulos
django_asgi_app = get_asgi_application()

# Importar después de inicializar Django
from channels.routing import ProtocolTypeRouter, URLRouter
from subastas.middleware import JWTAuthMiddleware
from subastas.routing import websocket_urlpatterns
from django.conf import settings

# En desarrollo, permitir todas las conexiones WebSocket
# En producción, usar AllowedHostsOriginValidator
if settings.DEBUG:
    websocket_application = JWTAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    )
else:
    from channels.security.websocket import AllowedHostsOriginValidator
    websocket_application = AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        )
    )

_base_application = ProtocolTypeRouter({
    # HTTP tradicional
    "http": django_asgi_app,

    # WebSocket con autenticación JWT
    "websocket": websocket_application,
})


async def application(scope, receive, send):
    """
    Wrapper ASGI que maneja el protocolo 'lifespan' para inicializar
    los timers exactos de subastas al arrancar el servidor.
    """
    if scope["type"] == "lifespan":
        while True:
            message = await receive()
            if message["type"] == "lifespan.startup":
                # Inicializar timers exactos para todas las subastas pendientes
                from subastas.scheduler import inicializar_timers
                asyncio.ensure_future(inicializar_timers())
                await send({"type": "lifespan.startup.complete"})
            elif message["type"] == "lifespan.shutdown":
                await send({"type": "lifespan.shutdown.complete"})
                return
    else:
        await _base_application(scope, receive, send)
