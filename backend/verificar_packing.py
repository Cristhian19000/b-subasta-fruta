"""Script de verificación del módulo Packing."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'subasta_frutas.settings')
django.setup()

from modulo_packing.models import Empresa, TipoFruta, Packing, PackingDetalle
from datetime import date, timedelta

print('=== VERIFICACIÓN MÓDULO PACKING ===')
print()

# 1. Crear datos de prueba
print('1. Creando datos de prueba...')

# Crear empresas
empresa1, created = Empresa.objects.get_or_create(nombre='AgroExport SAC')
empresa2, created = Empresa.objects.get_or_create(nombre='Frutas del Norte SRL')
print(f'   Empresas: {Empresa.objects.count()}')

# Crear tipos de fruta
mango, created = TipoFruta.objects.get_or_create(nombre='Mango')
uva, created = TipoFruta.objects.get_or_create(nombre='Uva')
palta, created = TipoFruta.objects.get_or_create(nombre='Palta')
print(f'   Tipos de fruta: {TipoFruta.objects.count()}')

# Crear un packing con detalles
lunes = date.today() - timedelta(days=date.today().weekday())  # Obtener el lunes de esta semana

packing, created = Packing.objects.get_or_create(
    empresa=empresa1,
    tipo_fruta=mango,
    fecha_proyeccion=lunes,
    defaults={'observaciones': 'Proyección de prueba'}
)

if created:
    # Crear detalles para cada día
    dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
    for i, dia in enumerate(dias):
        PackingDetalle.objects.create(
            packing=packing,
            dia=dia,
            fecha=lunes + timedelta(days=i),
            py=f'PY-{i+1:03d}',
            kg=1000 + (i * 500)
        )

print(f'   Packings: {Packing.objects.count()}')
print(f'   Detalles: {PackingDetalle.objects.count()}')
print()

# 2. Verificar cálculo de kg_total
print('2. Verificando cálculo automático de kg_total...')
packing.refresh_from_db()
kg_calculado = packing.calcular_kg_total()
print(f'   KG Total almacenado: {packing.kg_total}')
print(f'   KG Total calculado: {kg_calculado}')
print(f'   ¿Coinciden? {"✓ SI" if packing.kg_total == kg_calculado else "✗ NO"}')
print()

# 3. Listar datos
print('3. Datos creados:')
print()
print('   EMPRESAS:')
for e in Empresa.objects.all():
    print(f'   - {e.id}: {e.nombre} (activo: {e.activo})')

print()
print('   TIPOS DE FRUTA:')
for t in TipoFruta.objects.all():
    print(f'   - {t.id}: {t.nombre} (activo: {t.activo})')

print()
print('   PACKINGS:')
for p in Packing.objects.all():
    print(f'   - {p.id}: {p.empresa.nombre} | {p.tipo_fruta.nombre} | {p.fecha_proyeccion} | {p.kg_total} kg')
    for d in p.detalles.all():
        print(f'     └─ {d.dia}: {d.py} - {d.kg} kg')

print()
print('=== VERIFICACIÓN COMPLETADA ===')
