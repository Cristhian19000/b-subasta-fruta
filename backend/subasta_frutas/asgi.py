"""
ASGI config for subasta_frutas project.

Configura tanto HTTP como WebSocket para Django Channels.
"""

import os
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

application = ProtocolTypeRouter({
    # HTTP tradicional
    "http": django_asgi_app,
    
    # WebSocket con autenticación JWT
    "websocket": websocket_application,
})
