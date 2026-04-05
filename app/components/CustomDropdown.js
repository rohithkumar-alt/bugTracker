"use client";
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomDropdown = ({ 
  label, 
  options = [], 
  selected, 
  onSelect, 
  isMulti = false,
  fullWidth = false,
  placeholder = "Select...",
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSelected = (opt) => {
    if (isMulti) return Array.isArray(selected) && selected.includes(opt);
    return selected === opt;
  };

  const handleSelect = (opt) => {
    onSelect(opt);
    if (!isMulti) setIsOpen(false);
  };

  const getTriggerLabel = () => {
    if (isMulti) {
      if (!Array.isArray(selected) || selected.length === 0) return label || placeholder;
      if (selected.length === 1) return selected[0];
      return `${label || 'Selected'} (${selected.length})`;
    }
    return selected || placeholder;
  };

  return (
    <div 
      className={`custom-dropdown-container ${fullWidth ? 'full-width' : ''}`} 
      ref={dropdownRef}
      style={{ ...style, zIndex: isOpen ? 1100 : 1 }}
    >
      <div
        className={`custom-dropdown-trigger ${isOpen ? 'open' : ''} ${isSelected(selected) ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: 'white',
          border: `1.5px solid ${isOpen ? '#3b82f6' : '#e2e8f0'}`,
          borderRadius: '10px',
          cursor: 'pointer',
          minWidth: fullWidth ? '100%' : '160px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isOpen ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : 'none'
        }}
      >
        <span style={{ 
          fontSize: '0.85rem', 
          fontWeight: '600', 
          color: selected ? '#1e293b' : '#94a3b8',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {getTriggerLabel()}
        </span>
        <ChevronDown 
          size={14} 
          style={{ 
            transition: 'transform 0.3s ease', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: isOpen ? '#3b82f6' : '#94a3b8' 
          }} 
        />
      </div>

      {isOpen && (
        <div 
          className="custom-dropdown-menu visible"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '100%',
            minWidth: '100%',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 30px -4px rgba(0,0,0,0.12), 0 4px 8px -2px rgba(0,0,0,0.06)',
            padding: '6px',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto',
            animation: 'dropdownFadeIn 0.2s ease-out'
          }}
        >
          {/* "Clear All" or "Show All" option for multi-select */}
          {isMulti && (
            <div
              className={`custom-dropdown-item ${Array.isArray(selected) && selected.length === 0 ? 'selected' : ''}`}
              onClick={() => handleSelect('CLEAR_ALL')}
              style={itemStyle(Array.isArray(selected) && selected.length === 0)}
            >
              <span>{label || 'All'}</span>
              {(Array.isArray(selected) && selected.length === 0) && <Check size={14} color="#3b82f6" strokeWidth={3} />}
            </div>
          )}

          {options?.map(opt => {
            const isSubItem = opt.startsWith(' -') || opt.startsWith(' •');
            const displayText = isSubItem ? opt.substring(2) : opt;
            
            return (
              <div
                key={opt}
                className={`custom-dropdown-item ${isSelected(opt) ? 'selected' : ''}`}
                onClick={() => handleSelect(opt)}
                style={itemStyle(isSelected(opt), isSubItem)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                  {isMulti && (
                    <div style={{ 
                      width: '16px', height: '16px', borderRadius: '4px', 
                      border: `1.5px solid ${isSelected(opt) ? '#3b82f6' : '#cbd5e1'}`,
                      backgroundColor: isSelected(opt) ? '#3b82f6' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}>
                      {isSelected(opt) && <Check size={12} color="white" strokeWidth={3} />}
                    </div>
                  )}
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayText}</span>
                </div>
                {!isMulti && isSelected(opt) && <Check size={14} color="#3b82f6" strokeWidth={3} />}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .custom-dropdown-container {
          position: relative;
          display: inline-block;
        }
        .custom-dropdown-container.full-width {
          display: block;
          width: 100%;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        ::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

const itemStyle = (isSelected, isSubItem = false) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  paddingLeft: isSubItem ? '32px' : '12px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: isSubItem ? '0.8rem' : '0.85rem',
  fontWeight: isSelected ? '700' : (isSubItem ? '500' : '600'),
  color: isSelected ? '#3b82f6' : (isSubItem ? '#64748b' : '#475569'),
  backgroundColor: isSelected ? '#eff6ff' : 'transparent',
  opacity: isSubItem && !isSelected ? 0.85 : 1,
  transition: 'all 0.2s ease',
  marginBottom: '2px',
  '&:hover': {
    backgroundColor: '#f8fafc',
    color: '#3b82f6'
  }
});

export default CustomDropdown;
