// FILE: d:/Programming/_ITHELPDESK/frontend/src/pages/Analytics.tsx
import React, { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../utils/api';
import { AlertCircle, BarChart3, Download } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Register Chart.js elements
ChartJS.register(ArcElement, Tooltip, Legend);

interface AnalyticsSummary {
  totalTickets: number;
  new: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export const Analytics: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await fetchWithAuth<AnalyticsSummary>('analytics/summary');
        setSummary(data);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch analytics summary:', err);
        setError(err.message || 'Error fetching analytics summary.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const handleExportChart = () => {
    if (chartRef.current) {
      const chartInstance = chartRef.current;
      const base64Image = chartInstance.toBase64Image();
      const link = document.createElement('a');
      link.href = base64Image;
      link.download = 'ticket-status-summary.png';
      link.click();
    }
  };

  const chartData = summary ? {
    labels: ['New', 'In Progress', 'Resolved', 'Closed'],
    datasets: [{
      label: 'Tickets by Status',
      data: [summary.new, summary.inProgress, summary.resolved, summary.closed],
      backgroundColor: [
        'rgba(59, 130, 246, 0.85)',   // Blue
        'rgba(245, 158, 11, 0.85)',  // Yellow
        'rgba(22, 163, 74, 0.85)',   // Green
        'rgba(107, 114, 128, 0.85)'  // Gray
      ],
      borderColor: [
        'rgba(59, 130, 246, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(22, 163, 74, 1)',
        'rgba(107, 114, 128, 1)'
      ],
      borderWidth: 1.5
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            family: "'Inter', sans-serif",
            size: 11
          },
          boxWidth: 12
        }
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-extrabold font-heading text-base-content tracking-tight">
          System Analytics
        </h2>
        <p className="text-sm text-base-content/60">
          Global statistics of support request workflows.
        </p>
      </div>

      {error && (
        <div className="alert alert-error text-xs p-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : !summary ? (
        <div className="text-center py-20 text-base-content/50 space-y-2">
          <BarChart3 size={48} className="mx-auto opacity-30" />
          <p>No statistics summary available.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm hover-scale text-center md:text-left">
              <div className="text-2xl font-extrabold text-base-content">{summary.totalTickets}</div>
              <div className="text-[10px] text-base-content/50 uppercase font-bold tracking-wider mt-1">Total Tickets</div>
            </div>

            <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm hover-scale text-center md:text-left border-l-4 border-l-info">
              <div className="text-2xl font-extrabold text-info">{summary.new}</div>
              <div className="text-[10px] text-base-content/50 uppercase font-bold tracking-wider mt-1">New</div>
            </div>

            <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm hover-scale text-center md:text-left border-l-4 border-l-warning">
              <div className="text-2xl font-extrabold text-warning">{summary.inProgress}</div>
              <div className="text-[10px] text-base-content/50 uppercase font-bold tracking-wider mt-1">In Progress</div>
            </div>

            <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm hover-scale text-center md:text-left border-l-4 border-l-success">
              <div className="text-2xl font-extrabold text-success">{summary.resolved}</div>
              <div className="text-[10px] text-base-content/50 uppercase font-bold tracking-wider mt-1">Resolved</div>
            </div>

            <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm hover-scale text-center md:text-left border-l-4 border-l-neutral">
              <div className="text-2xl font-extrabold text-base-content/60">{summary.closed}</div>
              <div className="text-[10px] text-base-content/50 uppercase font-bold tracking-wider mt-1">Closed</div>
            </div>
          </div>

          {/* Chart Panel */}
          <div className="bg-base-100 rounded-3xl border border-base-300 p-6 md:p-8 shadow-sm flex flex-col items-center space-y-6">
            <div className="flex justify-between items-center w-full">
              <h3 className="text-lg font-bold font-heading">Tickets by Status</h3>
              <button 
                onClick={handleExportChart}
                className="btn btn-outline btn-xs gap-1 font-semibold"
              >
                <Download size={12} />
                <span>Export Chart</span>
              </button>
            </div>

            <div className="relative w-full max-w-sm h-72">
              {chartData && (
                <Doughnut 
                  ref={chartRef} 
                  data={chartData} 
                  options={chartOptions} 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
