// FILE: d:/Programming/_ITHELPDESK/frontend/src/utils/api.ts

const isProduction = window.location.hostname === 'lgu-ithelpdesk.netlify.app';

// Localhost dev backend, fallback to Render backend
const LOCAL_DEV_API = 'http://localhost:3005';
const PROD_API_ROOT_URL = 'https://lgu-helpdesk-copy.onrender.com';

export const API_ROOT_URL = isProduction ? PROD_API_ROOT_URL : LOCAL_DEV_API;
export const BASE_URL = `${API_ROOT_URL}/api`;

export interface HelpdeskUser {
  id: string;
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  office: string;
  role: string;
  status: string;
  createdAt?: string;
}

export interface TicketComment {
  _id: string;
  author: string;
  authorRole?: string;
  content: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface SupportTicket {
  _id: string;
  id: string;
  category: string;
  subCategory: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  requesterOffice?: string;
  comments: TicketComment[];
  createdAt: string;
  updatedAt: string;
}

export async function fetchWithAuth<T = any>(
  endpoint: string, 
  options: Omit<RequestInit, 'body'> & { body?: any } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      ...options,
      credentials: 'include', // Crucial for HttpOnly cookies authentication
      headers,
      body,
    });

    if (!response.ok) {
      let errorMsg = `Request failed: ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        errorMsg = errJson.message || errorMsg;
      } catch {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    if (response.status === 204) {
      return null as any;
    }

    return await response.json();
  } catch (error: any) {
    console.error(`API Error on endpoint "${endpoint}":`, error);
    throw error;
  }
}
