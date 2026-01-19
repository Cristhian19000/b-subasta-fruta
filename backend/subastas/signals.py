"""
Signals para actualización automática de estados.

- Cuando se crea la primera subasta de un packing → PROYECTADO → EN_SUBASTA
- Cuando todas las subastas finalizan → EN_SUBASTA → FINALIZADO
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender='subastas.Subasta')
def actualizar_estado_packing_al_crear(sender, instance, created, **kwargs):
    """
    Cuando se crea una nueva subasta, actualizar el estado del PackingSemanal.
    
    Si el PackingSemanal está en estado PROYECTADO, cambia a EN_SUBASTA.
    """
    if created:
        try:
            # Obtener el PackingSemanal asociado
            packing_semanal = instance.packing_detalle.packing_tipo.packing_semanal
            
            logger.info(f"Signal: Subasta {instance.id} creada. Packing {packing_semanal.id} estado actual: {packing_semanal.estado}")
            
            # Si está en PROYECTADO, cambiar a EN_SUBASTA
            if packing_semanal.estado == 'PROYECTADO':
                packing_semanal.estado = 'EN_SUBASTA'
                packing_semanal.save(update_fields=['estado'])
                logger.info(f"Signal: Packing {packing_semanal.id} cambió a EN_SUBASTA")
        except Exception as e:
            logger.error(f"Signal error al crear subasta: {e}")


@receiver(post_save, sender='subastas.Subasta')
def verificar_finalizacion_packing(sender, instance, created, **kwargs):
    """
    Verificar si todas las subastas del packing están finalizadas.
    Si es así, cambiar el estado del PackingSemanal a FINALIZADO.
    """
    if not created:
        # Solo cuando se actualiza (no cuando se crea)
        if instance.estado in ('FINALIZADA', 'CANCELADA'):
            try:
                packing_semanal = instance.packing_detalle.packing_tipo.packing_semanal
                
                logger.info(f"Signal: Subasta {instance.id} cambió a {instance.estado}. Verificando packing {packing_semanal.id}")
                
                # Solo si está EN_SUBASTA
                if packing_semanal.estado == 'EN_SUBASTA':
                    # Obtener todos los detalles del packing
                    from modulo_packing.models import PackingDetalle
                    
                    # Todos los detalles de este packing
                    detalles_ids = PackingDetalle.objects.filter(
                        packing_tipo__packing_semanal=packing_semanal
                    ).values_list('id', flat=True)
                    
                    # Subastas asociadas a esos detalles
                    subastas = sender.objects.filter(
                        packing_detalle_id__in=detalles_ids
                    )
                    
                    # Si hay subastas y todas están finalizadas o canceladas
                    if subastas.exists():
                        todas_terminadas = all(
                            s.estado in ('FINALIZADA', 'CANCELADA') 
                            for s in subastas
                        )
                        
                        logger.info(f"Signal: {subastas.count()} subastas encontradas. Todas terminadas: {todas_terminadas}")
                        
                        if todas_terminadas:
                            packing_semanal.estado = 'FINALIZADO'
                            packing_semanal.save(update_fields=['estado'])
                            logger.info(f"Signal: Packing {packing_semanal.id} cambió a FINALIZADO")
            except Exception as e:
                logger.error(f"Signal error al verificar finalización: {e}")
