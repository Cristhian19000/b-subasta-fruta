"""
Signals para actualización automática de estados.

NOTA: Con la implementación de `estado_calculado` en PackingSemanal,
ya no es necesario actualizar manualmente el campo `estado`.
El estado se calcula dinámicamente basándose en las subastas asociadas.

Este archivo se mantiene comentado para referencia histórica.
Podría eliminarse en una futura limpieza de código.
"""

# Se comentó toda la lógica de signals porque ahora usamos `estado_calc ulado`
# que determina el estado dinámicamente sin necesidad de actualizar la BD.

# Los signals anteriores actualizaban manualmente:
# - PROYECTADO → EN_SUBASTA cuando se creaba una subasta
# - EN_SUBASTA → F INALIZADO cuando todas las subastas terminaban

# Ahora el estado se calcula en tiempo real basándose en:
# - Si hay subastas ACTIVAS ahora → EN_SUBASTA
# - Si todas terminaron y no hay días pendientes → FINALIZADO  
# - En otro caso → PROYECTADO
