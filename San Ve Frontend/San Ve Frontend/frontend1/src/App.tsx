import AppRouter from './routes';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ChatBox from './components/ChatBox';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
        <ChatBox />
      </AuthProvider>
    </ThemeProvider>
  );
}
