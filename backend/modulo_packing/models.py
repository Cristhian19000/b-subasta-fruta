"""
Modelos para el Módulo de Packing.

Estructura profesional:
1. Empresa - Manejan múltiples empresas
2. TipoFruta - Tipos de arándano/destino (Campo, Campo congelado, Descarte proceso)
3. PackingSemanal - Cabecera: UN packing de UNA empresa en UNA semana
4. PackingTipo - Cada tipo dentro del packing semanal
5. PackingDetalle - Los PY por día (Lunes a Sábado)
"""

from django.db import models
from django.db.models import Sum


# =============================================================================
# 1. TABLA: EMPRESA
# =============================================================================
class Empresa(models.Model):
    """
    Empresas del sistema.
    Se manejan múltiples empresas.
    """
    
    nombre = models.CharField(
        max_length=200,
        verbose_name="Nombre de la empresa"
    )
    activo = models.BooleanField(
        default=True,
        verbose_name="Activo"
    )
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación"
    )
    
    class Meta:
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


# =============================================================================
# 2. TABLA: TIPO_FRUTA
# =============================================================================
class TipoFruta(models.Model):
    """
    Tipos de arándano / destino del arándano.
    
    Ejemplos:
    - Campo
    - Campo congelado
    - Descarte proceso
    """
    
    nombre = models.CharField(
        max_length=100,
        verbose_name="Nombre del tipo"
    )
    activo = models.BooleanField(
        default=True,
        verbose_name="Activo"
    )
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación"
    )
    
    class Meta:
        verbose_name = "Tipo de Fruta"
        verbose_name_plural = "Tipos de Fruta"
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


# =============================================================================
# 3. TABLA: PACKING_SEMANAL
# =============================================================================
class PackingSemanal(models.Model):
    """
    Cabecera del formulario.
    Representa UN packing de UNA empresa en UNA semana.
    """
    
    ESTADO_CHOICES = [
        ('PROYECTADO', 'Proyectado'),
        ('EN_SUBASTA', 'En Subasta'),
        ('FINALIZADO', 'Finalizado'),
        ('ANULADO', 'Anulado'),
    ]
    
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='packings_semanales',
        verbose_name="Empresa"
    )
    fecha_inicio_semana = models.DateField(
        verbose_name="Fecha inicio de semana (Lunes)"
    )
    fecha_fin_semana = models.DateField(
        verbose_name="Fecha fin de semana (Domingo)"
    )
    kg_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="KG Total (calculado)"
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='PROYECTADO',
        verbose_name="Estado"
    )
    observaciones = models.TextField(
        blank=True,
        null=True,
        verbose_name="Observaciones"
    )
    fecha_registro = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de registro"
    )
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Fecha de actualización"
    )
    
    class Meta:
        verbose_name = "Packing Semanal"
        verbose_name_plural = "Packings Semanales"
        ordering = ['-fecha_inicio_semana', 'empresa__nombre']
        # Una empresa solo tiene un packing por semana
        unique_together = ['empresa', 'fecha_inicio_semana']
    
    def __str__(self):
        return f"{self.empresa.nombre} - Semana {self.fecha_inicio_semana}"
    
    def calcular_kg_total(self):
        """Calcula el total de kg sumando todos los tipos."""
        total = self.tipos.aggregate(total=Sum('kg_total'))['total']
        return total or 0
    
    def actualizar_kg_total(self):
        """Actualiza el campo kg_total con el valor calculado."""
        self.kg_total = self.calcular_kg_total()
        self.save(update_fields=['kg_total'])
    
    @property
    def estado_calculado(self):
        """
        Calcula el estado dinámicamente basado en las subastas asociadas.
        
        Lógica:
        - Si estado manual es ANULADO → ANULADO (irreversible)
        - Si hay alguna subasta ACTIVA ahora → EN_SUBASTA
        - Si todas las subastas están finalizadas/canceladas Y no hay días sin subastar → FINALIZADO
        - En otro caso → PROYECTADO
        """
        from django.utils import timezone
        from subastas.models import Subasta
        
        # Si fue anulado manualmente, respetar ese estado
        if self.estado == 'ANULADO':
            return 'ANULADO'
        
        # Obtener todos los detalles de packing de esta semana
        from modulo_packing.models import PackingDetalle
        detalles_ids = PackingDetalle.objects.filter(
            packing_tipo__packing_semanal=self
        ).values_list('id', flat=True)
        
        # Obtener todas las subastas asociadas
        subastas = Subasta.objects.filter(
            packing_detalle_id__in=detalles_ids
        )
        
        if not subastas.exists():
            # No hay subastas → PROYECTADO
            return 'PROYECTADO'
        
        # Verificar si hay alguna subasta activa AHORA usando estado_calculado
        # Esto respeta si la subasta fue cancelada manualmente
        tiene_activa = any(
            s.estado_calculado == 'ACTIVA'
            for s in subastas
        )
        
        if tiene_activa:
            return 'EN_SUBASTA'
        
        # Verificar si todas las subastas están finalizadas/canceladas
        todas_terminadas = all(
            s.estado_calculado in ('FINALIZADA', 'CANCELADA')
            for s in subastas
        )
        
        # Verificar si quedan días sin subastar
        # (días con producción pero sin subasta)
        detalles_con_produccion = PackingDetalle.objects.filter(
            packing_tipo__packing_semanal=self,
            py__gt=0  # Solo días con producción
        )
        
        detalles_con_subasta = set(subastas.values_list('packing_detalle_id', flat=True))
        detalles_sin_subasta = detalles_con_produccion.exclude(
            id__in=detalles_con_subasta
        )
        
        if todas_terminadas and not detalles_sin_subasta.exists():
            # Todas las subastas terminaron y no quedan días pendientes
            return 'FINALIZADO'
        
        # En cualquier otro caso → PROYECTADO
        # (puede tener subastas programadas o finalizadas, pero también días pendientes)
        return 'PROYECTADO'


