import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Folder, FileText, Image, Code, Download, ExternalLink, Search } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const FilesPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const toast = useToast();

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch('/api/files', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setFiles(data.files || []);
        }
      } catch (err) {
        toast.error('Failed to load files repository.');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const filteredFiles = files.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.board_title.toLowerCase().includes(q);
  });

  const getFileIcon = (type) => {
    switch (type) {
      case 'image':
        return <Image size={18} color="#2D5A4C" />;
      case 'code':
        return <Code size={18} color="#C85A32" />;
      case 'pdf':
        return <FileText size={18} color="#B2433D" />;
      default:
        return <FileText size={18} color="#3F627D" />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar onOpenCreateBoard={() => {}} />

        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', maxWidth: '1100px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 className="font-display" style={{ fontSize: '26px', fontWeight: 600 }}>
                Files & Project Assets
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                All document attachments, design specs, and code snippets uploaded across boards
              </p>
            </div>

            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} color="var(--ink-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
                style={{ paddingLeft: '30px', fontSize: '12px', height: '32px' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-muted)' }}>
              Loading project documents...
            </div>
          ) : filteredFiles.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  style={{
                    padding: '14px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: 'var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '130px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: 'var(--bg-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {getFileIcon(file.file_type)}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                        {file.size}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-primary)', wordBreak: 'break-word', lineHeight: '1.3' }}>
                      {file.name}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                      in <strong>{file.board_title}</strong> • {file.uploader_name}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--bg-muted)' }}>
                    <button
                      onClick={() => toast.info(`Viewing ${file.name}`)}
                      className="btn btn-secondary"
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                    >
                      <ExternalLink size={12} />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: 'var(--border-hairline)' }}>
              <Folder size={32} color="var(--ink-muted)" style={{ opacity: 0.5, marginBottom: '8px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>No files found</h3>
              <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                Files and documentation uploaded to cards will appear here.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default FilesPage;

