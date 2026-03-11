# Instrucciones para Copilot: Frontend en React + TypeScript + Tailwind CSS

## 1. Contexto del proyecto

Este repositorio implementa un **frontend moderno en React (>= 18)** usando:

- **Framework UI**: `react@18+` con **Function Components** y **Hooks**
- **Lenguaje**: **TypeScript (>= 5.0)** para type safety
- **Styling**: **Tailwind CSS v3+** con **headless-ui** para componentes accesibles
- **State Management**: **Zustand** o **React Context + useReducer**
- **Routing**: **React Router v6+**
- **HTTP Client**: **TanStack Query (React Query)** para data fetching
- **Arquitectura**: **Feature-Based + Component-Driven Design**

### Principios arquitectónicos obligatorios

1. **Separación de capas estricta**: `Component → Custom Hook → Service → API Client`
2. **Inyección de dependencias**: Contextos y props drilling minimizado
3. **Inversión de dependencias**: Abstracciones en servicios y custom hooks
4. **Sin dependencias circulares**: Importaciones unidireccionales
5. **Código idiomático React**: Hooks, composición, renderizado condicional
6. **Type Safety total**: TypeScript en todos los archivos

### Objetivos de calidad

- Alto rendimiento: Code splitting, lazy loading, memoización inteligente
- Accesibilidad: WCAG 2.1 AA compliance mínimo
- Testabilidad completa: Unit + integration + E2E tests
- UX excelente: Animaciones, loading states, error handling
- Mantenibilidad y escalabilidad

## 2. Stack tecnológico y librerías

### 2.1. React + TypeScript (obligatorio)

**Versión mínima**: React 18+, TypeScript 5.0+

**Responsabilidades**:

- Function components con hooks (useState, useEffect, useContext, useCallback, useMemo)
- Type definitions para props, state, events
- Ref forwarding cuando sea necesario
- Error boundaries para manejo de errores

**Reglas críticas**:

- ❌ **NUNCA** usar class components en código nuevo
- ✅ Usar solo function components con hooks
- ✅ Tipear props con interfaces: `interface ButtonProps { onClick: () => void; }`
- ✅ Tipear eventos: `onChange: (e: React.ChangeEvent<HTMLInputElement>) => void`
- ✅ Usar `React.memo()` para componentes costosos
- ✅ Usar `useCallback()` para callbacks en props
- ✅ Usar `useMemo()` para computaciones costosas
- ❌ NUNCA ignorar advertencias de React Strict Mode
- ❌ NUNCA crear componentes dentro de otros componentes

### 2.2. TypeScript (obligatorio)

**Configuración tsconfig.json mínima**:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  }
}
```

**Patrones de tipado**:

```typescript
// ✅ Interfaz para props
interface UserCardProps {
  userId: string;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

// ✅ Tipo para componente
type UserCard = React.FC<UserCardProps>;

// ✅ Tipos genéricos
interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

// ✅ Tipos para eventos
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.currentTarget.value;
};

// ❌ Evitar: Type inference débil
const handleClick = (e: any) => {}; // NO

// ❌ Evitar: unknown sin type guards
const unknownData: unknown = data;
if (typeof unknownData === 'object') { // Necesario
  // ...
}
```

**Reglas**:

- ✅ `strict: true` siempre habilitado
- ✅ Tipos explícitos en función returns
- ✅ Evitar `any` (usar `unknown` con type guards)
- ✅ Usar `as const` para literales constantes
- ✅ Discriminated unions para tipos complejos
- ❌ No usar `type` cuando `interface` es más apropiado
- ❌ No ignorar errores TS con `@ts-ignore`

### 2.3. Tailwind CSS (obligatorio)

**Reglas de uso**:

- ✅ Usar utility classes: `className="flex items-center gap-4"`
- ✅ Componentes compuestos: `<div className="flex flex-col gap-2"></div>`
- ✅ Responsive classes: `md:grid-cols-2 lg:grid-cols-3`
- ✅ Dark mode con `dark:` prefix
- ✅ Custom colors via extend en config
- ❌ **NUNCA** escribir CSS custom (excepto animaciones complejas)
- ❌ **NUNCA** usar `<style>` tags en componentes
- ❌ NUNCA inline styles: `style={{ color: 'red' }}`

### 2.4. React Router v6+ (obligatorio)

**Estructura de rutas**:

```typescript
// src/routes/routes.tsx
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'users/:id',
        element: <UserDetailPage />,
        loader: async ({ params }) => {
          return fetchUser(params.id);
        },
      },
      {
        path: 'admin',
        element: <ProtectedRoute><AdminLayout /></ProtectedRoute>,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
        ],
      },
    ],
  },
]);

