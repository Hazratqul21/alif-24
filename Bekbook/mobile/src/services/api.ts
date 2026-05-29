import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://bekbook.alif24.uz/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT token into all requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('mahalla_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  lat?: number;
  lng?: number;
  address?: string;
  role: 'user' | 'admin';
  readerId?: string;
}

export interface Book {
  id: number;
  userId: number;
  title: string;
  author: string;
  description: string;
  type: 'sell' | 'free' | 'rent';
  price: number;
  lat?: number;
  lng?: number;
  address?: string;
  images?: string[] | string;
  condition: string;
  rentDuration?: number;
  status: 'available' | 'rented' | 'reserved';
  genre?: string;
  createdAt: string;
  user?: {
    name: string;
    phone: string;
  };
}

export interface Store {
  id: number;
  ownerId: number;
  name: string;
  description: string;
  address: string;
  lat?: number;
  lng?: number;
  phone: string;
  openHours: string;
  avatar?: string;
}

export interface Transaction {
  id: number;
  lenderId: number;
  bookId?: number;
  storeBookId?: number;
  borrowerName: string;
  borrowerPhone: string;
  issuedAt: string;
  dueDate: string;
  returnedAt?: string;
  status: 'active' | 'returned' | 'overdue';
  finePerDay?: number;
  fineAmount?: number;
  notes?: string;
  book?: {
    title: string;
    author: string;
  };
}

