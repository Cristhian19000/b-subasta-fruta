"""
Serializers para la API de Clientes.

Este módulo contiene los serializers que convierten los objetos Cliente
a formato JSON y viceversa, incluyendo validaciones personalizadas.
"""

from rest_framework import serializers
from .models import Cliente
from django.contrib.auth.hashers import make_password, check_password


class ClienteSerializer(serializers.ModelSerializer):
    """
    Serializer completo para el modelo Cliente.
    
    Incluye todos los campos del modelo y se usa para:
        - Crear nuevos clientes (POST)
        - Obtener detalle de un cliente (GET con ID)
        - Actualizar clientes (PUT/PATCH)
    
    Validaciones:
        - RUC/DNI debe tener 8 dígitos (DNI) u 11 dígitos (RUC)
        - RUC/DNI solo puede contener números
    """
    
    class Meta:
        model = Cliente
        # Lista de todos los campos a incluir en la serialización
        fields = [
            'id',
            'ruc_dni',
            'nombre_razon_social',
            'tipo',
            'sede',
            'estado',
            'password',
            'contacto_1',
            'cargo_1',
            'numero_1',
            'correo_electronico_1',
            'contacto_2',
            'cargo_2',
            'numero_2',
            'correo_electronico_2',
            'estatus_ficha',
            'confirmacion_correo',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        # Campos que no se pueden modificar (solo lectura)
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']
        extra_kwargs = {
            'password' : {'write_only':True, 'required': False}
        }

    def create(self, validated_data):
        """Encripta la contraseña al crear el cliente."""
        if 'password' in validated_data and validated_data['password']:
            validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)
    def update(self, instance, validated_data):
            """Encripta la contraseña al actualizar si se proporciona una nueva."""
            if 'password' in validated_data and validated_data['password']:
                validated_data['password'] = make_password(validated_data['password'])
            return super().update(instance, validated_data)
        
    def validate_ruc_dni(self, value):
        """     
        Valida que el RUC/DNI tenga el formato correcto.
        
        Reglas de validación:
            - DNI: exactamente 8 dígitos numéricos
            - RUC: exactamente 11 dígitos numéricos
        
        Args:
            value: El valor del RUC/DNI a validar
            
        Returns:
            El valor limpio (sin espacios) si es válido
            
        Raises:
            ValidationError: Si el formato no es válido
        """
        # Eliminar espacios al inicio y final
        value = value.strip()
        
        # Validar longitud (DNI: 8 dígitos, RUC: 11 dígitos)
        if len(value) not in [8, 11]:
            raise serializers.ValidationError(
                "El RUC debe tener 11 dígitos y el DNI debe tener 8 dígitos."
            )
        
        # Validar que solo contenga caracteres numéricos
        if not value.isdigit():
            raise serializers.ValidationError(
                "El RUC/DNI solo debe contener números."
            )
        
        return value


class ClienteListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listar clientes.
    
    Contiene solo los campos esenciales para mostrar en listados,
    mejorando el rendimiento al no incluir información de contactos.
    
    Se usa en: GET /api/clientes/ (listado)
    """
    
    class Meta:
        model = Cliente
        fields = [
            'id',
            'ruc_dni',
            'nombre_razon_social',
            'tipo',
            'sede',
            'estado',
            'estatus_ficha',
            'confirmacion_correo',
        ]
        
class ClienteLoginSerializer(serializers.Serializer):
    """
    Serializer para validar el inicio de sesión de clientes desde la App Móvil.
    """
    ruc_dni = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        ruc_dni = data.get('ruc_dni')
        password = data.get('password')

        try:
            # Buscamos al cliente por su identificador único
            cliente = Cliente.objects.get(ruc_dni=ruc_dni)
        except Cliente.DoesNotExist:
            raise serializers.ValidationError("Las credenciales son incorrectas.")

        # Verificamos si la cuenta está habilitada para entrar
        if cliente.estado != 'habilitado':
            raise serializers.ValidationError("Esta cuenta está deshabilitada.")

        # Comparamos la contraseña enviada con el hash guardado en la BD
        # Cambiar la línea 148 por esta:
                # Asegúrate de que la línea de abajo esté "metida" hacia la derecha
        if not cliente.password or not check_password(password, cliente.password):raise serializers.ValidationError("Las credenciales son incorrectas.")
        
        # Guardamos el objeto cliente en el contexto para la vista
        data['cliente'] = cliente
        return data
