import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const MainLayout = () => {
    return (
        <div className="min-h-screen flex flex-col w-full selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
            <Navbar />

            <main className="flex-grow w-full">
                <Outlet />
            </main>

            <Footer />
        </div>
    );
};
