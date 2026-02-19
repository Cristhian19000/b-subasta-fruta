"""
Modelos para el Módulo de Subastas.

Estructura:
1. Subasta - Subasta asociada a un PackingDetalle (producción diaria)
2. Oferta - Pujas de los clientes en las subastas
"""

from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError


class Subasta(models.Model):
    """
    Subasta asociada a una producción diaria (PackingDetalle).
    
    RF-01: Solo se puede crear una subasta por registro de producción diario.
    RF-02: Estados: PROGRAMADA, ACTIVA, FINALIZADA, CANCELADA
    """
    
    ESTADO_CHOICES = [
        ('PROGRAMADA', 'Programada'),   # Aún no inicia
        ('ACTIVA', 'Activa'),           # En curso
        ('FINALIZADA', 'Finalizada'),   # Tiempo concluido
        ('CANCELADA', 'Cancelada'),     # Anulada por el administrador
    ]
    
    # Relación con la producción diaria (PackingDetalle)
    # Cambiado de OneToOne a ForeignKey para permitir múltiples subastas
    # cuando una anterior fue cancelada (mantener historial)
    packing_detalle = models.ForeignKey(
        'modulo_packing.PackingDetalle',
        on_delete=models.PROTECT,
        related_name='subastas',
        verbose_name="Producción Diaria"
    )
    
    # Configuración de la subasta
    fecha_hora_inicio = models.DateTimeField(
        verbose_name="Fecha y hora de inicio"
    )
    fecha_hora_fin = models.DateTimeField(
        verbose_name="Fecha y hora de finalización"
    )
    precio_base = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Precio base (monto mínimo inicial)"
    )
    
    # Estado actual de la subasta
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='PROGRAMADA',
        verbose_name="Estado"
    )

    # Anti-sniping: cuántas veces se extendió el tiempo
    extensiones_realizadas = models.PositiveIntegerField(
        default=0,
        verbose_name="Extensiones de tiempo realizadas"
    )

    # Campos de auditoría
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación"
    )
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Fecha de actualización"
    )
    
    class Meta:
        verbose_name = "Subasta"
        verbose_name_plural = "Subastas"
        ordering = ['-fecha_hora_inicio']
    
    def __str__(self):
        return f"Subasta #{self.id} - {self.packing_detalle}"
    
    def clean(self):
        """Validaciones del modelo."""
        if self.fecha_hora_fin <= self.fecha_hora_inicio:
            raise ValidationError({
                'fecha_hora_fin': 'La fecha de finalización debe ser posterior a la fecha de inicio.'
            })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def estado_calculado(self):
        """
        Calcula el estado real basado en las fechas.
        Útil para mostrar el estado en tiempo real.
        """
        ahora = timezone.now()
        
        if self.estado == 'CANCELADA':
            return 'CANCELADA'
        
        if ahora < self.fecha_hora_inicio:
            return 'PROGRAMADA'
        elif self.fecha_hora_inicio <= ahora <= self.fecha_hora_fin:
            return 'ACTIVA'
        else:
            return 'FINALIZADA'
    
    @property
    def esta_activa(self):
        """Indica si la subasta está actualmente activa."""
        return self.estado_calculado == 'ACTIVA'
    
    @property
    def tiempo_restante_segundos(self):
        """Retorna los segundos restantes para que termine la subasta."""
        if not self.esta_activa:
            return 0
        
        ahora = timezone.now()
        diferencia = self.fecha_hora_fin - ahora
        return max(0, int(diferencia.total_seconds()))
    
    @property
    def oferta_ganadora(self):
        """Retorna la oferta más alta actual."""
        return self.ofertas.order_by('-monto').first()
    
    @property
    def precio_actual(self):
        """Retorna el precio actual (oferta más alta o precio base)."""
        oferta = self.oferta_ganadora
        if oferta:
            return oferta.monto
        return self.precio_base
    
    def puede_ofertar(self, monto):
        """
        RN-02: Validación de pujas.
        Verifica si un monto es válido para ofertar.
        """
        if not self.esta_activa:
            return False, "La subasta no está activa."
        
        if monto <= self.precio_actual:
            return False, f"El monto debe ser superior a {self.precio_actual}."
        
        return True, "OK"
    
    # Métodos para obtener información del packing
    @property
    def empresa(self):
        """Retorna la empresa del packing."""
        return self.packing_detalle.packing_tipo.packing_semanal.empresa
    
    @property
    def tipo_fruta(self):
        """Retorna el tipo de fruta."""
        return self.packing_detalle.packing_tipo.tipo_fruta
    
    @property
    def packing_semanal(self):
        """Retorna el packing semanal."""
        return self.packing_detalle.packing_tipo.packing_semanal
    
    @property
    def kilos_totales(self):
        """Retorna los kg del detalle."""
        return self.packing_detalle.py
    
    def get_imagenes(self):
        """
        RN-01: Jerarquía de Imágenes.
        Prioridad Alta: Fotos del tipo de fruta
        Prioridad Media: Fotos generales del packing semanal
        Prioridad Baja: Lista vacía
        """
        packing_tipo = self.packing_detalle.packing_tipo
        packing_semanal = packing_tipo.packing_semanal
        
        # Prioridad Alta: Imágenes del tipo de fruta
        imagenes_tipo = packing_tipo.imagenes.all()
        if imagenes_tipo.exists():
            return imagenes_tipo
        
        # Prioridad Media: Imágenes generales del packing semanal
        imagenes_generales = packing_semanal.imagenes.filter(packing_tipo__isnull=True)
        if imagenes_generales.exists():
            return imagenes_generales
        
        # Prioridad Baja: Sin imágenes
        return packing_tipo.imagenes.none()


