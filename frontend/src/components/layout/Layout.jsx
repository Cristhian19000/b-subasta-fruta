/**
 * Componente Layout - Estructura principal de la aplicación.
 * 
 * Envuelve las páginas con Sidebar y Header.
 */

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import SubastaToastContainer from '../common/SubastaToastContainer';
import { SubastasWSProvider } from '../../context/SubastasWSContext';

const Layout = () => {
    return (
        <SubastasWSProvider>
            <div className="min-h-screen bg-gray-50">
                {/* Sidebar */}
                <Sidebar />

                {/* Header */}
                <Header />

                {/* Notificaciones en tiempo real */}
                <SubastaToastContainer />

                {/* Contenido principal */}
                <main className="ml-64 pt-16">
                    <div className="p-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </SubastasWSProvider>
    );
};

export default Layout;