export default router;
```

**Reglas**:

- ✅ Usar `<Outlet />` en layouts
- ✅ Implementar `loader` para prefetch de datos
- ✅ Usar `useParams()` para acceder parámetros
- ✅ Usar `useNavigate()` para navegación programática
- ✅ Proteger rutas privadas con ProtectedRoute HOC
- ❌ No usar rutas dinámicas sin structure clara
- ❌ No mezclar rutas en múltiples archivos sin organización

### 2.5. TanStack Query (React Query)

**Para data fetching y sincronización**:

```typescript
// src/api/hooks/useUsers.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { userApi } from '../client';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getAll(),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserInput) => userApi.create(data),
    onSuccess: (data) => {
      // Revalidar lista después de crear
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Setear dato directamente
      queryClient.setQueryData(['user', data.id], data);
    },
  });
};
```

**Reglas**:

- ✅ Usar query keys estructuradas: `['users', userId]`
- ✅ Configurar `staleTime` y `gcTime` apropiadamente
- ✅ Usar `invalidateQueries` para revalidar
- ✅ Usar `setQueryData` para optimistic updates
- ✅ Implementar error handling y retry logic
- ❌ NUNCA hacer requests directamente en componentes
- ❌ NUNCA usar `useEffect` para data fetching (TanStack Query lo maneja)

### 2.6. Zustand (para state management global)

**Cuando React Context no es suficiente**:

```typescript
// src/store/userStore.ts
import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserStore {
  // State
  users: User[];
  selectedUserId: string | null;

  // Actions
  setUsers: (users: User[]) => void;
  selectUser: (id: string) => void;
  clearSelection: () => void;

  // Selectors
  selectedUser: () => User | undefined;
}

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  selectedUserId: null,

  setUsers: (users) => set({ users }),
  selectUser: (id) => set({ selectedUserId: id }),
  clearSelection: () => set({ selectedUserId: null }),

  selectedUser: () => {
    const state = get();
    return state.users.find((u) => u.id === state.selectedUserId);
  },
}));
```

**Reglas**:

- ✅ Zustand para global state que se accede desde múltiples rutas
- ✅ React Context para feature-scoped state
- ✅ useCallback para acciones en Zustand
- ✅ Selectors para optimizar re-renders: `useUserStore((state) => state.selectedUser())`
- ❌ No usar Zustand para state local de componentes
- ❌ No sobreguardar estado (props son mejor para local state)

### 2.7. Testing (obligatorio)

**Librerías**:

- `vitest` - Test runner (alternativa a Jest)
- `@testing-library/react` - Componentes testing
- `@testing-library/jest-dom` - Matchers
- `msw` - Mock Service Worker para API mocking
- `@testing-library/user-event` - Simulación realista de interacciones

**Ejemplo de test**:

```typescript
// src/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('should be disabled when loading', () => {
    render(<Button isLoading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

**Reglas**:

- ✅ Testear comportamiento, no implementación
- ✅ Usar `getByRole` en lugar de `getByTestId` cuando sea posible
- ✅ Usar `userEvent` en lugar de `fireEvent`
- ✅ Mockear API con MSW
- ✅ Cobertura mínima: 70% en helpers, 50% en componentes
- ❌ No testear librerías externas
- ❌ No escribir tests que dependen del orden
- ❌ No usar `waitFor` sin timeout explícito

### 2.8. Logging (obligatorio)

**Sin logging pesado, solo lo necesario**:

```typescript
// src/utils/logger.ts
const log = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console[level](`[${new Date().toISOString()}] ${message}`, data);
  }
};

export const logger = {
  info: (msg: string, data?: any) => log('info', msg, data),
  warn: (msg: string, data?: any) => log('warn', msg, data),
  error: (msg: string, data?: any) => log('error', msg, data),
};

// Uso
logger.error('Failed to fetch users', error);
```

**Reglas**:

- ✅ Logging en error handling
- ✅ Logging en operaciones críticas
- ✅ Nunca loggear datos sensibles
- ❌ No loggear en dev mode a menos que sea necesario
- ❌ No usar `console.log` directamente

### 2.9. Validación de formularios

**Usar `react-hook-form` + `zod`**:

```typescript
// src/forms/UserForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  age: z.number().int().gte(18, 'Debe ser mayor de 18'),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  onSubmit: (data: UserFormData) => Promise<void>;
}

export const UserForm: React.FC<UserFormProps> = ({ onSubmit }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input
        {...register('name')}
        placeholder="Nombre"
        className="w-full px-3 py-2 border rounded"
      />
      {errors.name && <p className="text-red-600">{errors.name.message}</p>}

      <input
        {...register('email')}
        placeholder="Email"
        type="email"
        className="w-full px-3 py-2 border rounded"
      />
      {errors.email && <p className="text-red-600">{errors.email.message}</p>}

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Enviar
      </button>
    </form>
  );
};
```

**Reglas**:

- ✅ Usar schema validation con Zod
- ✅ Validar antes de enviar al backend
- ✅ Mostrar errores claros en UI
- ✅ Usar react-hook-form para eficiencia
- ❌ No validar solo en el backend
- ❌ No dejar campos sin validar

### 2.10. Utilidades adicionales

- **clsx**: Condicionales en className: `clsx('p-4', { 'bg-red': error })`
- **date-fns**: Manejo de fechas idiomático
- **framer-motion**: Animaciones avanzadas (opcional)
- **axios**: HTTP client alternativo a fetch

## 3. Estructura de carpetas del proyecto

```
.
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css (Tailwind imports)
│   │
│   ├── routes/
│   │   ├── routes.tsx (Router config)
│   │   └── ProtectedRoute.tsx
│   │
│   ├── features/ (Módulos por funcionalidad)
│   │   ├── users/
│   │   │   ├── components/
│   │   │   │   ├── UserCard.tsx
│   │   │   │   ├── UserForm.tsx
│   │   │   │   └── UserCard.test.tsx
│   │   │   ├── pages/
│   │   │   │   ├── UsersPage.tsx
│   │   │   │   └── UserDetailPage.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useUsers.ts
│   │   │   │   └── useUserForm.ts
│   │   │   ├── api/
│   │   │   │   └── userApi.ts
│   │   │   ├── types/
│   │   │   │   └── user.ts
│   │   │   └── store/
│   │   │       └── userStore.ts
│   │   │
│   │   └── auth/
│   │       ├── components/
│   │       │   ├── LoginForm.tsx
│   │       │   └── ProtectedRoute.tsx
│   │       ├── pages/
│   │       │   └── LoginPage.tsx
│   │       ├── hooks/
│   │       │   └── useAuth.ts
│   │       ├── api/
│   │       │   └── authApi.ts
│   │       ├── types/
│   │       │   └── auth.ts
│   │       └── store/
│   │           └── authStore.ts
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── __tests__/
│   │   │       └── Button.test.tsx
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts
│   │   │   ├── usePrevious.ts
│   │   │   └── __tests__/
│   │   │       └── useDebounce.test.ts
│   │   ├── utils/
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   ├── classNameHelpers.ts
│   │   │   └── __tests__/
│   │   │       └── formatters.test.ts
│   │   ├── api/
│   │   │   ├── client.ts (axios instance)
│   │   │   ├── interceptors.ts
│   │   │   └── types.ts
│   │   ├── context/
│   │   │   ├── ThemeContext.tsx
│   │   │   └── NotificationContext.tsx
│   │   ├── types/
│   │   │   ├── common.ts
│   │   │   └── api.ts
│   │   └── constants/
│   │       ├── api.ts
│   │       └── ui.ts
│   │
│   ├── layout/
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   │
│   └── config/
│       └── env.ts
│
├── public/
│   └── assets/ (imágenes, iconos, etc)
│
├── vitest.config.ts
├── tailwind.config.js
├── tsconfig.json
├── .env.example
├── package.json
└── vite.config.ts
```

## 4. Propósito de cada carpeta

### 4.1. src/routes

Configuración centralizada del routing con React Router v6.

- Definir todas las rutas
- Implementar route guards (ProtectedRoute)
- Configurar loaders y error boundaries

### 4.2. src/features

**Corazón de la arquitectura**. Cada feature es auto-contenida.

Estructura por feature:

```
users/
├── components/ (solo UI, no lógica)
├── pages/ (componentes de página, composición)
├── hooks/ (custom hooks con lógica)
├── api/ (llamadas HTTP específicas)
├── types/ (tipos/interfaces feature-specific)
└── store/ (Zustand store si aplica)
```

**Reglas**:

- ✅ Cada feature es independiente
- ✅ Archivos relacionados co-located
- ✅ Importar desde otras features: `import { useUsers } from '@/features/users/hooks'`
- ❌ No importar componentes privados de otra feature
- ❌ No crear carpetas muy profundas (máximo 3 niveles)

### 4.3. src/shared

Componentes y utilidades reutilizables.

- Button, Card, Modal, Spinner (UI components)
- Custom hooks genéricos
- Utility functions (formatters, validators)
- API client configuration
- Context providers globales

**Reglas**:

- ✅ Código reutilizable que aparece en 2+ features
- ✅ Componentes sin dependencia de features específicas
- ✅ Abstraer lógica común aquí
- ❌ No importar desde features específicas
- ❌ No tener lógica de negocio

### 4.4. src/layout

Layouts compartidos: Header, Sidebar, Footer, etc.

- Proporcionar estructura visual común
- No contener lógica de features

### 4.5. src/config

Configuración centralizada:

```typescript
// src/config/env.ts
export const config = {
  API_URL: import.meta.env.VITE_API_URL,
  ENVIRONMENT: import.meta.env.MODE as 'development' | 'production',
  IS_DEV: import.meta.env.DEV,
};
```

## 5. Reglas arquitectónicas (OBLIGATORIAS)

### 5.1. Flujo de dependencias

**Dirección correcta** (solo hacia dentro):

```
Page Component → Custom Hook (useUsers) → Service/API Client → HTTP Layer
                                      ↓
                            Shared Components
```

**Prohibiciones**:

- ❌ Shared NO puede importar de features
- ❌ Features NO pueden importar de otras features
- ❌ Componentes NO pueden hacer llamadas HTTP directas
- ❌ Hooks NO pueden hacer renderizado (solo retornan valores)
- ✅ Features SÍ pueden importar de shared
- ✅ Components SÍ pueden importar hooks
- ✅ Hooks SÍ pueden importar servicios

### 5.2. Separación de responsabilidades

**Componentes** - Solo UI:

```typescript
// ✅ Correcto: Componente presentacional
interface UserCardProps {
  user: User;
  onEdit: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit }) => {
  return (
    <div className="p-4 border rounded">
      <h3>{user.name}</h3>
      <button onClick={onEdit}>Editar</button>
    </div>
  );
};

// ❌ Incorrecto: Componente con lógica
export const UserCard: React.FC<{ userId: string }> = ({ userId }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`).then(setUser);
  }, [userId]);

  return <div>{user?.name}</div>;
};
```

**Hooks** - Solo lógica:

```typescript
// ✅ Correcto: Hook con lógica, retorna datos
export const useUser = (userId: string) => {
  const query = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userApi.getById(userId),
  });

  return {
    user: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};

