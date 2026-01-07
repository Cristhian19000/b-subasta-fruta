"""
Serializers para la API de Clientes.

Este módulo contiene los serializers que convierten los objetos Cliente
a formato JSON y viceversa, incluyendo validaciones personalizadas.
"""

from rest_framework import serializers
from .models import Cliente


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
