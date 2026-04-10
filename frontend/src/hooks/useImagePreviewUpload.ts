import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface UseImagePreviewUploadReturn {
    selectedFile: File | null;
    previewUrl: string | null;
    isUploading: boolean;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    clearSelection: () => void;
    upload: (endpoint: string) => Promise<{ url: string; public_id: string }>;
    setPreviewUrl: (url: string | null) => void;
}

export const useImagePreviewUpload = (): UseImagePreviewUploadReturn => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const token = useAuthStore((state) => state.token);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    }, []);

    const clearSelection = useCallback(() => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
    }, [previewUrl]);

    const upload = async (endpoint: string): Promise<{ url: string; public_id: string }> => {
        if (!selectedFile) {
            throw new Error('No file selected');
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await axios.post(`${API_URL}${endpoint}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            // Cleanup preview after successful upload
            clearSelection();
            return {
                url: response.data.url,
                public_id: response.data.public_id
            };
        } catch (error: any) {
            throw new Error(error.response?.data?.detail || 'فشل رفع الصورة');
        } finally {
            setIsUploading(false);
        }
    };

    // Cleanup object URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    return {
        selectedFile,
        previewUrl,
        isUploading,
        handleFileSelect,
        clearSelection,
        upload,
        setPreviewUrl,
    };
};