// ❌ Incorrecto: Hook renderiza
export const useUserComponent = (userId: string) => {
  return <div>User</div>; // ❌ NO renderizar en hooks
};
```

### 5.3. Manejo de estado

**Decisión por nivel de alcance**:

```
┌─────────────────────────────────────┐
│ useState + useReducer (Local)       │ Component state
├─────────────────────────────────────┤
│ useContext (Feature-scoped)         │ Related components
├─────────────────────────────────────┤
│ Zustand / TanStack Query (Global)   │ Multiple features/routes
└─────────────────────────────────────┘
```

**Ejemplo**:

```typescript
// Local state - dentro del componente
const [isOpen, setIsOpen] = useState(false);

// Feature scope - Context
const UserProvider = ({ children }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  return (
    <UserContext.Provider value={{ selectedUser, setSelectedUser }}>
      {children}
    </UserContext.Provider>
  );
};

// Global state - Zustand
export const useAppStore = create((set) => ({
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}));
```

### 5.4. Custom Hooks

**Patrón recomendado**:

```typescript
// ✅ Estructura correcta
export const useUserForm = (userId?: string) => {
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const onSubmit = async (data: UserFormData) => {
    try {
      if (userId) {
        await updateMutation.mutateAsync({ id: userId, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch (error) {
      // Error handling
    }
  };

  return {
    form,
    isLoading: createMutation.isPending || updateMutation.isPending,
    error: createMutation.error || updateMutation.error,
    onSubmit,
  };
};

// Uso en componente
const UserFormComponent: React.FC<{ userId?: string }> = ({ userId }) => {
  const { form, isLoading, onSubmit } = useUserForm(userId);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
};
```

### 5.5. Memoización estratégica

**Cuándo usar `React.memo()`, `useCallback()`, `useMemo()`**:

```typescript
// ✅ React.memo para componentes costosos que reciben props complejas
interface ListProps {
  items: User[];
  onSelect: (id: string) => void;
}

export const UserList = React.memo<ListProps>(({ items, onSelect }) => {
  // Renderizado costoso
  return <div>{items.map(user => ...)}</div>;
}, (prevProps, nextProps) => {
  // Custom comparison si es necesario
  return prevProps.items.length === nextProps.items.length;
});

// ✅ useCallback para funciones pasadas a componentes memoizados
const handleSelectUser = useCallback((id: string) => {
  setSelectedUserId(id);
}, []);

// ❌ No es necesario si el componente no es memoizado
const handleClickButton = () => {
  setCount(count + 1);
};

// ✅ useMemo para computaciones costosas
const expensiveValue = useMemo(() => {
  return computeExpensiveData(data);
}, [data]);

// ❌ No para valores simples
const firstName = useMemo(() => user?.name.split(' ')[0], [user?.name]); // NO
const firstName = user?.name.split(' ')[0]; // Sí
```

**Regla de oro**: No memoizar prematuramente. Medir performance primero.

### 5.6. Manejo de errores

**Patrón Error Boundary + Try-Catch en async**:

```typescript
// src/shared/components/ErrorBoundary.tsx
interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    logger.error('ErrorBoundary caught error', error);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage error={this.state.error?.message} />;
    }

    return this.props.children;
  }
}

// Uso
<ErrorBoundary>
  <UsersPage />
</ErrorBoundary>
```

**En async operations**:

```typescript
// ✅ Correcto
const handleSubmit = async (data: FormData) => {
  try {
    setIsLoading(true);
    const response = await userApi.create(data);
    setUser(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    setError(message);
    logger.error('Failed to create user', error);
  } finally {
    setIsLoading(false);
  }
};

// ❌ Incorrecto: ignorar errores
const handleSubmit = async (data: FormData) => {
  const response = await userApi.create(data);
  setUser(response);
};
```

### 5.7. Data Fetching con TanStack Query

**Patrón centralizado**:

```typescript
// src/features/users/api/userApi.ts
import axios from 'axios';
import { User, CreateUserInput } from '../types/user';

export const userApi = {
  getAll: async (): Promise<User[]> => {
    const { data } = await apiClient.get('/users');
    return data;
  },

  getById: async (id: string): Promise<User> => {
    const { data } = await apiClient.get(`/users/${id}`);
    return data;
  },

  create: async (input: CreateUserInput): Promise<User> => {
    const { data } = await apiClient.post('/users', input);
    return data;
  },

  update: async (id: string, input: Partial<CreateUserInput>): Promise<User> => {
    const { data } = await apiClient.patch(`/users/${id}`, input);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};

// src/features/users/hooks/useUsers.ts
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getAll(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => userApi.getById(id),
    enabled: !!id, // Solo ejecutar si id existe
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserInput) => userApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
```

### 5.8. Testing completo

**3 capas de testing**:

```typescript
// 1. Unit tests - Funciones puras y hooks
describe('formatDate', () => {
  it('should format date correctly', () => {
    const result = formatDate(new Date('2024-01-15'));
    expect(result).toBe('15/01/2024');
  });
});

// 2. Component tests - Componentes renderizados
describe('UserCard', () => {
  it('should render user data', () => {
    const user = { id: '1', name: 'John', email: 'john@example.com' };
    render(<UserCard user={user} onEdit={() => {}} />);
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});

// 3. Integration tests - Múltiples componentes + API
describe('UsersPage', () => {
  it('should load and display users', async () => {
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json([
          { id: '1', name: 'John' },
        ]);
      })
    );

    render(<UsersPage />);
    
    const users = await screen.findAllByRole('listitem');
    expect(users).toHaveLength(1);
  });
});
```

**Mock Service Worker para API**:

```typescript
// src/__mocks__/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'John', email: 'john@example.com' },
    ]);
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: '2',
      ...body,
    }, { status: 201 });
  }),
];

// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts'],
  },
});

// src/test/setup.ts
import { server } from '../__mocks__/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 5.9. Accessibility (a11y)

**Reglas WCAG 2.1 AA**:

```tsx
// ✅ Correcto: Semántica y ARIA
<div role="button" onClick={handleClick} onKeyDown={handleKeyDown} tabIndex={0}>
  Click me
</div>

// ❌ Incorrecto
<div onClick={handleClick}>Click me</div>

// ✅ Forms accesibles
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-required="true" />

// ✅ Color contrast (4.5:1 ratio)
<p className="text-gray-700">Suficiente contraste</p>

// ✅ Imágenes con alt
<img src="user.jpg" alt="Photo of John Doe" />

// ✅ Links con contexto
<a href="/users/123" aria-label="Edit user John">Edit</a>

// ✅ Skip links
<a href="#main-content" className="sr-only">
  Skip to main content
</a>
```

## 6. Estándares de código React/TypeScript

### 6.1. Convenciones de nombres

**Componentes**:

```typescript
// ✅ PascalCase para componentes
const UserCard = () => {}; // Componente
export const UserCard = () => {};

// ✅ Nombres descriptivos
const CreateUserButton = () => {};
const UserNotFoundPage = () => {};

// ❌ Evitar nombres genéricos
const Container = () => {}; // Muy genérico
const Page1 = () => {}; // Poco descriptivo
```