export const apiService = {
  // Auth endpoints
  async login(email: string, passwordHash: string) {
    const response = await apiClient.post<{ token: string; user: User }>('/auth/login', {
      email,
      password: passwordHash, // standard input mapped to password
    });
    const { token, user } = response.data;
    await SecureStore.setItemAsync('mahalla_token', token);
    await SecureStore.setItemAsync('mahalla_user', JSON.stringify(user));
    return response.data;
  },

  async register(data: { name: string; email: string; passwordHash: string; phone: string }) {
    const response = await apiClient.post<{ token: string; user: User }>('/auth/register', {
      name: data.name,
      email: data.email,
      password: data.passwordHash,
      phone: data.phone,
    });
    const { token, user } = response.data;
    await SecureStore.setItemAsync('mahalla_token', token);
    await SecureStore.setItemAsync('mahalla_user', JSON.stringify(user));
    return response.data;
  },

  async logout() {
    await SecureStore.deleteItemAsync('mahalla_token');
    await SecureStore.deleteItemAsync('mahalla_user');
  },

  async getMe() {
    const response = await apiClient.get<User>('/auth/me');
    await SecureStore.setItemAsync('mahalla_user', JSON.stringify(response.data));
    return response.data;
  },

  // Books endpoints
  async getBooks(params?: { search?: string; type?: string; genre?: string }) {
    const response = await apiClient.get<{ books: Book[]; total: number }>('/books', { params });
    return response.data.books || [];
  },

  async getBook(id: number) {
    const response = await apiClient.get<Book>(`/books/${id}`);
    return response.data;
  },

  async createBook(bookData: Partial<Book>) {
    const response = await apiClient.post<Book>('/books', bookData);
    return response.data;
  },

  async toggleFavorite(bookId: number) {
    const response = await apiClient.post(`/books/${bookId}/favorite`);
    return response.data;
  },

  async getFavorites() {
    const response = await apiClient.get<{ books: Book[]; total: number }>('/users/me/favorites');
    return response.data.books || [];
  },

  async getMyBooks() {
    const response = await apiClient.get<{ books: Book[]; total: number }>('/users/me/books');
    return response.data.books || [];
  },

  // Stores endpoints
  async getStores() {
    const response = await apiClient.get<Store[]>('/stores');
    return response.data;
  },

  async getStoreDetail(id: number) {
    const response = await apiClient.get<Store>(`/stores/${id}`);
    return response.data;
  },

  async getStoreBooks(id: number) {
    const response = await apiClient.get<any[]>(`/stores/${id}/books`);
    return response.data;
  },

  async createStoreBook(storeId: number, data: any) {
    const response = await apiClient.post<any>(`/stores/${storeId}/books`, data);
    return response.data;
  },

  async getStoreReaders(storeId: number) {
    const response = await apiClient.get<any>(`/stores/${storeId}/readers`);
    return response.data;
  },

  async getStoreInvoices(storeId: number) {
    const response = await apiClient.get<any>(`/stores/${storeId}/invoices`);
    return response.data;
  },

  async createInvoice(data: any) {
    const response = await apiClient.post<any>('/invoices', data);
    return response.data;
  },

  async getStoreOwnerStatus(storeId: number) {
    const response = await apiClient.get<any>(`/subscriptions/owner-status/${storeId}`);
    return response.data;
  },

  async activateStore(storeId: number) {
    const response = await apiClient.post<any>('/subscriptions/activate-store', { storeId });
    return response.data;
  },

  async getSubscriptionPlans() {
    const response = await apiClient.get<any>('/subscriptions/plans');
    return response.data;
  },

  async getUserStoreSubscription(storeId: number) {
    const response = await apiClient.get<any>(`/subscriptions/store/${storeId}`);
    return response.data;
  },

  async createSubscription(storeId: number, plan: string) {
    const response = await apiClient.post<any>('/subscriptions/create', { storeId, plan });
    return response.data;
  },

  async getConversations() {
    const response = await apiClient.get<any>('/messages/conversations');
    return response.data;
  },

  async getThread(userId: number) {
    const response = await apiClient.get<any>(`/messages/${userId}`);
    return response.data;
  },

  async sendMessage(toId: number, body: string) {
    const response = await apiClient.post<any>('/messages', { toId, body });
    return response.data;
  },

  async getNotifications() {
    const response = await apiClient.get<any>('/notifications');
    return response.data;
  },

  async markAllNotificationsRead() {
    const response = await apiClient.patch<any>('/notifications/read-all', {});
    return response.data;
  },

  async markNotificationRead(id: number) {
    const response = await apiClient.patch<any>(`/notifications/${id}/read`, {});
    return response.data;
  },

  async sendBulkNotification(data: { title: string; body?: string; link?: string }) {
    const response = await apiClient.post<any>('/notifications/bulk', data);
    return response.data;
  },

  async createPayment(data: { bookId: number; deliveryType: string; deliveryAddress?: string }) {
    const response = await apiClient.post<any>('/payments/create', data);
    return response.data;
  },

  async getListingQuota() {
    const response = await apiClient.get<any>('/books/listing-quota');
    return response.data;
  },

  async uploadImage(uri: string, mimeType: string, fileName: string) {
    const formData = new FormData();
    formData.append('images', {
      uri,
      type: mimeType,
      name: fileName,
    } as any);

    const response = await apiClient.post<any>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.urls[0];
  },

  async initiateBookListingPayment() {
    const response = await apiClient.post<any>('/payments/book-listing');
    return response.data;
  },

  async confirmBookListingPayment(token: string) {
    const response = await apiClient.post<any>('/payments/book-listing/pay', { token });
    return response.data;
  },

  async createBook(data: any) {
    const response = await apiClient.post<any>('/books', data);
    return response.data;
  },

  async updateUserCategory(userId: number, data: { category?: string; isBlacklisted?: boolean }) {
    const response = await apiClient.patch<any>(`/users/${userId}/category`, data);
    return response.data;
  },

  async createStore(data: Partial<Store>) {
    const response = await apiClient.post<Store>('/stores', data);
    return response.data;
  },

  async updateStore(id: number, data: Partial<Store>) {
    const response = await apiClient.patch<Store>(`/stores/${id}`, data);
    return response.data;
  },

  // Transactions endpoints
  async getTransactions() {
    const response = await apiClient.get<Transaction[]>('/transactions');
    return response.data;
  },

  async createTransaction(data: {
    bookId?: number;
    storeBookId?: number;
    borrowerName: string;
    borrowerPhone: string;
    dueDate: string;
    finePerDay?: number;
    notes?: string;
  }) {
    const response = await apiClient.post<Transaction>('/transactions', data);
    return response.data;
  },

  async returnBook(transactionId: number) {
    const response = await apiClient.patch<{ transaction: Transaction; fineAmount: number }>(
      `/transactions/${transactionId}/return`
    );
    return response.data;
  },

  // Map endpoints
  async getNearby(params: { lat: number; lng: number; radius?: number; type?: string }) {
    const response = await apiClient.get<{ books: Book[]; stores: Store[] }>('/map/nearby', { params });
    return response.data;
  },

  // Invoices endpoints
  async getInvoices(storeId: number) {
    const response = await apiClient.get<any[]>(`/invoices/store/${storeId}`);
    return response.data;
  },

  async createInvoice(storeId: number, data: any) {
    const response = await apiClient.post(`/invoices`, { storeId, ...data });
    return response.data;
  },

  // Reservations endpoints
  async getReservations() {
    const response = await apiClient.get<any[]>('/reservations');
    return response.data;
  },

  async createReservation(data: { bookId?: number; storeBookId?: number }) {
    const response = await apiClient.post('/reservations', data);
    return response.data;
  },

  async cancelReservation(id: number) {
    const response = await apiClient.delete(`/reservations/${id}`);
    return response.data;
  },

  // Quota & Payments
  async getQuota() {
    const response = await apiClient.get<{ monthlyCount: number; freeQuota: number; requiresPayment: boolean; feeAmount: number }>('/books/listing-quota');
    return response.data;
  },

  // Helper date formatter
  formatDate(dateString?: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const monthsUz = [
      'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
      'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
    ];
    return `${date.getDate()}-${monthsUz[date.getMonth()]} ${date.getFullYear()}`;
  },

  formatDateShort(dateString?: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }
};
export default apiService;
