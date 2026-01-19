"""
Modelo de Cliente para el sistema de subastas de frutas.

Este módulo define el modelo Cliente que almacena toda la información
relacionada con los clientes del sistema, incluyendo datos de identificación,
contactos y estados de ficha.
"""

from django.db import models


class Cliente(models.Model):
    """
    Modelo principal para almacenar información de clientes.
    
    Atributos:
        - Datos de identificación (RUC/DNI, razón social, tipo, sede, estado)
        - Contacto principal (obligatorio)
        - Contacto secundario (opcional)
        - Estatus de ficha y confirmación de correo
        - Campos de auditoría (fechas de creación y actualización)
    """
    
    # Opciones para el tipo de cliente (persona natural o jurídica)
    TIPO_CHOICES = [
        ('persona_natural', 'Persona Natural'),
        ('persona_juridica', 'Persona Jurídica'),
    ]
    
    # Opciones para el estado del cliente en el sistema
    ESTADO_CHOICES = [
        ('habilitado', 'Habilitado'),
        ('deshabilitado', 'Deshabilitado'),
    ]
    
    # Opciones para el estatus de la ficha del cliente
    ESTATUS_FICHA_CHOICES = [
        ('recepcionado', 'Recepcionado'),
        ('pendiente', 'Pendiente'),
    ]
    
    # =========================================================================
    # DATOS DE IDENTIFICACIÓN DEL CLIENTE
    # =========================================================================
    
    # RUC (11 dígitos) o DNI (8 dígitos) - Identificador único del cliente
    ruc_dni = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='RUC/DNI'
    )
    
    # Nombre completo (persona natural) o razón social (persona jurídica)
    nombre_razon_social = models.CharField(
        max_length=255,
        verbose_name='Nombre o Razón Social'
    )
    
    # Tipo de cliente: persona natural o jurídica
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        verbose_name='Tipo'
    )
    
    # Sede o ubicación principal del cliente
    sede = models.CharField(
        max_length=100,
        verbose_name='Sede'
    )
    
    # Estado actual del cliente en el sistema (habilitado o deshabilitado)
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='habilitado',
        verbose_name='Estado'
    )
    
    # =========================================================================
    # CONTACTO PRINCIPAL (OBLIGATORIO)
    # Información del contacto principal del cliente
    # =========================================================================
    
    # Nombre completo del contacto principal
    contacto_1 = models.CharField(
        max_length=150,
        verbose_name='Contacto 1'
    )
    
    # Cargo o posición del contacto en la empresa
    cargo_1 = models.CharField(
        max_length=100,
        verbose_name='Cargo'
    )
    
    # Número de teléfono del contacto principal
    numero_1 = models.CharField(
        max_length=20,
        verbose_name='Número de Teléfono'
    )
    
    # Correo electrónico del contacto principal
    correo_electronico_1 = models.EmailField(
        verbose_name='Correo Electrónico'
    )
    
    # =========================================================================
    # CONTACTO SECUNDARIO (OPCIONAL)
    # Información adicional de un segundo contacto
    # =========================================================================
    
    # Nombre completo del contacto secundario (opcional)
    contacto_2 = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        verbose_name='Contacto 2'
    )
    
    # Cargo del contacto secundario (opcional)
    cargo_2 = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Cargo 2'
    )
    
    # Número de teléfono del contacto secundario (opcional)
    numero_2 = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='Número de Teléfono 2'
    )
    
    # Correo electrónico del contacto secundario (opcional)
    correo_electronico_2 = models.EmailField(
        blank=True,
        null=True,
        verbose_name='Correo Electrónico 2'
    )
    
    # =========================================================================
    # ESTADOS DE FICHA Y CONFIRMACIÓN
    # Control del estado de la documentación del cliente
    # =========================================================================
    
    # Estado de completitud de la ficha del cliente
    estatus_ficha = models.CharField(
        max_length=20,
        choices=ESTATUS_FICHA_CHOICES,
        default='pendiente',
        verbose_name='Estatus de Ficha'
    )
    
    # Indica si el cliente ha confirmado su correo electrónico
    confirmacion_correo = models.BooleanField(
        default=False,
        verbose_name='Confirmación de Correo'
    )
    
    # =========================================================================
    # CAMPOS DE AUDITORÍA
    # Registro automático de fechas de creación y modificación
    # =========================================================================
    
    # Fecha y hora de creación del registro (se establece automáticamente)
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    # Fecha y hora de última actualización (se actualiza automáticamente)
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name='Fecha de Actualización'
    )

    password = models.CharField(
        max_length=128,
        verbose_name='Contraseña',
        null=True,  # Permite que los registros actuales no den error al migrar
        blank=True  # Permite que el campo se envíe vacío desde el frontend si no se cambia
    )
    
    class Meta:
        """Configuración del modelo Cliente."""
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        # Ordenar por fecha de creación descendente (más recientes primero)
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        """Representación en texto del cliente (RUC/DNI - Nombre)."""
        return f"{self.ruc_dni} - {self.nombre_razon_social}"
