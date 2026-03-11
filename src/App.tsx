import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { ToastContainer } from './components/ui/Toast';

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  );
}