# =============================================================================
# 4. TABLA: PACKING_TIPO
# =============================================================================
class PackingTipo(models.Model):
    """
    Cada tipo dentro del packing semanal.
    Ej: Campo, Campo congelado, Descarte proceso
    """
    
    ESTADO_CHOICES = [
        ('ACTIVO', 'Activo'),
        ('INACTIVO', 'Inactivo'),
    ]
    
    packing_semanal = models.ForeignKey(
        PackingSemanal,
        on_delete=models.CASCADE,
        related_name='tipos',
        verbose_name="Packing Semanal"
    )
    tipo_fruta = models.ForeignKey(
        TipoFruta,
        on_delete=models.CASCADE,
        related_name='packing_tipos',
        verbose_name="Tipo de Fruta"
    )
    kg_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="KG Total"
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='ACTIVO',
        verbose_name="Estado"
    )
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación"
    )
    
    class Meta:
        verbose_name = "Packing por Tipo de Fruta"
        verbose_name_plural = "Packings por Tipo de Fruta"
        ordering = ['tipo_fruta__nombre']
        unique_together = ['packing_semanal', 'tipo_fruta']
    
    def __str__(self):
        return f"{self.packing_semanal} - {self.tipo_fruta.nombre}"
    
    def calcular_kg_total(self):
        """Calcula el total de kg sumando todos los detalles diarios."""
        total = self.detalles.aggregate(total=Sum('py'))['total']
        return total or 0
    
    def actualizar_kg_total(self):
        """Actualiza el campo kg_total y también el del padre."""
        self.kg_total = self.calcular_kg_total()
        self.save(update_fields=['kg_total'])
        # También actualizar el padre
        self.packing_semanal.actualizar_kg_total()


# =============================================================================
# 5. TABLA: PACKING_DETALLE
# =============================================================================
class PackingDetalle(models.Model):
    """
    La tablita de los PY por día.
    Contiene los valores de PY y KG para cada día de la semana.
    """
    
    DIA_CHOICES = [
        ('LUNES', 'Lunes'),
        ('MARTES', 'Martes'),
        ('MIERCOLES', 'Miércoles'),
        ('JUEVES', 'Jueves'),
        ('VIERNES', 'Viernes'),
        ('SABADO', 'Sábado'),
    ]
    
    packing_tipo = models.ForeignKey(
        PackingTipo,
        on_delete=models.CASCADE,
        related_name='detalles',
        verbose_name="Packing Tipo"
    )
    dia = models.CharField(
        max_length=10,
        choices=DIA_CHOICES,
        verbose_name="Día"
    )
    fecha = models.DateField(
        verbose_name="Fecha"
    )
    py = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Kilogramos (PY)"
    )
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación"
    )
    
    class Meta:
        verbose_name = "Detalle de Packing"
        verbose_name_plural = "Detalles de Packing"
        ordering = ['fecha']
        unique_together = ['packing_tipo', 'dia']
    
    def __str__(self):
        return f"{self.packing_tipo.tipo_fruta.nombre} - {self.dia}"
    
    def save(self, *args, **kwargs):
        """Sobrescribe save para actualizar totales."""
        super().save(*args, **kwargs)
        self.packing_tipo.actualizar_kg_total()
    
    def delete(self, *args, **kwargs):
        """Sobrescribe delete para actualizar totales."""
        packing_tipo = self.packing_tipo
        super().delete(*args, **kwargs)
        packing_tipo.actualizar_kg_total()


# =============================================================================
# 6. TABLA: PACKING_IMAGEN
# =============================================================================
class PackingImagen(models.Model):
    """
    Imágenes asociadas al packing.
    
    Puede ser:
    - General del packing semanal (packing_semanal + packing_tipo=null)
    - Por tipo de fruta (packing_semanal + packing_tipo)
    
    Todas las imágenes son opcionales.
    """
    
    packing_semanal = models.ForeignKey(
        PackingSemanal,
        on_delete=models.CASCADE,
        related_name='imagenes',
        verbose_name="Packing Semanal"
    )
    packing_tipo = models.ForeignKey(
        PackingTipo,
        on_delete=models.CASCADE,
        related_name='imagenes',
        null=True,
        blank=True,
        verbose_name="Tipo de Fruta (opcional)"
    )
    imagen = models.ImageField(
        upload_to='packing/%Y/%m/',
        verbose_name="Imagen"
    )
    descripcion = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Descripción"
    )
    fecha_subida = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de subida"
    )
    
    class Meta:
        verbose_name = "Imagen de Packing"
        verbose_name_plural = "Imágenes de Packing"
        ordering = ['-fecha_subida']
    
    def __str__(self):
        if self.packing_tipo:
            return f"Imagen de {self.packing_tipo.tipo_fruta.nombre} - {self.packing_semanal}"
        return f"Imagen general de {self.packing_semanal}"

