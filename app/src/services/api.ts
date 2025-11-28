import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

const API_URL = 'http://localhost:8000';

export interface Spot {
    row: number;
    col: number;
    is_booked: boolean;
}

export interface ParkingState {
    rows: number;
    cols: number;
    spots: Spot[];
}

export interface LayoutConfig {
    rows: number;
    cols: number;
}

export interface User {
    username: string;
    role: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    role: string;
    username: string;
}

class ApiService {
    private axiosInstance: AxiosInstance;
    private token: string | null = null;

    constructor(baseURL: string) {
        this.axiosInstance = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add interceptor to inject token
        this.axiosInstance.interceptors.request.use((config) => {
            if (this.token) {
                config.headers.Authorization = `Bearer ${this.token}`;
            }
            return config;
        });
    }

    public setAuthToken(token: string | null) {
        this.token = token;
    }

    public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.get(url, config);
        return response.data;
    }

    public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.post(url, data, config);
        return response.data;
    }

    public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.put(url, data, config);
        return response.data;
    }

    public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.delete(url, config);
        return response.data;
    }
}

export const apiService = new ApiService(API_URL);

export const getLayout = async (): Promise<ParkingState> => {
    return apiService.get<ParkingState>(API_ENDPOINTS.LAYOUT);
};

export const updateLayout = async (config: LayoutConfig): Promise<ParkingState> => {
    return apiService.post<ParkingState>(API_ENDPOINTS.ADMIN_LAYOUT, config);
};

export const bookSpot = async (row: number, col: number, is_booked: boolean): Promise<ParkingState> => {
    return apiService.post<ParkingState>(API_ENDPOINTS.BOOK, { row, col, is_booked });
};

export const login = async (username: string, password: string): Promise<AuthResponse> => {
    // FormData for OAuth2
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await axios.post(`${API_URL}/login`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const signup = async (username: string, password: string, role: string = 'customer'): Promise<AuthResponse> => {
    return apiService.post<AuthResponse>('/signup', { username, password, role });
};
