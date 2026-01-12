"""
Script para crear datos de prueba en la base de datos.
"""
import os
import django
from datetime import datetime, timedelta

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'subasta_frutas.settings')
django.setup()

from django.contrib.auth.models import User
from modulo_packing.models import Empresa, TipoFruta, PackingSemanal, PackingTipo, PackingDetalle

# Crear superusuario si no existe
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@test.com', 'admin123')
    print("✓ Superusuario admin creado")

# Crear empresas
aqu1, _ = Empresa.objects.get_or_create(nombre='AQU I', defaults={'activo': True})
frutas_norte, _ = Empresa.objects.get_or_create(nombre='Frutas del Norte SRL', defaults={'activo': True})
frutas_sur, _ = Empresa.objects.get_or_create(nombre='Frutas del Sur SA', defaults={'activo': True})
print(f"✓ Empresas creadas: {aqu1.nombre}, {frutas_norte.nombre}, {frutas_sur.nombre}")

# Crear tipos de fruta
campo, _ = TipoFruta.objects.get_or_create(nombre='CAMPO', defaults={'activo': True})
congelado, _ = TipoFruta.objects.get_or_create(nombre='CONGELADO', defaults={'activo': True})
descarte, _ = TipoFruta.objects.get_or_create(nombre='DESCARTE PROCESO', defaults={'activo': True})
organico, _ = TipoFruta.objects.get_or_create(nombre='ORGANICO', defaults={'activo': True})
print(f"✓ Tipos de fruta creados: CAMPO, CONGELADO, DESCARTE PROCESO, ORGANICO")

# Días de la semana
DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']

# Crear packing semanal para la semana actual
hoy = datetime.now().date()
lunes = hoy - timedelta(days=hoy.weekday())
sabado = lunes + timedelta(days=5)

# Packing 1: AQU I - Semana actual - ACTIVO
packing1 = PackingSemanal.objects.create(
    empresa=aqu1,
    fecha_inicio_semana=lunes,
    fecha_fin_semana=sabado,
    estado='ACTIVO',
    observaciones='Packing semanal principal'
)
print(f"✓ Packing semanal 1 creado para {lunes} - {sabado} (ACTIVO)")

# Crear tipos y detalles para packing 1
for tipo_fruta, kg_base in [(campo, 2500), (congelado, 1500), (descarte, 800)]:
    pt = PackingTipo.objects.create(packing_semanal=packing1, tipo_fruta=tipo_fruta)
    for i, dia in enumerate(DIAS):
        fecha = lunes + timedelta(days=i)
        PackingDetalle.objects.create(
            packing_tipo=pt,
            dia=dia,
            fecha=fecha,
            py=f'PY{i+1}',
            kg=kg_base + (i * 100)  # Variar un poco los kg
        )
    pt.actualizar_kg_total()

print(f"✓ Tipos y detalles creados para packing 1")

# Packing 2: Frutas del Norte - Semana siguiente - PROYECTADO
lunes_sig = lunes + timedelta(days=7)
sabado_sig = lunes_sig + timedelta(days=5)

packing2 = PackingSemanal.objects.create(
    empresa=frutas_norte,
    fecha_inicio_semana=lunes_sig,
    fecha_fin_semana=sabado_sig,
    estado='PROYECTADO',
    observaciones='Proyección para la próxima semana'
)
print(f"✓ Packing semanal 2 creado para {lunes_sig} - {sabado_sig} (PROYECTADO)")

# Crear tipos y detalles para packing 2
for tipo_fruta, kg_base in [(campo, 3000), (organico, 1200)]:
    pt = PackingTipo.objects.create(packing_semanal=packing2, tipo_fruta=tipo_fruta)
    for i, dia in enumerate(DIAS):
        fecha = lunes_sig + timedelta(days=i)
        PackingDetalle.objects.create(
            packing_tipo=pt,
            dia=dia,
            fecha=fecha,
            py=f'PY{i+1}',
            kg=kg_base
        )
    pt.actualizar_kg_total()

print(f"✓ Tipos y detalles creados para packing 2")

# Packing 3: AQU I - Semana pasada - CERRADO
lunes_ant = lunes - timedelta(days=7)
sabado_ant = lunes_ant + timedelta(days=5)

packing3 = PackingSemanal.objects.create(
    empresa=aqu1,
    fecha_inicio_semana=lunes_ant,
    fecha_fin_semana=sabado_ant,
    estado='CERRADO',
    observaciones='Semana completada'
)
print(f"✓ Packing semanal 3 creado para {lunes_ant} - {sabado_ant} (CERRADO)")

# Crear tipos y detalles para packing 3
pt = PackingTipo.objects.create(packing_semanal=packing3, tipo_fruta=campo)
for i, dia in enumerate(DIAS):
    fecha = lunes_ant + timedelta(days=i)
    PackingDetalle.objects.create(
        packing_tipo=pt,
        dia=dia,
        fecha=fecha,
        py=f'PY{i+1}',
        kg=2000
    )
pt.actualizar_kg_total()

print(f"✓ Tipos y detalles creados para packing 3")

print(f"\n✓ Base de datos inicializada correctamente")
print(f"  - 3 empresas")
print(f"  - 4 tipos de fruta")
print(f"  - 3 packings semanales (ACTIVO, PROYECTADO, CERRADO)")
print(f"\n  Usuario: admin / admin123")