class Oferta(models.Model):
    """
    Oferta/Puja de un cliente en una subasta.
    
    RN-02: Solo se aceptan ofertas superiores a la oferta actual.
    RN-03: Manejo de concurrencia (optimistic locking).
    """
    
    subasta = models.ForeignKey(
        Subasta,
        on_delete=models.CASCADE,
        related_name='ofertas',
        verbose_name="Subasta"
    )
    
    cliente = models.ForeignKey(
        'clientes.Cliente',
        on_delete=models.CASCADE,
        related_name='ofertas',
        verbose_name="Cliente"
    )
    
    monto = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Monto ofertado"
    )
    
    # Indica si esta es la oferta ganadora
    es_ganadora = models.BooleanField(
        default=False,
        verbose_name="Es ganadora"
    )
    
    # Campos de auditoría
    fecha_oferta = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha y hora de la oferta"
    )
    
    # Campo para control de concurrencia
    version = models.PositiveIntegerField(
        default=1,
        verbose_name="Versión (control de concurrencia)"
    )
    
    class Meta:
        verbose_name = "Oferta"
        verbose_name_plural = "Ofertas"
        ordering = ['-monto', '-fecha_oferta']
        # Índices para mejorar el rendimiento
        indexes = [
            models.Index(fields=['subasta', '-monto']),
            models.Index(fields=['cliente', '-fecha_oferta']),
        ]
    
    def __str__(self):
        return f"Oferta de {self.cliente} - ${self.monto} en {self.subasta}"
    
    def save(self, *args, **kwargs):
        # Al guardar, verificar si es la oferta ganadora
        super().save(*args, **kwargs)
        self._actualizar_ganadora()
    
    def _actualizar_ganadora(self):
        """Marca esta oferta como ganadora si es la más alta."""
        # Desmarcar todas las ofertas ganadoras de esta subasta
        Oferta.objects.filter(subasta=self.subasta, es_ganadora=True).exclude(
            id=self.id
        ).update(es_ganadora=False)
        
        # Verificar si esta es la oferta más alta
        oferta_maxima = self.subasta.ofertas.order_by('-monto').first()
        if oferta_maxima and oferta_maxima.id == self.id:
            if not self.es_ganadora:
                Oferta.objects.filter(id=self.id).update(es_ganadora=True)


class ConfiguracionSubasta(models.Model):
    """
    Configuración global del sistema de subastas (singleton).
    Solo debe existir un registro con pk=1.
    Editable desde el panel web por el administrador.
    """

    # Anti-sniping
    antisniping_habilitado = models.BooleanField(
        default=True,
        verbose_name="Extensión automática habilitada"
    )
    antisniping_umbral_segundos = models.PositiveIntegerField(
        default=120,
        verbose_name="Umbral de activación (segundos)",
        help_text="Si quedan menos de X segundos y alguien puja, se extiende el tiempo."
    )
    antisniping_extension_segundos = models.PositiveIntegerField(
        default=120,
        verbose_name="Tiempo a agregar (segundos)",
        help_text="Cuántos segundos se agregan al tiempo de fin cuando se activa."
    )
    antisniping_max_extensiones = models.PositiveIntegerField(
        default=5,
        verbose_name="Máximo de extensiones",
        help_text="Número máximo de veces que se puede extender. 0 = sin límite."
    )

    class Meta:
        verbose_name = "Configuración de Subastas"
        verbose_name_plural = "Configuración de Subastas"

    def __str__(self):
        return "Configuración Global de Subastas"

    def save(self, *args, **kwargs):
        """Garantiza que solo exista un registro (singleton)."""
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get(cls):
        """Obtiene (o crea con defaults) la configuración global."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
