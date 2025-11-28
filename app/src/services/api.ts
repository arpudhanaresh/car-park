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

class ApiService {
    private axiosInstance: AxiosInstance;

    constructor(baseURL: string) {
        this.axiosInstance = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
        });
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