**Hooks**:

```typescript
// ✅ use + verbo/sustantivo
const useUser = () => {}; // Custom hook
const useFetch = () => {};
const useLocalStorage = () => {};

// ❌ Nombres sin "use"
const getUser = () => {}; // No es un hook
const userManager = () => {};
```

**Props e interfaces**:

```typescript
// ✅ Props descriptivos
interface ButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

// ❌ Props ambiguos
interface Props {
  click: () => void;
  load?: boolean;
  type?: string;
}
```

### 6.2. Componentes idiomáticos

**Estructura recomendada**:

```typescript
// 1. Imports
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Types/Interfaces
interface UserCardProps {
  user: User;
  onDelete?: (id: string) => Promise<void>;
}

// 3. Componente
export const UserCard: React.FC<UserCardProps> = ({
  user,
  onDelete,
}) => {
  // 4. Hooks
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  // 5. Callbacks
  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(user.id);
    } finally {
      setIsDeleting(false);
    }
  }, [user.id, onDelete]);

  // 6. Render
  return (
    <div className="p-4 border rounded">
      <h3>{user.name}</h3>
      <button onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? 'Eliminando...' : 'Eliminar'}
      </button>
    </div>
  );
};
```

### 6.3. Performance patterns

**Lazy loading de rutas**:

