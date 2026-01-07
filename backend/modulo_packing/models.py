"""
Modelos para el Módulo de Packing.

Este módulo gestiona la proyección semanal de empaque de frutas
por empresa y tipo de fruta.
"""

from django.db import models
from django.db.models import Sum


class Empresa(models.Model):
    """
    Modelo para almacenar las empresas.
    
    Se manejan múltiples empresas en el sistema.
    
    Atributos:
        nombre: Nombre de la empresa
        activo: Indica si la empresa está activa
        fecha_creacion: Fecha de creación del registro
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


class TipoFruta(models.Model):
    """
    Modelo para almacenar los tipos de fruta.
    
    Catálogo de frutas disponibles para packing.
    
    Atributos:
        nombre: Nombre del tipo de fruta (ej: Mango, Uva, Palta)
        activo: Indica si el tipo está activo
    """
    
    nombre = models.CharField(
        max_length=100,
        verbose_name="Nombre del tipo de fruta"
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


class Packing(models.Model):
    """
    Modelo para la proyección semanal de packing.
    
    Representa la cabecera de una proyección de empaque
    para una empresa y tipo de fruta específicos.
    
    Atributos:
        empresa: Referencia a la empresa
        tipo_fruta: Referencia al tipo de fruta
        fecha_proyeccion: Fecha de inicio de la semana (generalmente lunes)
        kg_total: Kilogramos totales (calculado automáticamente)
        observaciones: Notas adicionales
    """
    
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='packings',
        verbose_name="Empresa"
    )
    tipo_fruta = models.ForeignKey(
        TipoFruta,
        on_delete=models.CASCADE,
        related_name='packings',
        verbose_name="Tipo de Fruta"
    )
    fecha_proyeccion = models.DateField(
        verbose_name="Fecha de proyección (inicio de semana)"
    )
    kg_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="KG Total"
    )
    observaciones = models.TextField(
        blank=True,
        null=True,
        verbose_name="Observaciones"
    )
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación"
    )
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Fecha de actualización"
    )
    
    class Meta:
        verbose_name = "Packing"
        verbose_name_plural = "Packings"
        ordering = ['-fecha_proyeccion']
        # Evitar duplicados: una empresa solo tiene un packing por tipo de fruta y semana
        unique_together = ['empresa', 'tipo_fruta', 'fecha_proyeccion']
    
    def __str__(self):
        return f"{self.empresa.nombre} - {self.tipo_fruta.nombre} - {self.fecha_proyeccion}"
    
    def calcular_kg_total(self):
        """
        Calcula el total de kilogramos sumando todos los detalles.
        """
        total = self.detalles.aggregate(total=Sum('kg'))['total']
        return total or 0
    
    def actualizar_kg_total(self):
        """
        Actualiza el campo kg_total con el valor calculado.
        """
        self.kg_total = self.calcular_kg_total()
        self.save(update_fields=['kg_total'])


class PackingDetalle(models.Model):
    """
    Modelo para el detalle diario del packing (la tablita de los PY).
    
    Representa la proyección de un día específico dentro de la semana.
    
    Atributos:
        packing: Referencia al packing (cabecera)
        dia: Nombre del día (lunes, martes, etc.)
        fecha: Fecha específica del día
        py: Código o identificador PY
        kg: Kilogramos proyectados para ese día
    """
    
    # Opciones para los días de la semana
    DIA_CHOICES = [
        ('lunes', 'Lunes'),
        ('martes', 'Martes'),
        ('miercoles', 'Miércoles'),
        ('jueves', 'Jueves'),
        ('viernes', 'Viernes'),
        ('sabado', 'Sábado'),
        ('domingo', 'Domingo'),
    ]
    
    packing = models.ForeignKey(
        Packing,
        on_delete=models.CASCADE,
        related_name='detalles',
        verbose_name="Packing"
    )
    dia = models.CharField(
        max_length=10,
        choices=DIA_CHOICES,
        verbose_name="Día"
    )
    fecha = models.DateField(
        verbose_name="Fecha"
    )
    py = models.CharField(
        max_length=50,
        verbose_name="PY"
    )
    kg = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Kilogramos"
    )
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación"
    )
    
    class Meta:
        verbose_name = "Detalle de Packing"
        verbose_name_plural = "Detalles de Packing"
        ordering = ['fecha']
    
    def __str__(self):
        return f"{self.packing} - {self.dia} ({self.py})"
    
    def save(self, *args, **kwargs):
        """
        Sobrescribe el método save para actualizar el kg_total del packing padre.
        """
        super().save(*args, **kwargs)
        # Actualizar el total del packing padre
        self.packing.actualizar_kg_total()
    
    def delete(self, *args, **kwargs):
        """
        Sobrescribe el método delete para actualizar el kg_total del packing padre.
        """
        packing = self.packing
        super().delete(*args, **kwargs)
        # Actualizar el total del packing padre después de eliminar
        packing.actualizar_kg_total()

