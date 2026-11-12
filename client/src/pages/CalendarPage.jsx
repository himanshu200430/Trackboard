import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const CalendarPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/tasks', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks || []);
        }
      } catch (err) {
        toast.error('Failed to load calendar events.');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const resetToToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calendar math
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];

  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      month: month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      month,
      year,
      isCurrentMonth: true,
    });
  }

  // Next month padding to fill 35 or 42 cells
  const remainingCells = 35 - calendarDays.length > 0 ? 35 - calendarDays.length : (42 - calendarDays.length);
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({
      day: i,
      month: month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false,
    });
  }

  const today = new Date();
  const isToday = (d, m, y) =>
    d === today.getDate() && m === today.getMonth() && y === today.getFullYear();

  // Map tasks to dates
  const getTasksForDate = (d, m, y) => {
    return tasks.filter((t) => {
      if (!t.due_date) return false;
      const tDate = new Date(t.due_date);
      return (
        tDate.getDate() === d &&
        tDate.getMonth() === m &&
        tDate.getFullYear() === y
      );
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar onOpenCreateBoard={() => navigate('/')} />

        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 className="font-display" style={{ fontSize: '26px', fontWeight: 600 }}>
                Deliverables Calendar
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                Card due dates, launch milestones, and scheduled work items
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={resetToToday}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                Today
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-surface-elevated)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
                <button
                  onClick={prevMonth}
                  className="btn-ghost"
                  style={{ padding: '6px' }}
                  title="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 8px', minWidth: '130px', textAlign: 'center' }}>
                  {monthNames[month]} {year}
                </span>
                <button
                  onClick={nextMonth}
                  className="btn-ghost"
                  style={{ padding: '6px' }}
                  title="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid Container */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: 'var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-subtle)',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Days of week header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                borderBottom: 'var(--border-hairline)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  style={{
                    padding: '10px 8px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--ink-secondary)',
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day Cells Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gridAutoRows: 'minmax(110px, 1fr)',
                flex: 1,
              }}
            >
              {calendarDays.map((cell, idx) => {
                const dayTasks = getTasksForDate(cell.day, cell.month, cell.year);
                const currentDay = isToday(cell.day, cell.month, cell.year);

                return (
                  <div
                    key={idx}
                    style={{
                      borderRight: (idx + 1) % 7 === 0 ? 'none' : 'var(--border-hairline)',
                      borderBottom: 'var(--border-hairline)',
                      padding: '8px',
                      backgroundColor: cell.isCurrentMonth
                        ? currentDay
                          ? 'rgba(200, 90, 50, 0.04)'
                          : 'var(--bg-surface-elevated)'
                        : 'var(--bg-canvas)',
                      opacity: cell.isCurrentMonth ? 1 : 0.45,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      overflowY: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: currentDay ? 700 : 500,
                          width: '22px',
                          height: '22px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          backgroundColor: currentDay ? 'var(--accent-burnt)' : 'transparent',
                          color: currentDay ? '#FFF' : 'var(--ink-primary)',
                        }}
                      >
                        {cell.day}
                      </span>
                      {dayTasks.length > 0 && (
                        <span style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>
                          {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                        </span>
                      )}
                    </div>

                    {/* Task Chips */}
                    {dayTasks.map((task) => {
                      const isDone = /done|shipped|closed/i.test(task.list_title);
                      return (
                        <div
                          key={task.id}
                          onClick={() => navigate(`/b/${task.board_id}/c/${task.id}`)}
                          style={{
                            padding: '3px 6px',
                            backgroundColor: 'var(--bg-surface)',
                            border: `1px solid ${task.board_color || 'var(--border-hairline)'}`,
                            borderLeft: `3px solid ${task.board_color || 'var(--accent-burnt)'}`,
                            borderRadius: 'var(--radius-xs)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: 'var(--ink-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}
                          title={`${task.title} (${task.board_title} - ${task.list_title})`}
                        >
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {task.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CalendarPage;

