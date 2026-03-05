import { useContext } from 'react';
import { Moon, Sun } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useContext(ThemeContext);

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-indigo-300 hover:text-white hover:bg-white/10 transition-colors"
            title={theme === 'dark' ? 'Kunduzgi rejim' : 'Tungi rejim'}
        >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    );
}
