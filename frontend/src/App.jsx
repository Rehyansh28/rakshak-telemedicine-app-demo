import { AppProvider } from './context/AppContext.jsx';
import AppRouter from './routes/AppRouter';

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
