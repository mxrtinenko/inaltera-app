// INALTERA API Service
// Base URL configured for the backend API

const API_BASE_URL = 'https://api.inaltera.es/sionver';

// Token management
export const getAuthToken = (): string | null => {
  return localStorage.getItem('inaltera_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('inaltera_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('inaltera_token');
};

// Base fetch wrapper with auth
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error de red' }));
    throw new Error(error.message || 'Error en la solicitud');
  }

  return response.json();
};

// Auth endpoints
export const authApi = {
  login: async (email: string, password: string) => {
    // Simulated for now - replace with real API call
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  register: async (email: string, password: string) => {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  logout: () => {
    removeAuthToken();
  },
};

// User/Profile endpoints
export const userApi = {
  getProfile: async () => {
    return apiFetch('/user/profile');
  },
  
  updateProfile: async (data: {
    razonSocial: string;
    nif: string;
    domicilioFiscal: string;
  }) => {
    return apiFetch('/user/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  getSubscriptionStatus: async () => {
    return apiFetch('/user/subscription/status');
  },
};

// Catalog endpoints
export const catalogApi = {
  getClientes: async () => {
    return apiFetch('/catalog/clientes');
  },
  
  getProductos: async () => {
    return apiFetch('/catalog/productos');
  },
};

// Invoice endpoints
export const facturaApi = {
  emitir: async (invoiceData: unknown) => {
    return apiFetch('/factura/emitir', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  },
  
  cargarPdf: async (file: File) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('pdf', file);
    
    const response = await fetch(`${API_BASE_URL}/factura/cargar_pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar el PDF');
    }
    
    return response.json();
  },
};

// Registry endpoints
export const registroApi = {
  getListado: async (params?: {
    search?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    
    const queryString = queryParams.toString();
    return apiFetch(`/registro/listado${queryString ? `?${queryString}` : ''}`);
  },
};