"""
Autenticación JWT personalizada para Clientes.

Este módulo proporciona una clase de autenticación que permite validar
tokens JWT emitidos para Clientes (tabla clientes_cliente), separándolos
de los tokens de Administradores (tabla auth_user).

Django REST Framework SimpleJWT por defecto solo busca en auth_user,
por lo que necesitamos este backend personalizado.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework_simplejwt.tokens import UntypedToken
from .models import Cliente


class ClienteJWTAuthentication(JWTAuthentication):
    """
    Autenticación JWT personalizada para el modelo Cliente.
    
    Esta clase extiende JWTAuthentication para buscar clientes
    en la tabla correcta (clientes_cliente) en lugar de auth_user.
    
    El token debe contener 'cliente_id' en su payload para ser válido.
    """
    
    def get_user(self, validated_token):
        """
        Busca y retorna el Cliente correspondiente al token.
        
        Args:
            validated_token: Token JWT ya validado
            
        Returns:
            Cliente: El objeto cliente si se encuentra
            
        Raises:
            InvalidToken: Si el token no contiene cliente_id
            AuthenticationFailed: Si el cliente no existe o está deshabilitado
        """
        # Obtener el cliente_id del payload del token
        cliente_id = validated_token.get('cliente_id')
        
        if not cliente_id:
            # Si no tiene cliente_id, no es un token de cliente
            # Retornamos None para que otros backends puedan intentar
            raise InvalidToken('Token no válido para clientes')
        
        try:
            cliente = Cliente.objects.get(id=cliente_id)
        except Cliente.DoesNotExist:
            raise AuthenticationFailed('Cliente no encontrado')
        
        # Verificar que el cliente esté habilitado
        if cliente.estado != 'habilitado':
            raise AuthenticationFailed('Esta cuenta está deshabilitada')
        
        return cliente
    
    def authenticate(self, request):
        """
        Autentica la petición usando el token JWT.
        
        Returns:
            tuple: (cliente, validated_token) si es exitoso
            None: Si no hay header de autorización
            
        Raises:
            AuthenticationFailed: Si el token es inválido
        """
        header = self.get_header(request)
        if header is None:
            return None
        
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
        
        try:
            validated_token = self.get_validated_token(raw_token)
        except Exception as e:
            raise InvalidToken(str(e))
        
        # Verificar si es un token de cliente
        if 'cliente_id' not in validated_token:
            # No es un token de cliente, dejar que otro backend lo maneje
            return None
        
        cliente = self.get_user(validated_token)
        
        return (cliente, validated_token)
