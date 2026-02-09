/**
 * PermisosEditor - Componente de doble panel para gestionar permisos.
 * 
 * Panel Izquierdo: Módulos colapsables con checkboxes (edición)
 * Panel Derecho: Vista previa de permisos seleccionados (solo lectura)
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckSquare, Square, MinusSquare } from 'lucide-react';

const PermisosEditor = ({ permisos, onChange, estructura }) => {
    const [permisosSeleccionados, setPermisosSeleccionados] = useState(permisos || {});
    const [modulosExpandidos, setModulosExpandidos] = useState({});

    useEffect(() => {
        setPermisosSeleccionados(permisos || {});
    }, [permisos]);

    // Notificar cambios al componente padre
    useEffect(() => {
        if (onChange) {
            onChange(permisosSeleccionados);
        }
    }, [permisosSeleccionados]); // Solo depende de permisosSeleccionados

    const toggleModulo = (codigoModulo) => {
        setModulosExpandidos(prev => ({
            ...prev,
            [codigoModulo]: !prev[codigoModulo]
        }));
    };

    const togglePermiso = (codigoModulo, codigoPermiso) => {
        setPermisosSeleccionados(prev => {
            const permisosModulo = prev[codigoModulo] || [];
            const newPermisos = { ...prev };

            if (permisosModulo.includes(codigoPermiso)) {
                // Quitar permiso
                newPermisos[codigoModulo] = permisosModulo.filter(p => p !== codigoPermiso);
                if (newPermisos[codigoModulo].length === 0) {
                    delete newPermisos[codigoModulo];
                }
            } else {
                // Agregar permiso
                newPermisos[codigoModulo] = [...permisosModulo, codigoPermiso];
            }

            return newPermisos;
        });
    };

    const toggleModuloCompleto = (codigoModulo, todosPermisos) => {
        setPermisosSeleccionados(prev => {
            const permisosModulo = prev[codigoModulo] || [];
            const newPermisos = { ...prev };

            if (permisosModulo.length === todosPermisos.length) {
                // Desmarcar todo
                delete newPermisos[codigoModulo];
            } else {
                // Marcar todos
                newPermisos[codigoModulo] = todosPermisos.map(p => p.codigo);
            }

            return newPermisos;
        });
    };

    const getEstadoModulo = (codigoModulo, todosPermisos) => {
        const permisosModulo = permisosSeleccionados[codigoModulo] || [];
        if (permisosModulo.length === 0) return 'none';
        if (permisosModulo.length === todosPermisos.length) return 'all';
        return 'some';
    };

    const IconoModulo = ({ estado }) => {
        if (estado === 'all') return <CheckSquare className="w-5 h-5 text-blue-600" />;
        if (estado === 'some') return <MinusSquare className="w-5 h-5 text-blue-400" />;
        return <Square className="w-5 h-5 text-gray-400" />;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel Izquierdo - Edición */}
            <div className="border border-gray-200 rounded-lg bg-white">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                    <h3 className="font-semibold text-gray-900">Asignar Permisos</h3>
                    <p className="text-xs text-gray-500 mt-1">Selecciona los permisos para este perfil</p>
                </div>

                <div className="p-4 max-h-[600px] overflow-y-auto space-y-2">
                    {estructura && Object.entries(estructura).map(([codigoModulo, modulo]) => {
                        const isExpanded = modulosExpandidos[codigoModulo];
                        const estadoModulo = getEstadoModulo(codigoModulo, modulo.permisos);

                        return (
                            <div key={codigoModulo} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Header del módulo */}
                                <div
                                    className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                                    onClick={() => toggleModulo(codigoModulo)}
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                    )}

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleModuloCompleto(codigoModulo, modulo.permisos);
                                        }}
                                        className="flex-shrink-0"
                                    >
                                        <IconoModulo estado={estadoModulo} />
                                    </button>

                                    <span className="font-medium text-gray-900 flex-1">{modulo.nombre}</span>

                                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                                        {(permisosSeleccionados[codigoModulo] || []).length} / {modulo.permisos.length}
                                    </span>
                                </div>

                                {/* Lista de permisos */}
                                {isExpanded && (
                                    <div className="bg-white divide-y divide-gray-100">
                                        {modulo.permisos.map((permiso) => {
                                            const permisosModulo = permisosSeleccionados[codigoModulo] || [];
                                            const isChecked = permisosModulo.includes(permiso.codigo);

                                            // view_list se marca automáticamente si hay otros permisos
                                            const otrosPermisosActivos = permisosModulo.filter(p => p !== 'view_list').length > 0;
                                            const isViewListAutoIncluido = permiso.codigo === 'view_list' && otrosPermisosActivos;
                                            const isAutoChecked = isViewListAutoIncluido || isChecked;
                                            const isDisabled = isViewListAutoIncluido;

                                            return (
                                                <label
                                                    key={permiso.codigo}
                                                    className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${isDisabled
                                                            ? 'bg-blue-50 cursor-not-allowed'
                                                            : 'hover:bg-gray-50 cursor-pointer'
                                                        }`}
                                                    title={isDisabled ? 'Auto-incluido: necesario para acceder al módulo' : ''}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isAutoChecked}
                                                        onChange={() => !isDisabled && togglePermiso(codigoModulo, permiso.codigo)}
                                                        disabled={isDisabled}
                                                        className={`w-4 h-4 border-gray-300 rounded focus:ring-blue-500 ${isDisabled
                                                                ? 'text-blue-400 cursor-not-allowed'
                                                                : 'text-blue-600 cursor-pointer'
                                                            }`}
                                                    />
                                                    <span className={`text-sm flex-1 ${isDisabled ? 'text-blue-700 font-medium' : 'text-gray-700'
                                                        }`}>
                                                        {permiso.nombre}
                                                    </span>
                                                    {isDisabled && (
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                            Auto-incluido
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-mono text-gray-400">{permiso.codigo}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Panel Derecho - Vista Previa */}
            <div className="border border-gray-200 rounded-lg bg-white">
                <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
                    <h3 className="font-semibold text-blue-900">Vista Previa de Permisos</h3>
                    <p className="text-xs text-blue-600 mt-1">
                        {Object.keys(permisosSeleccionados).length === 0
                            ? 'Sin permisos asignados'
                            : `${Object.keys(permisosSeleccionados).length} módulo(s) con permisos`}
                    </p>
                </div>

                <div className="p-4 max-h-[600px] overflow-y-auto">
                    {Object.keys(permisosSeleccionados).length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Square className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No hay permisos seleccionados</p>
                            <p className="text-xs mt-1">Selecciona permisos en el panel izquierdo</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {estructura && Object.entries(permisosSeleccionados).map(([codigoModulo, permisosModulo]) => {
                                const modulo = estructura[codigoModulo];
                                if (!modulo || permisosModulo.length === 0) return null;

                                return (
                                    <div key={codigoModulo} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                                            <h4 className="font-medium text-sm text-gray-900">{modulo.nombre}</h4>
                                        </div>
                                        <ul className="divide-y divide-gray-100">
                                            {permisosModulo.map((codigoPermiso) => {
                                                const permiso = modulo.permisos.find(p => p.codigo === codigoPermiso);
                                                if (!permiso) return null;

                                                return (
                                                    <li key={codigoPermiso} className="px-3 py-2 text-sm text-gray-700 flex items-center gap-2">
                                                        <CheckSquare className="w-4 h-4 text-green-600 flex-shrink-0" />
                                                        <span>{permiso.nombre}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PermisosEditor;
