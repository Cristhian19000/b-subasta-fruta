"""
Middleware de autenticación JWT para WebSockets.

Permite autenticar conexiones WebSocket usando el mismo token JWT
que se usa en la API REST.
"""

from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware personalizado para autenticación JWT en WebSockets.
    
    Soporta dos métodos de envío del token:
    1. Query string: ws://host/ws/subastas/?token=<jwt_token>
    2. Subprotocolo: Sec-WebSocket-Protocol: <jwt_token>
    
    El usuario autenticado estará disponible en self.scope["user"]
    """
    
    async def __call__(self, scope, receive, send):
        # Obtener el token del query string o subprotocolo
        token = await self._get_token(scope)
        
        if token:
            # Intentar autenticar con el token
            scope["user"] = await self._authenticate(token)
        else:
            scope["user"] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
    
    async def _get_token(self, scope):
        """Extrae el token JWT del query string o subprotocolo."""
        # Método 1: Query string (?token=xxx)
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        
        if "token" in params:
            return params["token"][0]
        
        # Método 2: Subprotocolo (para clientes que no soportan query string)
        subprotocols = scope.get("subprotocols", [])
        for protocol in subprotocols:
            if protocol.startswith("Bearer."):
                return protocol.replace("Bearer.", "")
        
        return None
    
    @database_sync_to_async
    def _authenticate(self, token):
        """Valida el token JWT y retorna el usuario."""
        try:
            # Decodificar el token
            access_token = AccessToken(token)
            
            # Determinar el tipo de usuario (admin o cliente)
            user_type = access_token.get("user_type", "admin")
            user_id = access_token.get("user_id")
            
            if user_type == "cliente":
                # Es un cliente (app móvil)
                from clientes.models import Cliente
                try:
                    return Cliente.objects.get(pk=user_id)
                except Cliente.DoesNotExist:
                    return AnonymousUser()
            else:
                # Es un administrador (web)
                from django.contrib.auth import get_user_model
                User = get_user_model()
                try:
                    return User.objects.get(pk=user_id)
                except User.DoesNotExist:
                    return AnonymousUser()
                    
        except (InvalidToken, TokenError) as e:
            return AnonymousUser()