```typescript
import { lazy, Suspense } from 'react';

const AdminPage = lazy(() => import('@/features/admin/pages/AdminPage'));
const UserDetailPage = lazy(() => import('@/features/users/pages/UserDetailPage'));

const routes = [
  {
    path: '/admin',
    element: (
      <Suspense fallback={<Spinner />}>
        <AdminPage />
      </Suspense>
    ),
  },
];
```

**Image optimization**:

```typescript
// ✅ Usar next-image si es posible, o importar como módulo
import userImage from '@/assets/user.jpg';

<img src={userImage} alt="User avatar" className="w-10 h-10 rounded-full" />

// ❌ URLs hardcodeadas
<img src="/public/user.jpg" alt="User" />
```

## 7. Checklist de calidad

Antes de hacer commit, verificar:

- [ ] ✅ Sin errores TS (`npm run type-check`)
- [ ] ✅ Lint pasando (`npm run lint`)
- [ ] ✅ Tests ejecutando y pasando (`npm run test`)
- [ ] ✅ Componentes tienen PropTypes o TypeScript interfaces
- [ ] ✅ Async operations tienen proper error handling
- [ ] ✅ Custom hooks retornan valores tipados
- [ ] ✅ Sin `any` types innecesarios
- [ ] ✅ Sin `console.log` en código productivo
- [ ] ✅ Código formateado con Prettier
- [ ] ✅ Nombres descriptivos en variables y funciones
- [ ] ✅ Componentes no exceden 300 líneas
- [ ] ✅ Funciones cumplir single responsibility
- [ ] ✅ No hay prop drilling innecesario (máximo 2 niveles)
- [ ] ✅ TanStack Query usado para remote state
- [ ] ✅ Zustand usado para global state
- [ ] ✅ useState solo para component local state
- [ ] ✅ useEffect tiene cleanup si es necesario
- [ ] ✅ useCallback/useMemo usado estratégicamente
- [ ] ✅ Accesibilidad checkeada (a11y)
- [ ] ✅ Mobile responsive
- [ ] ✅ Imágenes optimizadas
- [ ] ✅ Code splitting implementado para rutas grandes

