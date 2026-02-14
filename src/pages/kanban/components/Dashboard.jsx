import { useState } from 'react';
import { 
  Plus, 
  Building2, 
  TrendingUp, 
  Users, 
  ListChecks,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trophy,
  MapPin,
  UserCircle
} from 'lucide-react';

const Dashboard = ({ 
  branches = [], 
  tasks = [], 
  users = [], 
  currentUser,
  onAddBranch,
  onSelectBranch 
}) => {
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: '',
    description: '',
    location: '',
    manager_id: ''
  });

  // Calculate overall statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const overallCompletionRate = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;

  // Calculate branch statistics
  const branchStats = branches.map(branch => {
    const branchTasks = tasks.filter(t => t.branch_id === branch.id);
    const branchCompleted = branchTasks.filter(t => t.status === 'completed').length;
    const branchTotal = branchTasks.length;
    const completionRate = branchTotal > 0 
      ? Math.round((branchCompleted / branchTotal) * 100) 
      : 0;

    return {
      ...branch,
      totalTasks: branchTotal,
      completedTasks: branchCompleted,
      completionRate
    };
  }).sort((a, b) => b.completionRate - a.completionRate);

  // Calculate staff statistics
  const staffStats = users.map(user => {
    const userTasks = tasks.filter(t => t.assigned_to === user.id);
    const userCompleted = userTasks.filter(t => t.status === 'completed').length;
    const userTotal = userTasks.length;
    const completionRate = userTotal > 0 
      ? Math.round((userCompleted / userTotal) * 100) 
      : 0;

    return {
      id: user.id,
      name: user.full_name || 'Unknown User',
      totalTasks: userTotal,
      completed: userCompleted,
      inProgress: userTasks.filter(t => t.status === 'in-progress').length,
      completionRate
    };
  }).sort((a, b) => b.completionRate - a.completionRate);

  const handleAddBranch = async () => {
    if (!newBranch.name.trim()) {
      alert('Branch name is required');
      return;
    }

    await onAddBranch(newBranch);
    setNewBranch({ name: '', description: '', location: '', manager_id: '' });
    setShowBranchModal(false);
  };

  const StatCard = ({ icon: Icon, label, value, color, subtitle, trend }) => (
    <div className="stat-card">
      <div className="stat-card-content">
        <div className="stat-card-header">
          <div className={`stat-icon ${color.replace('text', 'bg').replace('600', '100')}`}>
            <Icon className={`icon-size ${color}`} />
          </div>
        </div>
        <div className="stat-info">
          <p className="stat-label">{label}</p>
          <p className={`stat-value ${color}`}>{value}</p>
          {subtitle && <p className="stat-subtitle">{subtitle}</p>}
        </div>
      </div>
      {trend && (
        <div className="stat-trend">
          <TrendingUp className="trend-icon" />
          <span className="trend-value">{trend}</span>
          <span className="trend-text">vs last month</span>
        </div>
      )}
    </div>
  );

  const StaffCard = ({ staff, rank }) => (
    <div className="staff-card">
      <div className="staff-header">
        {rank <= 3 && (
          <div className={`
            rank-badge
            ${rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : 'rank-bronze'}
          `}>
            {rank}
          </div>
        )}
        <div className="staff-name-section">
          <div className="staff-name-row">
            <span className="staff-name">{staff.name}</span>
            <span className={`
              completion-badge
              ${staff.completionRate >= 80 ? 'badge-green' :
                staff.completionRate >= 50 ? 'badge-yellow' :
                'badge-red'}
            `}>
              {staff.completionRate}%
            </span>
          </div>
        </div>
      </div>
      <div className="staff-stats">
        <span className="staff-stat">
          <ListChecks className="stat-icon-sm" />
          {staff.totalTasks} tasks
        </span>
        <span className="staff-stat">
          <CheckCircle2 className="stat-icon-sm text-green-600" />
          {staff.completed} done
        </span>
        <span className="staff-stat">
          <Clock className="stat-icon-sm text-blue-600" />
          {staff.inProgress} active
        </span>
      </div>
      <div className="progress-bar-container">
        <div 
          className={`progress-bar ${
            staff.completionRate >= 80 ? 'progress-green' :
            staff.completionRate >= 50 ? 'progress-yellow' :
            'progress-red'
          }`}
          style={{ width: `${staff.completionRate}%` }}
        />
      </div>
    </div>
  );

  const BranchCard = ({ branch, rank }) => (
    <div 
      className="branch-card"
      onClick={() => onSelectBranch(branch)}
    >
      <div className="branch-header">
        <div className="branch-title">
          {rank <= 3 && (
            <Trophy className={`trophy-icon ${
              rank === 1 ? 'text-yellow-500' : 
              rank === 2 ? 'text-gray-400' : 
              'text-orange-600'
            }`} />
          )}
          <div>
            <h3 className="branch-name">{branch.name}</h3>
            {branch.location && (
              <p className="branch-location">
                <MapPin className="location-icon" />
                {branch.location}
              </p>
            )}
          </div>
        </div>
        <span className={`
          branch-completion
          ${branch.completionRate >= 80 ? 'badge-green' :
            branch.completionRate >= 50 ? 'badge-yellow' :
            'badge-red'}
        `}>
          {branch.completionRate}%
        </span>
      </div>
      <div className="branch-stats">
        <span>{branch.totalTasks} tasks</span>
        <span className="text-green-600">{branch.completedTasks} completed</span>
      </div>
      <div className="progress-bar-container">
        <div 
          className={`progress-bar progress-thick ${
            branch.completionRate >= 80 ? 'progress-green' :
            branch.completionRate >= 50 ? 'progress-yellow' :
            'progress-red'
          }`}
          style={{ width: `${branch.completionRate}%` }}
        />
      </div>
    </div>
  );

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="dashboard-container">
      <style>{`
        .dashboard-container {
          flex: 1;
          overflow-y: auto;
          background: #f9fafb;
        }

        /* Header Styles */
        .dashboard-header {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 1rem;
        }

        @media (min-width: 768px) {
          .dashboard-header {
            padding: 1.5rem 2rem;
          }
        }

        .header-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .header-content {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .header-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: #111827;
        }

        @media (min-width: 768px) {
          .header-title {
            font-size: 1.875rem;
          }
        }

        .header-subtitle {
          color: #6b7280;
          margin-top: 0.25rem;
          font-size: 0.875rem;
        }

        @media (min-width: 768px) {
          .header-subtitle {
            font-size: 1rem;
          }
        }

        .add-branch-btn {
          background: #2563eb;
          color: white;
          padding: 0.625rem 1rem;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: background-color 0.2s;
          border: none;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          width: 100%;
          justify-content: center;
        }

        @media (min-width: 768px) {
          .add-branch-btn {
            width: auto;
            padding: 0.75rem 1.5rem;
          }
        }

        .add-branch-btn:hover {
          background: #1d4ed8;
        }

        /* Main Content */
        .dashboard-content {
          padding: 1rem;
        }

        @media (min-width: 768px) {
          .dashboard-content {
            padding: 2rem;
          }
        }

        .section {
          margin-bottom: 2rem;
        }

        @media (min-width: 768px) {
          .section {
            margin-bottom: 2.5rem;
          }
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: bold;
          color: #111827;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        @media (min-width: 768px) {
          .section-title {
            font-size: 1.25rem;
            margin-bottom: 1.5rem;
          }
        }

        /* Stat Cards - SINGLE ROW */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        @media (min-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
          }
        }

        @media (min-width: 1024px) {
          .stats-grid {
            gap: 1.5rem;
          }
        }

        .stat-card {
          background: white;
          padding: 1rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          transition: box-shadow 0.2s;
        }

        @media (min-width: 768px) {
          .stat-card {
            padding: 1.25rem;
          }
        }

        .stat-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .stat-card-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        @media (min-width: 768px) {
          .stat-card-content {
            gap: 1rem;
          }
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon {
          padding: 0.5rem;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (min-width: 768px) {
          .stat-icon {
            padding: 0.75rem;
          }
        }

        .icon-size {
          width: 1.25rem;
          height: 1.25rem;
        }

        @media (min-width: 768px) {
          .icon-size {
            width: 1.5rem;
            height: 1.5rem;
          }
        }

        .stat-info {
          text-align: center;
        }

        .stat-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        @media (min-width: 768px) {
          .stat-label {
            font-size: 0.875rem;
          }
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: bold;
        }

        @media (min-width: 768px) {
          .stat-value {
            font-size: 1.875rem;
          }
        }

        .stat-subtitle {
          font-size: 0.625rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        @media (min-width: 768px) {
          .stat-subtitle {
            font-size: 0.75rem;
          }
        }

        .stat-trend {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.625rem;
          margin-top: 0.5rem;
        }

        @media (min-width: 768px) {
          .stat-trend {
            font-size: 0.75rem;
          }
        }

        .trend-icon {
          width: 0.75rem;
          height: 0.75rem;
          color: #16a34a;
        }

        .trend-value {
          color: #16a34a;
          font-weight: 500;
        }

        .trend-text {
          color: #6b7280;
        }

        /* Progress Section */
        .progress-section {
          background: linear-gradient(to bottom right, #eff6ff, #eef2ff);
          padding: 1rem;
          border-radius: 0.75rem;
          border: 1px solid #bfdbfe;
        }

        @media (min-width: 768px) {
          .progress-section {
            padding: 1.5rem;
          }
        }

        .progress-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .progress-title {
          font-size: 1rem;
          font-weight: bold;
          color: #111827;
        }

        @media (min-width: 768px) {
          .progress-title {
            font-size: 1.125rem;
          }
        }

        .progress-percentage {
          font-size: 2rem;
          font-weight: bold;
          color: #2563eb;
        }

        @media (min-width: 768px) {
          .progress-percentage {
            font-size: 2.5rem;
          }
        }

        .progress-bar-main {
          width: 100%;
          background: white;
          border-radius: 9999px;
          height: 1rem;
          box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
        }

        .progress-bar-fill {
          background: linear-gradient(to right, #3b82f6, #6366f1);
          height: 1rem;
          border-radius: 9999px;
          transition: width 0.5s;
        }

        .progress-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-top: 1rem;
          font-size: 0.875rem;
        }

        .progress-stat {
          text-align: center;
        }

        .progress-stat-label {
          color: #6b7280;
        }

        .progress-stat-value {
          font-size: 1.25rem;
          font-weight: bold;
          margin-top: 0.25rem;
        }

        /* Staff Cards */
        .staff-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        @media (min-width: 640px) {
          .staff-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .staff-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .staff-card {
          background: white;
          padding: 1rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          transition: box-shadow 0.2s;
        }

        .staff-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .staff-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .rank-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border-radius: 9999px;
          font-weight: bold;
          color: white;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .rank-gold { background: #eab308; }
        .rank-silver { background: #9ca3af; }
        .rank-bronze { background: #ea580c; }

        .staff-name-section {
          flex: 1;
          min-width: 0;
        }

        .staff-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .staff-name {
          font-weight: 600;
          color: #111827;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .completion-badge {
          font-size: 0.75rem;
          font-weight: bold;
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
          flex-shrink: 0;
        }

        .badge-green { background: #dcfce7; color: #15803d; }
        .badge-yellow { background: #fef3c7; color: #a16207; }
        .badge-red { background: #fee2e2; color: #b91c1c; }

        .staff-stats {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
        }

        @media (min-width: 768px) {
          .staff-stats {
            gap: 1rem;
          }
        }

        .staff-stat {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .stat-icon-sm {
          width: 0.875rem;
          height: 0.875rem;
        }

        .progress-bar-container {
          width: 100%;
          background: #e5e7eb;
          border-radius: 9999px;
          height: 0.5rem;
        }

        .progress-bar {
          height: 0.5rem;
          border-radius: 9999px;
          transition: width 0.3s;
        }

        .progress-thick {
          height: 0.625rem;
        }

        .progress-green { background: #22c55e; }
        .progress-yellow { background: #eab308; }
        .progress-red { background: #ef4444; }

        /* Branch Cards */
        .branch-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        @media (min-width: 640px) {
          .branch-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .branch-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .branch-card {
          background: white;
          padding: 1rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          transition: box-shadow 0.2s;
          cursor: pointer;
        }

        .branch-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .branch-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .branch-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
          flex: 1;
        }

        .trophy-icon {
          width: 1.25rem;
          height: 1.25rem;
          flex-shrink: 0;
        }

        .branch-name {
          font-weight: 600;
          color: #111827;
          font-size: 0.875rem;
        }

        @media (min-width: 768px) {
          .branch-name {
            font-size: 1rem;
          }
        }

        .branch-location {
          font-size: 0.75rem;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-top: 0.25rem;
        }

        .location-icon {
          width: 0.75rem;
          height: 0.75rem;
        }

        .branch-completion {
          font-size: 1rem;
          font-weight: bold;
          padding: 0.25rem 0.75rem;
          border-radius: 0.5rem;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .branch-completion {
            font-size: 1.125rem;
          }
        }

        .branch-stats {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        /* Empty State */
        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem 1rem;
          background: white;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }

        .empty-icon {
          width: 3rem;
          height: 3rem;
          color: #d1d5db;
          margin: 0 auto 0.75rem;
        }

        .empty-text {
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .empty-btn {
          background: #2563eb;
          color: white;
          padding: 0.5rem 1.5rem;
          border-radius: 0.5rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .empty-btn:hover {
          background: #1d4ed8;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          max-width: 28rem;
          width: 100%;
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: #111827;
        }

        .modal-subtitle {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
        }

        .form-textarea {
          resize: vertical;
        }

        .modal-footer {
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .btn {
          padding: 0.5rem 1.5rem;
          border-radius: 0.5rem;
          transition: all 0.2s;
          cursor: pointer;
          border: none;
          font-weight: 500;
        }

        .btn-cancel {
          padding: 0.5rem 1.5rem;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
        }

        .btn-cancel:hover {
          background: #f9fafb;
        }

        .btn-primary {
          background: #2563eb;
          color: white;
        }

        .btn-primary:hover {
          background: #1d4ed8;
        }
      `}</style>

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1 className="header-title">Dashboard</h1>
            <p className="header-subtitle">Overview of all branches and performance</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowBranchModal(true)}
              className="add-branch-btn"
            >
              <Plus className="w-5 h-5" />
              Add Branch
            </button>
          )}
        </div>
      </div>

      <div className="dashboard-content">
        {/* Overview Statistics - SINGLE ROW */}
        <section className="section">
          <h2 className="section-title">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Overview
          </h2>
          <div className="stats-grid">
            <StatCard
              icon={Building2}
              label="Branches"
              value={branches.length}
              color="text-purple-600"
            />
            <StatCard
              icon={ListChecks}
              label="Total Tasks"
              value={totalTasks}
              color="text-gray-600"
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={completedTasks}
              color="text-green-600"
              subtitle={`${overallCompletionRate}%`}
            />
            <StatCard
              icon={Clock}
              label="In Progress"
              value={inProgressTasks}
              color="text-blue-600"
            />
          </div>
        </section>

        {/* Overall Progress */}
        <section className="section progress-section">
          <div className="progress-header">
            <h3 className="progress-title">Overall Company Progress</h3>
            <span className="progress-percentage">{overallCompletionRate}%</span>
          </div>
          <div className="progress-bar-main">
            <div 
              className="progress-bar-fill"
              style={{ width: `${overallCompletionRate}%` }}
            />
          </div>
          <div className="progress-stats-grid">
            <div className="progress-stat">
              <p className="progress-stat-label">To Do</p>
              <p className="progress-stat-value text-orange-600">{todoTasks}</p>
            </div>
            <div className="progress-stat">
              <p className="progress-stat-label">In Progress</p>
              <p className="progress-stat-value text-blue-600">{inProgressTasks}</p>
            </div>
            <div className="progress-stat">
              <p className="progress-stat-label">Completed</p>
              <p className="progress-stat-value text-green-600">{completedTasks}</p>
            </div>
          </div>
        </section>

        {/* Staff Performance */}
        <section className="section">
          <h2 className="section-title">
            <Users className="w-5 h-5 text-blue-600" />
            Staff Performance
          </h2>
          <div className="staff-grid">
            {staffStats.length > 0 ? (
              staffStats.slice(0, 6).map((staff, index) => (
                <StaffCard key={staff.id} staff={staff} rank={index + 1} />
              ))
            ) : (
              <div className="empty-state">
                <Users className="empty-icon" />
                <p className="empty-text">No staff assigned yet</p>
              </div>
            )}
          </div>
        </section>

        {/* Productive Branches */}
        <section className="section">
          <h2 className="section-title">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Most Productive Branches
          </h2>
          <div className="branch-grid">
            {branchStats.length > 0 ? (
              branchStats.map((branch, index) => (
                <BranchCard key={branch.id} branch={branch} rank={index + 1} />
              ))
            ) : (
              <div className="empty-state">
                <Building2 className="empty-icon" />
                <p className="empty-text">No branches yet</p>
                {isAdmin && (
                  <button
                    onClick={() => setShowBranchModal(true)}
                    className="empty-btn"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Branch
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Add Branch Modal */}
      {showBranchModal && (
        <div className="modal-overlay" onClick={() => setShowBranchModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Branch</h2>
              <p className="modal-subtitle">Create a new company branch</p>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Branch Name *</label>
                <input
                  type="text"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="form-input"
                  placeholder="e.g., Manila Branch"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  value={newBranch.location}
                  onChange={(e) => setNewBranch({ ...newBranch, location: e.target.value })}
                  className="form-input"
                  placeholder="e.g., Manila, Philippines"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  value={newBranch.description}
                  onChange={(e) => setNewBranch({ ...newBranch, description: e.target.value })}
                  className="form-textarea"
                  rows="3"
                  placeholder="Branch description..."
                />
              </div>
              
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowBranchModal(false)}
                className="btn btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBranch}
                className="btn btn-primary"
              >
                Add Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;