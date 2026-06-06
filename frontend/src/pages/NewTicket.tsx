// FILE: d:/Programming/_ITHELPDESK/frontend/src/pages/NewTicket.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { ArrowLeft, AlertCircle, FilePlus } from 'lucide-react';

const subCategoriesMap: Record<string, string[]> = {
  Hardware: ['Laptop/Desktop Issue', 'Monitor/Peripherals', 'Biometrics Machine', 'Hardware Initial Setup', 'Others'],
  Software: ['MS Office', 'Operating System', 'Antivirus', 'e-Tax System', 'ECPAC System', 'Other Application', 'Others'],
  Network: ['No Internet Connection', 'Slow Connection', 'Wi-Fi Access', 'Others'],
  Printer: ['Not Printing', 'Paper Jam', 'Toner/Ink Replacement', 'Reset', 'Initial Setup of Printer', 'Others'],
  Account: ['Password Reset', 'New Account Request', 'Permission Issue']
};

export const NewTicket: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    category: '',
    subCategory: '',
    subject: '',
    description: '',
    priority: 'Medium'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Reset subcategory if category changes
      if (name === 'category') {
        updated.subCategory = '';
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.category || !formData.subCategory || !formData.subject || !formData.description) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      await fetchWithAuth('tickets', {
        method: 'POST',
        body: formData
      });
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Failed to submit ticket:', err);
      setError(err.message || 'Error submitting ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <button 
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline self-start"
      >
        <ArrowLeft size={14} />
        <span>Back to Dashboard</span>
      </button>

      <div className="bg-base-100 rounded-3xl border border-base-300 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <FilePlus size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold font-heading">Submit Support Request</h3>
            <p className="text-xs text-base-content/50">Detail your technical hardware, software, or network issue.</p>
          </div>
        </div>

        {error && (
          <div className="alert alert-error text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold">Category <span className="text-error">*</span></span>
              </label>
              <select 
                name="category" 
                required
                value={formData.category}
                onChange={handleChange}
                className="select select-bordered select-sm w-full"
              >
                <option value="">Select Category</option>
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Network</option>
                <option value="Printer">Printer</option>
                <option value="Account">Account</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold">Sub-Category <span className="text-error">*</span></span>
              </label>
              <select 
                name="subCategory" 
                required
                disabled={!formData.category}
                value={formData.subCategory}
                onChange={handleChange}
                className="select select-bordered select-sm w-full"
              >
                <option value="">Select Sub-Category</option>
                {formData.category && subCategoriesMap[formData.category]?.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold">Priority <span className="text-error">*</span></span>
            </label>
            <select 
              name="priority" 
              required
              value={formData.priority}
              onChange={handleChange}
              className="select select-bordered select-sm w-full"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold">Subject / Title <span className="text-error">*</span></span>
            </label>
            <input 
              type="text" 
              name="subject"
              required
              placeholder="e.g. Printer in Accounting not responding"
              className="input input-bordered input-sm w-full"
              value={formData.subject}
              onChange={handleChange}
            />
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold">Description <span className="text-error">*</span></span>
            </label>
            <textarea 
              name="description" 
              required
              rows={5}
              placeholder="Please provide full details about the issue you are experiencing..."
              className="textarea textarea-bordered w-full"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary btn-sm w-full mt-4"
          >
            {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Submit Ticket'}
          </button>
        </form>
      </div>
    </div>
  );
};