## 8. Ejemplo de flujo esperado

```
Page Component (en route)
    ↓
Custom Hook (useUsers) ← TanStack Query
    ↓
Servicio (userApi)
    ↓
HTTP Client (axios/fetch)
    ↓
Backend API

Paralelamente:
Componentes (UserCard, UserForm) ← Shared
    ↓
Props tipadas + Callbacks
```

## 9. Recomendaciones finales

**Herramientas de desarrollo**:

- **ESLint**: `eslint-plugin-react`, `eslint-plugin-react-hooks`
- **Prettier**: Auto-formatting
- **TypeScript**: `typescript@latest`
- **Vitest**: Testing
- **Storybook**: Component documentation (opcional pero recomendado)

**Proceso de desarrollo**:

1. Definir tipos/interfaces primero
2. Crear componentes presentacionales
3. Escribir custom hooks con lógica
4. Integrar en página/ruta
5. Tests durante desarrollo
6. Revisar checklist de calidad
7. Commit

**Recursos útiles**:

- React Docs: https://react.dev
- TypeScript Handbook: https://www.typescriptlang.org/docs
- TanStack Query: https://tanstack.com/query
- Tailwind CSS: https://tailwindcss.com
- Testing Library: https://testing-library.com

---

**Recuerda**: La arquitectura sirve al código, no al revés. Si una regla no tiene sentido en tu contexto específico, discútela con el equipo. La consistencia es más importante que la perfección.
